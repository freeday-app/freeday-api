// utilise le sdk slack pour nodejs
// https://github.com/slackapi/node-slack-sdk

const Log = require('../services/log.js');
const SDK = require('./utils/sdk.js');
const Handlers = require('./utils/handlers.js');
const SlackAuthController = require('../api/controllers/slackAuth.js');
const LanguageService = require('../services/language.js');
const DialogService = require('../services/dialog.js');
const Configuration = require('../services/configuration.js');

const Bot = {

    // initialise bot Slack
    async init(App) {
        try {
            // récupère données authentification slack
            const auth = await SlackAuthController.get();
            // initialise sdk slack
            await SDK.init(App, auth);
            // initialise dialogflow
            if (Configuration.data.dialogflow) {
                DialogService.init();
            }
            // bind handlers
            Bot.bindHandlers();
        } catch (err) {
            Log.error(err.stack);
        }
    },

    // initialise écoute évènements et interactions slack
    bindHandlers() {
        // évènements
        SDK.app.event('message', Bot.slackMiddlewares(Handlers.onMessage));
        // actions
        SDK.app.action({}, Bot.slackMiddlewares(Handlers.onAction));
        // validation formulaire absence
        SDK.app.view('dayoff_save', Bot.slackMiddlewares(Handlers.onViewSubmission));
    },

    // Applys a middleware on the provided data
    // Skips middleware if data is null
    async applyMiddleware(data, middleware) {
        const result = await data;
        if (result !== null) {
            return middleware(result);
        }
        return null;
    },

    // retourne une fonction qui prend en paramètre une interaction slack
    // et qui lui applique les middlewares avant d'appeler le handler
    slackMiddlewares(handler) {
        return async (event) => {
            // Merge useful data in an object
            const processedEvent = {
                ...event.body,
                ...event.event,
                ...event.action
            };

            // Apply handlers successively on data
            // If a handler returns null, the next ones are ignored
            // Order is respected
            const response = await [
                Handlers.botFilterMiddleware,
                LanguageService.slackMiddleware,
                Configuration.data.dialogflow ? DialogService.slackMiddleware : null,
                handler
            ].filter((m) => !!m).reduce(Bot.applyMiddleware, processedEvent);

            // If Slack expects an ACK, send it with the response
            if (event.ack) {
                await event.ack(response);
            }

            return response;
        };
    }
};

module.exports = Bot;
