const { WebClient, ErrorCode } = require('@slack/web-api');
const { App: SlackApp, ExpressReceiver } = require('@slack/bolt');

const Log = require('../../services/log.js');
const { env } = require('../../services/env.js');
const { InternError } = require('../../services/errors.js');

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
            SDK.initWebClient(env.SLACK_ACCESS_TOKEN);
            if (SDK.webClient === null) {
                throw new InternError('Could not initialize Slack client');
            }
            const isClientValid = await SDK.testWebClient();
            if (!isClientValid) {
                SDK.webClient = null;
                throw new InternError('Slack client authentication failed');
            }
            Log.info('Initialized Slack client');
        }
        return SDK.webClient;
    },

    // initializes web client
    initWebClient(accessToken) {
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

    isActive() {
        return !!SDK.webClient;
    }
};

module.exports = SDK;
