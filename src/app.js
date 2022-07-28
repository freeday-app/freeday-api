require('dotenv').config();

const DayJS = require('dayjs');
const CustomParseFormat = require('dayjs/plugin/customParseFormat.js');
const IsSameOrBefore = require('dayjs/plugin/isSameOrBefore.js');
const IsoWeek = require('dayjs/plugin/isoWeek.js');

const Express = require('express');
const Helmet = require('helmet');

const Bot = require('./bot/index.js');
const Models = require('./api/models/index.js');
const Routes = require('./api/routes/index.js');
const Errors = require('./services/errors.js');
const { env } = require('./services/env.js');
const Log = require('./services/log.js');
const Jobs = require('./services/jobs.js');
const Auth = require('./api/controllers/auth.js');

// set timezone
process.env.TZ = env.TIMEZONE;

// initialise dayjs plugins
DayJS.extend(CustomParseFormat);
DayJS.extend(IsSameOrBefore);
DayJS.extend(IsoWeek);

// express
const App = Express();

// needed to forward ip through proxy
App.enable('trust proxy');

// helmet protection on api
App.use('/api/*', Helmet());

// démarrage app asynchrone
(async () => {
    try {
        Log.info(`Environment is set to ${env.ENVIRONMENT}`);

        // initialise modèles et connecte mongodb
        await Models.init();

        // initialize slack bot
        // must be placed before Express.json and Express.urlencoded middlewares
        if (env.SLACK_ENABLED) {
            await Bot.init(App);
        }

        // initialise body parser
        App.use(Express.json());
        App.use(Express.urlencoded({
            extended: true
        }));

        // errors middleware
        App.use(Errors.middleware);

        // initialise routes
        Routes.set(App);

        // initialise parcours de bienvenue
        await Auth.initiateWelcome();

        // lancement des jobs récurrents
        await Jobs.init();

        // app listening
        const port = env.PORT ?? 8787;
        App.listen(port, () => {
            Log.info(`Freeday running on port ${port}`);
            // évènement app prête pour tests
            App.emit('ready');
            App.isReady = true;
        });
    } catch (err) {
        Log.error('Error while starting app');
        Log.error(err.stack);
        process.exit();
    }
})();

// exporte app pour tests
module.exports = App;
