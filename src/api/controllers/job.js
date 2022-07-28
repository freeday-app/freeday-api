const DayJS = require('dayjs');

const Models = require('../models/index.js');
const Tools = require('../../services/tools.js');
const { validator } = require('../../services/validator.js');
const Log = require('../../services/log.js');
const { NotFoundError } = require('../../services/errors.js');

const JobSchemas = require('./schemas/job.json');

const validateUpsert = validator(JobSchemas.upsert);

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
            validateUpsert(req.body);
            const job = await Job.upsertProxy(req.params.name, req.body);
            res.status(200).json(job);
        } catch (err) {
            res.error(err);
        }
    },

    // updates a specific job
    async upsertProxy(jobName, data) {
        if (!jobName || !Object.keys(Job.defaults).includes(jobName)) {
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

    async acquire(jobName, jobHandler) {
        const lastJobEvent = await Models.JobEvent.findOne({
            name: jobName
        }, {}, {
            sort: {
                date: -1
            }
        });
        const lastJobEventJson = lastJobEvent.toJSON();

        const job = await Models.Job.findOne({
            name: jobName
        });
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
                });
            } catch (err) {
                // if any exception is thrown when running the job we log a failed execution
                await Job.createEvent({
                    name: jobName,
                    type: 'failedExecution'
                });
                Log.error(`Unexpected exception when running the job '${jobName}'`);
                Log.error(err.stack);
            }
        }
    },

    // adds a new entry to the JobEvent collection
    async createEvent(data) {
        await new (Models.JobEvent)({
            ...data,
            instance: '',
            date: DayJS()
        }).save();
    }

};

module.exports = Job;
