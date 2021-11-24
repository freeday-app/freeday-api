const DayJS = require('dayjs');
const Mongoose = require('mongoose');

const Models = require('../models/index.js');
const Schemas = require('./schemas/index.js');
const Tools = require('../../services/tools.js');
const Validator = require('../../services/validator.js');
const Log = require('../../services/log.js');
const { NotFoundError } = require('../../services/errors.js');

const Job = {

    defaults: {
        monthlyRecap: {
            name: 'monthlyRecap',
            enabled: false,
            dayOfMonth: '28',
            hour: '8',
            minute: '0'
        }
    },

    async get(req, res) {
        try {
            const job = await Job.getProxy(req.params.name);
            res.status(200).json(job);
        } catch (err) {
            res.error(err);
        }
    },

    // gets a specific job
    // if the job is missing from the db, its default values are inserted and returned
    async getProxy(name) {
        if (!Object.keys(Job.defaults).includes(name)) {
            throw new NotFoundError('This job does not exist');
        }
        let job = await Models.Job.findOne({ name });
        if (!job) {
            job = await Job.upsertProxy(name, Job.defaults[name]);
        } else {
            job = job.toJSON();
        }
        return job;
    },

    async upsert(req, res) {
        try {
            await Validator.checkSchema(req, Schemas.job.upsert);
            const job = await Job.upsertProxy(req.params.name, req.body);
            res.status(200).json(job);
        } catch (err) {
            res.error(err);
        }
    },

    // updates a specific job
    async upsertProxy(jobName, data) {
        if (!Object.keys(Job.defaults).includes(jobName)) {
            throw new NotFoundError('This job does not exist');
        }
        const savedJob = await Models.Job.findOneAndUpdate({
            name: jobName
        }, {
            $set: data
        }, {
            upsert: true,
            new: true,
            runValidators: true
        });
        if (savedJob) {
            await Job.createEvent({
                name: jobName,
                type: 'edit'
            });
        }
        const job = savedJob.toJSON();
        Log.info(`Job updated: ${JSON.stringify(job)}`);
        return job;
    },

    // inserts missing jobs in db
    async createDefault() {
        const defaultJobs = Object.keys(Job.defaults);
        // atomic operations to insert a job if it is not already in collection
        await Models.Job.bulkWrite(defaultJobs.map(
            (jobName) => ({
                updateOne: {
                    filter: {
                        name: jobName
                    },
                    update: {
                        $setOnInsert: Job.defaults[jobName]
                    },
                    upsert: true
                }
            })
        ));

        // atomic operations to insert an initial job event if there is none
        await Models.JobEvent.bulkWrite(defaultJobs.map(
            (jobName) => ({
                updateOne: {
                    filter: {
                        name: jobName
                    },
                    update: {
                        $setOnInsert: {
                            name: jobName,
                            type: 'edit',
                            instance: '',
                            date: DayJS()
                        }
                    },
                    upsert: true
                }
            })
        ));
    },

    // this method will be called in cuncurrency between all Freeday instances
    // it will try to lock a job in MongoDB
    // if sucessful we can check and potentially run the job before releasing it
    // else, we just do nothing as the job is being taken care of by another instance
    async acquire(jobName, jobHandler) {
        const session = await Models.Job.startSession();
        session.startTransaction();
        try {
            // Updates the last jobEvent for this job with a new 'lock' value
            // to lock the document for this transaction.
            // (MongoDB only locks documents when writing, not reading)
            // If the document was already locked by another Freeday instance,
            // MongoDB will throw a WriteConflict exception, so we can then skip that job.
            const lastJobEvent = await Models.JobEvent.findOneAndUpdate({
                name: jobName
            }, {
                $set: {
                    lock: Mongoose.Types.ObjectId()
                }
            }, {
                sort: { date: -1 },
                runValidators: true,
                session
            });
            const lastJobEventJson = lastJobEvent.toJSON();

            const job = await Models.Job.findOne({ name: jobName });
            const jobJson = job.toJSON();

            if (Tools.jobShouldRun(jobJson, lastJobEventJson.date)) {
                // runs the job
                try {
                    Log.info(`Running job '${jobName}'`);
                    await jobHandler();

                    // when the job has completed, we log a sucessful execution
                    await Job.createEvent({
                        name: jobName,
                        type: 'execution'
                    }, session);
                } catch (err) {
                    // if any exception is thrown when running the job
                    // we log a failed execution
                    await Job.createEvent({
                        name: jobName,
                        type: 'failedExecution'
                    }, session);
                    Log.error(`Unexpected exception when running the job '${jobName}'`);
                    Log.error(err.stack);
                }
                await session.commitTransaction();
            } else {
                await session.abortTransaction();
            }
        } catch (err) {
            // MongoDB WriteConflict (112): The job was acquired by another instance
            // we don't need to do anything
            if (!err.code || err.code !== 112) {
                Log.error(`Unexpected exception when checking the job '${jobName}'`);
                Log.error(err.stack);
            }
        } finally {
            session.endSession();
        }
    },

    // adds a new entry to the JobEvent collection
    async createEvent(data, session = null) {
        await new (Models.JobEvent)({
            ...data,
            instance: '',
            date: DayJS()
        }).save({ session });
    }

};

module.exports = Job;
