const { WebClient, ErrorCode } = require('@slack/web-api');
const { App: SlackApp, ExpressReceiver } = require('@slack/bolt');

const Log = require('../../services/log.js');
const Models = require('../../api/models/index.js');
const Tools = require('../../services/tools.js');
const { env } = require('../../services/env.js');
const {
    InternError,
    SlackOAuthError
} = require('../../services/errors.js');

const SDK = {

    app: null,
    webClient: null,
    // scopes needed for slack bot
    scopes: [
        'channels:read',
        'chat:write',
        'im:history',
        'im:read',
        'im:write',
        'groups:read',
        'team:read',
        'users:read'
    ],

    // initializes slack sdk
    // async init(App, auth) {
    async init(App) {
        try {
            // initializes web clients
            // SDK.initWebClient(auth);
            SDK.initWebClient(env.SLACK_ACCESS_TOKEN);
            // initializes Slack application
            SDK.app = new SlackApp({
                authorize: () => ({ botToken: null }),
                ignoreSelf: false,
                receiver: new ExpressReceiver({
                    signingSecret: env.SLACK_SIGNING_SECRET,
                    endpoints: '/'
                })
            });
            // adds app router to express endpoints
            App.use('/api/slack/events', SDK.app.receiver.router);
            //
            Log.info('Slack bot initialized');
        } catch (err) {
            Log.error(err.stack);
        }
    },

    // gets web client
    async web() {
        if (!SDK.webClient) {
            const auth = await Models.SlackAuth.findOne();
            SDK.initWebClient(auth.toJSON());
            if (SDK.webClient === null) {
                // no token in database
                throw new InternError('Slack web client is inactive');
            }
            const isClientValid = await SDK.testWebClient();
            if (!isClientValid) {
                // token in database is invalid
                // remove it and delete the webclient
                await Models.SlackAuth.updateOne({}, { accessToken: null });
                SDK.webClient = null;
                throw new InternError('Slack web client is inactive');
            }
            Log.info('Retrieved valid token');
        } else {
            const isClientValid = await SDK.testWebClient();
            if (!isClientValid) {
                // token is invalid, delete the webclient
                // then call this function again to try to recreate it from database
                // no more recursion because this code is unreachable if webclient is null
                Log.warn('Invalid token, attempting to retrieve from database');
                SDK.webClient = null;
                return SDK.web();
            }
        }
        return SDK.webClient;
    },

    // initializes web client
    initWebClient(accessToken) {
        // SDK.webClient = auth && auth.accessToken ? new WebClient(auth.accessToken) : null;
        SDK.webClient = accessToken ? new WebClient(accessToken) : null;
    },

    // tests if web client has a valid access token
    async testWebClient() {
        try {
            await SDK.webClient.auth.test();
        } catch (err) {
            if (err.code === ErrorCode.PlatformError) {
                if (['not_authed', 'invalid_auth'].includes(err.data.error)) {
                    return false;
                }
            }
        }
        return true;
    },

    // checks slack oauth code validity and returns result if valid
    async checkOAuthCode(code) {
        try {
            const result = await (new WebClient()).oauth.v2.access({
                client_id: env.SLACK_CLIENT_ID,
                client_secret: env.SLACK_CLIENT_SECRET,
                redirect_uri: SDK.redirectUrl(),
                code
            });
            if (!result.ok) {
                throw new SlackOAuthError();
            }
            return {
                teamId: result.team.id,
                accessToken: result.access_token
            };
        } catch (err) {
            throw new SlackOAuthError();
        }
    },

    isActive() {
        return !!SDK.webClient;
    },

    // generates redirect uri
    getRedirectUrl() {
        return Tools.buildUrl(env.PUBLIC_URL, 'register');
    }
};

module.exports = SDK;
