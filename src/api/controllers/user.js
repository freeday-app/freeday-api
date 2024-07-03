const { validator, validateParamUuid } = require('../../services/validator.js');
const Models = require('../models/index.js');
const Crypt = require('../../services/crypt.js');
const Log = require('../../services/log.js');
const StatsLog = require('../../services/statsLog.js');
const {
    NotFoundError,
    ConflictError,
    ForbiddenError
} = require('../../services/errors.js');

const UserSchemas = require('./schemas/user.json');

const validateList = validator(UserSchemas.list);
const validateCreate = validator(UserSchemas.create);
const validateUpdate = validator(UserSchemas.update);

// endpoints utilisateurs administrateurs de Freeday
const User = {

    async list(req, res) {
        try {
            validateList(req.query);
            const result = await Models.User.paginateToResult(
                'users',
                req.query.page,
                req.query.limit,
                {},
                { username: 'asc' }
            );
            res.status(200).json(result);
        } catch (err) {
            res.error(err);
        }
    },

    async get(req, res) {
        try {
            validateParamUuid(req.params.id);
            const user = await Models.User.findOne({
                _id: req.params.id
            }).exec();
            if (user) {
                res.status(200).json(user.toJSON());
            } else {
                throw new NotFoundError('User not found');
            }
        } catch (err) {
            res.error(err);
        }
    },

    async getMe(req, res) {
        req.params.id = req.auth.userId;
        User.get(req, res);
    },

    async create(req, res) {
        try {
            validateCreate(req.body);
            const user = await User.createProxy(req.body);
            StatsLog.logAddAdmin(req.auth.userId);
            res.status(200).json(user);
        } catch (err) {
            res.error(err);
        }
    },

    async createProxy(data) {
        await User.controlUsername(data.username);
        const hash = await Crypt.hashPassword(data.password);
        const user = await new (Models.User)({
            username: data.username,
            password: hash,
            language: data.language ? data.language : 'en',
            theme: data.theme ? data.theme : 'light'
        }).save();
        Log.info(`User ${user.id} created`);
        return user.toJSON();
    },

    async update(req, res) {
        try {
            validateParamUuid(req.params.id);
            validateUpdate(req.body);
            if (req.body.username) {
                await User.controlUsername(req.body.username, req.params.id);
            }
            if (req.body.password) {
                req.body.password = await Crypt.hashPassword(req.body.password);
            }
            const user = await Models.User.findOneAndUpdate({
                _id: req.params.id
            }, {
                $set: req.body
            }, {
                new: true,
                runValidators: true
            }).exec();
            if (user) {
                Log.info(`User ${user.id} edited`);
                if (req.body.username || req.body.password) {
                    StatsLog.logEditAdmin(req.auth.userId);
                } else if (req.body.language) {
                    StatsLog.logClientChangeLanguage(user.id);
                } else if (req.body.theme) {
                    StatsLog.logChangeTheme(user.id);
                }
                res.status(200).json(user.toJSON());
            } else {
                throw new NotFoundError('User not found');
            }
        } catch (err) {
            res.error(err);
        }
    },

    async updateMe(req, res) {
        req.params.id = req.auth.userId;
        User.update(req, res);
    },

    async delete(req, res) {
        try {
            validateParamUuid(req.params.id);
            if (req.params.id.toString() !== req.auth.userId.toString()) {
                const user = await Models.User.findOneAndDelete({
                    _id: req.params.id
                }).exec();
                if (user) {
                    Log.info(`User ${user.id} deleted`);
                    StatsLog.logRemoveAdmin(req.auth.userId);
                    res.status(200).json({});
                } else {
                    throw new NotFoundError('User not found');
                }
            } else {
                throw new ForbiddenError("Can't delete self user");
            }
        } catch (err) {
            res.error(err);
        }
    },

    async controlUsername(username, excludeId = null) {
        const usernameRegex = new RegExp(`^${username.toLowerCase()}$`, 'i');
        const find = {
            username: usernameRegex
        };
        if (excludeId) {
            find._id = {
                $ne: excludeId
            };
        }
        const controlUser = await Models.User.findOne(find).exec();
        if (controlUser) {
            throw new ConflictError(`Username ${username} already exists`);
        }
    },

    async findUserById(id) {
        validateParamUuid(id);
        const user = await Models.User.findOne({
            _id: id
        }).exec();
        return user.toJSON();
    }

};

module.exports = User;
