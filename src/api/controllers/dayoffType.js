const Validator = require('../../services/validator.js');
const Schemas = require('./schemas/index.js');
const Models = require('../models/index.js');
const { env } = require('../../services/env.js');
const Tools = require('../../services/tools.js');
const Log = require('../../services/log.js');
const StatsLog = require('../../services/statsLog.js');
const {
    NotFoundError,
    ConflictError,
    ForbiddenError
} = require('../../services/errors.js');

// endpoints types d'absence
const DayoffType = {

    async list(req, res) {
        try {
            await Validator.checkSchema(req, Schemas.dayoffType.list);
            const result = await DayoffType.listProxy(req.query);
            res.status(200).json(result);
        } catch (err) {
            res.error(err);
        }
    },

    async listProxy(filter) {
        const find = DayoffType.getFindObject(filter);
        const list = await Models.DayoffType.paginateToResult(
            'dayoffTypes',
            filter.page,
            filter.limit,
            find,
            { name: 'asc' }
        );
        return list;
    },

    getFindObject(filter) {
        const find = {};
        Object.keys(filter).forEach((key) => {
            const val = filter[key];
            switch (key) {
                case 'enabled':
                case 'displayed':
                case 'important':
                    find[key] = val;
                    break;
                default:
            }
        });
        return find;
    },

    async get(req, res) {
        try {
            await Validator.checkSchema(req, Schemas.dayoffType.get);
            const dayoffType = await Models.DayoffType.findOne({
                _id: req.params.id
            }).exec();
            if (dayoffType) {
                res.status(200).json(dayoffType.toJSON());
            } else {
                throw new NotFoundError('Dayoff type not found');
            }
        } catch (err) {
            res.error(err);
        }
    },

    async create(req, res) {
        try {
            await Validator.checkSchema(req, Schemas.dayoffType.create);
            await DayoffType.controlName(req.body.name);
            const dayoffType = await new (Models.DayoffType)(
                Tools.defaults(req.body, {
                    name: null,
                    emoji: null,
                    enabled: true,
                    displayed: true,
                    important: false
                })
            ).save();
            Log.info(`Dayoff type ${dayoffType.id} created`);
            StatsLog.logAddDayOffType(req.auth.userId);
            res.status(200).json(dayoffType.toJSON());
        } catch (err) {
            res.error(err);
        }
    },

    async update(req, res) {
        try {
            await Validator.checkSchema(req, Schemas.dayoffType.update);
            if (req.body.name) {
                await DayoffType.controlName(req.body.name, req.params.id);
            }
            const dayoffType = await Models.DayoffType.findOneAndUpdate({
                _id: req.params.id
            }, {
                $set: req.body
            }, {
                new: true,
                runValidators: true
            }).exec();
            if (dayoffType) {
                await DayoffType.updateDaysoffData(dayoffType);
                Log.info(`Dayoff type ${dayoffType.id} edited`);
                StatsLog.logEditDayOffType(req.auth.userId);
                res.status(200).json(dayoffType.toJSON());
            } else {
                throw new NotFoundError('Dayoff type not found');
            }
        } catch (err) {
            res.error(err);
        }
    },

    // disponible en mode test uniquement
    async delete(req, res) {
        try {
            if (env.ENVIRONMENT === 'test') {
                await Validator.checkSchema(req, Schemas.dayoffType.get);
                const dayoffType = await Models.DayoffType.findOneAndDelete({
                    _id: req.params.id
                }).exec();
                if (dayoffType !== null) {
                    Log.info(`Dayoff type ${dayoffType.id} deleted`);
                    res.status(200).json({});
                } else {
                    throw new NotFoundError('Dayoff type not found');
                }
            } else {
                throw new ForbiddenError('This route is only available in test mode');
            }
        } catch (err) {
            res.error(err);
        }
    },

    // update les données du type d'absence sur toutes absences de ce type
    async updateDaysoffData(dayoffType) {
        await Models.Dayoff.updateMany({
            'type._id': dayoffType.id
        }, {
            type: dayoffType
        }).exec();
    },

    // contrôle que le nom de type d'absence n'existe pas déjà
    async controlName(name, excludeId = null) {
        const nameRegex = new RegExp(`^${name.toLowerCase()}$`, 'i');
        const find = {
            name: nameRegex
        };
        if (excludeId) {
            find._id = {
                $ne: excludeId
            };
        }
        const controlDayoffType = await Models.DayoffType.findOne(find).exec();
        if (controlDayoffType) {
            throw new ConflictError(`Dayoff type with name ${name} already exists`);
        }
    },

    // créée le type d'absence par défaut si aucun n'est présent en database
    async createDefault() {
        const count = await Models.DayoffType.countDocuments({});
        if (!count) {
            await new (Models.DayoffType)({
                name: 'Congé',
                emoji: 'palm_tree',
                enabled: true,
                displayed: true,
                important: false
            }).save();
            Log.info('Default dayoff type created');
        }
    }

};

module.exports = DayoffType;
