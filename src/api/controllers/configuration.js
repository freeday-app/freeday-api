const Models = require('../models/index.js');
const Schemas = require('./schemas/index.js');
const SlackDataController = require('./slackData.js');
const Validator = require('../../services/validator.js');
const Log = require('../../services/log.js');
const StatsLog = require('../../services/statsLog.js');
const { InvalidSlackReferrerError } = require('../../services/errors.js');

const Configuration = {

    default: {
        brandingName: null,
        brandingLogo: null,
        slackReferrer: null,
        workDays: [1, 2, 3, 4, 5]
    },

    async get(_req, res) {
        try {
            const conf = await Configuration.getProxy();
            res.status(200).json(conf);
        } catch (error) {
            res.error(error);
        }
    },

    async getProxy() {
        // gets configuration
        let conf = await Models.Configuration.findOne();
        // if no configuration insert default
        if (!conf) {
            conf = await Configuration.upsertProxy(Configuration.default);
        } else {
            conf = conf.toJSON();
        }
        return conf;
    },

    // public configuration data
    async getPublic(_req, res) {
        try {
            const {
                brandingName,
                brandingLogo
            } = await Configuration.getProxy();
            res.status(200).json({
                brandingName,
                brandingLogo
            });
        } catch (error) {
            res.error(error);
        }
    },

    async upsert(req, res) {
        try {
            await Validator.checkSchema(req, Schemas.configuration.upsert);
            const conf = await Configuration.upsertProxy(req.body);
            StatsLog.logEditConfig(req.auth.userId);
            res.status(200).json(conf);
        } catch (err) {
            res.error(err);
        }
    },

    async upsertProxy(data) {
        // parses conf data
        let confData = Configuration.parseData(data);
        // if no configuration in database merge default
        const existingConf = await Models.Configuration.findOne();
        if (!existingConf) {
            confData = {
                ...Configuration.default,
                ...confData
            };
        }
        // checks if the bot has access to the referrer of the request
        if (confData.slackReferrer) {
            const channel = await SlackDataController.getChannelProxy(confData.slackReferrer);
            if (!channel || !channel.isMember) {
                throw new InvalidSlackReferrerError('This channel cannot be set as referrer');
            }
        }
        // saves configuration
        const savedConf = await Models.Configuration.findOneAndUpdate({}, {
            $set: confData
        }, {
            upsert: true,
            new: true,
            runValidators: true
        });
        const conf = savedConf.toJSON();
        Log.info(`Configuration updated: ${JSON.stringify({
            ...conf,
            brandingLogo: conf.brandingLogo
                ? `${conf.brandingLogo.substring(0, 10)}...`
                : conf.brandingLogo
        })}`);
        return conf;
    },

    // applique formatage sur données configuration
    parseData(conf) {
        if (conf.workDays) {
            return {
                ...conf,
                // removes duplicate and sort work days array
                workDays: [...new Set(conf.workDays)].sort()
            };
        }
        return conf;
    }

};

module.exports = Configuration;
