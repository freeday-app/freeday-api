const Validator = require('../../services/validator.js');
const Schemas = require('./schemas/index.js');
const Tools = require('../../services/tools.js');
const Models = require('../models/index.js');
const SDK = require('../../bot/utils/sdk.js');
const StatsLog = require('../../services/statsLog.js');
const {
    SlackOAuthError
} = require('../../services/errors.js');
const {
    obj: slackAuthSchema
} = require('../models/slackAuth.js');

const SlackAuth = {

    // gets default empty slack auth object from model schema
    default() {
        const def = {};
        for (const key of Object.keys(slackAuthSchema)) {
            def[key] = null;
        }
        return def;
    },

    // upserts slack auth object in database (intern)
    async upsert(data) {
        const auth = await Models.SlackAuth.findOneAndUpdate({}, {
            $set: data
        }, {
            upsert: true,
            new: true,
            runValidators: true
        });
        return auth.toJSON();
    },

    // gets slack auth (intern)
    async get() {
        const auth = await Models.SlackAuth.findOne();
        if (!auth) {
            return SlackAuth.upsert(SlackAuth.default());
        }
        return auth.toJSON();
    },

    // gets slack oauth url
    async url(req, res) {
        try {
            // creates oauth state code
            const state = await Tools.generateToken();
            const redirectUrl = SDK.getRedirectUrl();
            // saves state token in database
            await SlackAuth.upsert({ state });
            // url parameters
            const params = [
                `client_id=${process.env.SLACK_CLIENT_ID}`,
                `scope=${SDK.scopes.join(encodeURI(' '))}`,
                `redirect_uri=${redirectUrl}`,
                `state=${state}`
            ];
            // builds url
            const url = `https://slack.com/oauth/v2/authorize?${params.join('&')}`;
            //
            res.status(200).json({ url });
        } catch (err) {
            res.error(err);
        }
    },

    // handler for slack oauth route
    async register(req, res) {
        try {
            await Validator.checkSchema(req, Schemas.slackAuth.register);
            // gets local slack auth data
            const auth = await SlackAuth.get();
            // controls state
            if (!auth.state || req.body.state !== auth.state) {
                throw new SlackOAuthError();
            }
            // controls code
            const oauth = await SDK.checkOAuthCode(req.body.code);
            // initializes new web client
            SDK.initWebClient(oauth);
            // saves auth data
            await SlackAuth.upsert(oauth);
            //
            StatsLog.logInstallApp(req.auth.userId);
            res.status(200).json({});
        } catch (err) {
            res.error(err);
        }
    }

};

module.exports = SlackAuth;
