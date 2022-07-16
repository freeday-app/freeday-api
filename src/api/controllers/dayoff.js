const Validator = require('../../services/validator.js');
const Schemas = require('./schemas/index.js');
const Models = require('../models/index.js');
const Notify = require('../../bot/utils/notify.js');
const DayoffService = require('../../services/dayoff.js');
const { env } = require('../../services/env.js');
const Log = require('../../services/log.js');
const StatsLog = require('../../services/statsLog.js');
const {
    NotFoundError,
    ValidationError,
    ForbiddenError,
    NotifyUserError,
    NotifyReferrerError
} = require('../../services/errors.js');
const ConfigurationController = require('./configuration.js');

const Dayoff = {

    types: ['dayoff', 'sick'],
    periods: ['am', 'pm'],

    async list(req, res) {
        try {
            await Validator.checkSchema(req, Schemas.dayoff.list);
            const result = await Dayoff.listProxy(req.query);
            res.status(200).json(result);
        } catch (err) {
            res.error(err);
        }
    },

    async listProxy(query) {
        const find = Dayoff.getListFindObject(query);
        const sort = Dayoff.getListSortObject(query);
        const result = await Models.Dayoff.paginateToResult(
            'daysoff',
            query.page,
            query.limit,
            find,
            sort
        );
        return result;
    },

    getListFindObject(filter) {
        const find = {};
        Object.keys(filter).forEach((key) => {
            const val = filter[key];
            switch (key) {
                case 'start':
                    find.$or = [
                        { end: { $gte: val } },
                        {
                            $and: [
                                { end: { $eq: null } },
                                { start: { $gte: val } }
                            ]
                        }
                    ];
                    break;
                case 'end':
                    find.start = { $lte: val };
                    break;
                case 'type':
                    find['type._id'] = {
                        $in: Array.isArray(val) ? val : [val]
                    };
                    break;
                case 'slackUser':
                    find['slackUser.slackId'] = {
                        $in: Array.isArray(val) ? val : [val]
                    };
                    break;
                case 'status':
                    if (filter.status === 'confirmed') {
                        find.confirmed = true;
                    }
                    if (filter.status === 'canceled') {
                        find.canceled = true;
                    }
                    if (filter.status === 'pending') {
                        find.confirmed = false;
                        find.canceled = false;
                    }
                    break;
                default:
            }
        });
        return find;
    },

    getListSortObject(filter) {
        const order = ['asc', 'desc'].includes(filter.order) ? filter.order : 'asc';
        return {
            'slackUser.name': 'asc',
            'slackUser.slackId': 'asc',
            start: order,
            startPeriod: order,
            _id: 'asc'
        };
    },

    async get(req, res) {
        try {
            await Validator.checkSchema(req, Schemas.dayoff.get);
            const dayoff = await Dayoff.getProxy(req.params.id);
            res.status(200).json(dayoff);
        } catch (err) {
            res.error(err);
        }
    },

    async getProxy(id) {
        const dayoff = await Models.Dayoff.findById(id).exec();
        if (dayoff) {
            return dayoff.toJSON();
        }
        throw new NotFoundError('Dayoff not found');
    },

    async conflicts(req, res) {
        try {
            await Validator.checkSchema(req, Schemas.dayoff.get);
            const dayoff = await Dayoff.getProxy(req.params.id);
            const conflicts = await DayoffService.getConflicts(dayoff);
            res.status(200).json({ conflicts });
        } catch (err) {
            res.error(err);
        }
    },

    async create(req, res) {
        try {
            await Validator.checkSchema(req, Schemas.dayoff.create);
            const dayoff = await Dayoff.createProxy(req.body);
            StatsLog.logClientCreateDayOff(req.auth.userId, req.body.slackUserId);
            res.status(200).json(dayoff);
        } catch (err) {
            if (err instanceof NotifyReferrerError) {
                res.status(206).json({
                    ...err.data,
                    code: 2060
                });
            } else if (err instanceof NotifyUserError) {
                res.status(206).json({
                    ...err.data,
                    code: 2061
                });
            } else {
                res.error(err);
            }
        }
    },

    async createProxy(data) {
        const isForced = !!data.force;
        // contrôle type d'absence
        const dayoffType = await DayoffService.controlType(data.type);
        // contrôle user slack
        const slackUser = await Models.SlackUser.findOne({
            slackId: data.slackUserId
        }).exec();
        if (!slackUser) {
            throw new ValidationError(`Wrong Slack user ID ${data.slackUserId}`);
        }
        // contrôle demi-journées
        ['start', 'end'].forEach((p) => {
            const period = `${p}Period`;
            if (data[period] && !Dayoff.periods.includes(data[period])) {
                throw new ValidationError(`Wrong ${p} period ${data[period]}`);
            }
        });
        // données de configuration necessaires à l'ajout d'absence
        const { slackReferrer, workDays } = await ConfigurationController.getProxy();
        // process données absence
        const dayoffData = DayoffService.process({
            ...data,
            type: dayoffType,
            slackUser
        }, workDays);
        // contrôle conflits absence
        if (!isForced) {
            await DayoffService.getConflicts(dayoffData, true);
        }
        // insère données absence en base
        const newDayoff = new (Models.Dayoff)(dayoffData);
        await newDayoff.save();
        const dayoff = await Models.Dayoff.findById(newDayoff._id).exec();
        if (dayoff) {
            if (env.SLACK_ENABLED) {
                const errorQueue = [];
                try {
                    // notifie l'utilisateur que son absence a été créée
                    await Notify.confirmCreate(dayoff.slackUser.slackId, dayoff);
                } catch (err) {
                    errorQueue.push(new NotifyUserError('Could not send a notification to the Slack user', dayoff.toJSON()));
                }
                try {
                    // avertit le référent Slack qu'une absence a été ajouté
                    if (slackReferrer) {
                        await Notify.referrerCreate(slackReferrer, dayoff);
                    }
                } catch (err) {
                    errorQueue.push(new NotifyReferrerError('Could not send a notification to the Slack referrer', dayoff.toJSON()));
                }
                if (errorQueue.length > 0) {
                    throw errorQueue.shift();
                }
            }
            //
            Log.info(`Dayoff ${dayoff.id} created`);
            return dayoff.toJSON();
        }
        throw new NotFoundError('Dayoff not found');
    },

    async update(req, res) {
        try {
            await Validator.checkSchema(req, Schemas.dayoff.update);
            const dayoff = await Dayoff.updateProxy(req.params.id, req.body);
            StatsLog.logClientEditDayOff(req.auth.userId, dayoff.slackUser.slackId);
            res.status(200).json(dayoff);
        } catch (err) {
            if (err instanceof NotifyReferrerError) {
                res.status(206).json({
                    ...err.data,
                    code: 2060
                });
            } else if (err instanceof NotifyUserError) {
                res.status(206).json({
                    ...err.data,
                    code: 2061
                });
            } else {
                res.error(err);
            }
        }
    },

    async updateProxy(id, data) {
        const isForced = !!data.force;
        // contrôle existance absence
        const resultGet = await Models.Dayoff.findById(id).exec();
        if (!resultGet) {
            throw new NotFoundError('Dayoff not found');
        }
        // contrôle type d'absence
        if (data.type) {
            const dayoffType = await DayoffService.controlType(data.type);
            data.type = dayoffType;
        }
        // données de configuration necessaires à la mise à jour d'absence
        const { slackReferrer, workDays } = await ConfigurationController.getProxy();
        // process données absence
        const dayoffData = await DayoffService.process({
            ...resultGet._doc, // eslint-disable-line no-underscore-dangle
            ...data
        }, workDays, false);
        // réinitialise statut absence après modification
        dayoffData.canceled = false;
        dayoffData.confirmed = false;
        // contrôle champs date
        ['start', 'end'].forEach((p) => {
            const period = `${p}Period`;
            if (dayoffData[period] && !Dayoff.periods.includes(dayoffData[period])) {
                throw new ValidationError(`Wrong ${p} period '${dayoffData[period]}'`);
            }
        });
        // contrôle conflits absence
        if (!isForced) {
            await DayoffService.getConflicts({
                id,
                ...dayoffData
            }, true);
        }
        // update données absence en base de données
        const resultSet = await Models.Dayoff.findOneAndUpdate({
            _id: id
        }, dayoffData, {
            new: true,
            runValidators: true
        }).exec();
        if (env.SLACK_ENABLED) {
            const errorQueue = [];
            try {
                // notifie l'utilisateur que son absence a été modifiée
                await Notify.confirmEdit(resultSet.slackUser.slackId, resultSet);
            } catch (err) {
                errorQueue.push(new NotifyUserError('Could not send a notification to the Slack user', resultSet.toJSON()));
            }
            try {
                // avertit le référent Slack qu'une absence a été ajoutée
                if (slackReferrer) {
                    await Notify.referrerEdit(slackReferrer, resultSet);
                }
            } catch (err) {
                errorQueue.push(new NotifyReferrerError('Could not send a notification to the Slack referrer', resultSet.toJSON()));
            }
            if (errorQueue.length > 0) {
                throw errorQueue.shift();
            }
        }
        //
        Log.info(`Dayoff ${resultSet.id} edited`);
        return resultSet.toJSON();
    },

    async delete(req, res) {
        try {
            if (env.ENVIRONMENT === 'test') {
                await Validator.checkSchema(req, Schemas.dayoff.get);
                const dayoff = await Models.Dayoff.findOneAndDelete({
                    _id: req.params.id
                }).exec();
                if (dayoff !== null) {
                    if (env.SLACK_ENABLED) {
                        // notifie l'utilisateur que son absence a été modifiée
                        await Notify.confirmDelete(dayoff.slackUser.slackId, dayoff);
                        // avertit le référent Slack qu'une absence a été supprimée
                        const {
                            slackReferrer
                        } = await ConfigurationController.getProxy();
                        if (slackReferrer) {
                            await Notify.referrerDelete(slackReferrer, dayoff);
                        }
                    }
                    //
                    Log.info(`Dayoff ${dayoff.id} deleted`);
                    res.status(200).json({});
                } else {
                    throw new NotFoundError('Dayoff not found');
                }
            } else {
                throw new ForbiddenError('This route is only available in test mode');
            }
        } catch (err) {
            res.error(err);
        }
    },

    async confirm(req, res) { Dayoff.action(req, res, 'confirm'); },
    async cancel(req, res) { Dayoff.action(req, res, 'cancel'); },
    async reset(req, res) { Dayoff.action(req, res, 'reset'); },
    async action(req, res, action) {
        try {
            await Validator.checkSchema(req, Schemas.dayoff[action]);
            const dayoff = await Dayoff.actionProxy({
                action,
                id: req.params.id,
                cancelReason: req.body.cancelReason,
                force: req.body.force
            });
            StatsLog.logClientActionDayOff(
                action,
                req.auth.userId,
                dayoff.slackUser.slackId
            );
            res.status(200).json(dayoff.toJSON());
        } catch (err) {
            if (err instanceof NotifyReferrerError) {
                res.status(206).json({
                    ...err.data,
                    code: 2060
                });
            } else if (err instanceof NotifyUserError) {
                res.status(206).json({
                    ...err.data,
                    code: 2061
                });
            } else {
                res.error(err);
            }
        }
    },

    async actionProxy(opts) {
        // options
        const options = {
            id: null,
            action: null,
            cancelReason: null,
            cancelNotifyReferrer: false,
            force: false,
            ...opts
        };
        const {
            id,
            action,
            cancelReason,
            cancelNotifyReferrer,
            force
        } = options;
        // gère conflits si besoin
        if (action === 'confirm') {
            const dayoffData = await Dayoff.getProxy(id);
            await Dayoff.handleConfirmConflicts(dayoffData, force);
        }
        // updates dayoff status
        const dayoff = await Models.Dayoff.findByIdAndUpdate(id, {
            confirmed: action === 'confirm',
            canceled: action === 'cancel',
            cancelReason: (action === 'cancel' && cancelReason) ? cancelReason : ''
        }, {
            new: true,
            runValidators: true
        }).exec();
        if (dayoff) {
            // si bot slack actif
            if (env.SLACK_ENABLED) {
                const errorQueue = [];
                try {
                    // notifie utilisateur de l'action sur son absence
                    await Notify.statusChange(dayoff.slackUser.slackId, dayoff);
                } catch (err) {
                    errorQueue.push(new NotifyUserError());
                }
                // avertit le référent Slack si annulation
                const { slackReferrer } = await ConfigurationController.getProxy();
                if (cancelNotifyReferrer && action === 'cancel' && slackReferrer) {
                    try {
                        await Notify.referrerCancel(slackReferrer, dayoff);
                    } catch (err) {
                        errorQueue.push(new NotifyReferrerError());
                    }
                }
                if (errorQueue.length > 0) {
                    throw errorQueue.shift();
                }
            }
            // retour
            let status = 'none';
            if (dayoff.confirmed) { status = 'confirmed'; }
            if (dayoff.canceled) { status = 'canceled'; }
            Log.info(`Dayoff status ${dayoff.id} changed to ${status}`);
            return dayoff;
        }
        throw new NotFoundError('Dayoff not found');
    },

    // gère gestion conflits en cas de confirmation d'absence
    async handleConfirmConflicts(dayoff, force = false) {
        // récupère conflits absence
        const conflicts = await DayoffService.getConflicts(dayoff, !force);
        // si forcé annule les absences en conflit
        if (force) {
            const tasks = [];
            for (const conflictDayoff of conflicts) {
                tasks.push(
                    Dayoff.actionProxy({
                        id: conflictDayoff.id,
                        action: 'cancel'
                    })
                );
            }
            await Promise.all(tasks);
        }
    }

};

module.exports = Dayoff;
