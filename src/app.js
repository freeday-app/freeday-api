// timezone
process.env.TZ = 'GMT';

// initialise configuration dotenv
require('dotenv').config();
// TODO configuration integrity should be checked somehow

const DayJS = require('dayjs');
const CustomParseFormat = require('dayjs/plugin/customParseFormat.js');
const IsSameOrBefore = require('dayjs/plugin/isSameOrBefore.js');
const IsoWeek = require('dayjs/plugin/isoWeek.js');

const Express = require('express');
const Cors = require('cors');
const Helmet = require('helmet');

const Bot = require('./bot/index.js');
const Models = require('./api/models/index.js');
const Routes = require('./api/routes/index.js');
const Errors = require('./services/errors.js');
const Log = require('./services/log.js');
const Modes = require('./services/modes.js');
const Jobs = require('./services/jobs.js');
const Auth = require('./api/controllers/auth.js');

// initialise dayjs plugins
DayJS.extend(CustomParseFormat);
DayJS.extend(IsSameOrBefore);
DayJS.extend(IsoWeek);

// express
const App = Express();

// cors
if (process.env.API_ENABLE_CORS === 'true') {
    Log.info('Enabling CORS');
    App.use(Cors());
    App.options('*', Cors());
}

// needed to forward ip through proxy
App.enable('trust proxy');

// protection helmet
App.use(Helmet());

// démarrage app asynchrone
(async () => {
    try {
        // mode de l'app
        const mode = Modes.current();

        // initialise modèles et connecte mongodb
        await Models.init(mode);

        // initialize bot slack
        // doit se trouver avant initialisation body parser
        if (Modes.botIsEnabled()) {
            await Bot.init(App);
        }

        // initialise body parser
        App.use(Express.json());
        App.use(Express.urlencoded({
            extended: false
        }));

        // errors middleware
        App.use(Errors.middleware);

        // initialise route de ping
        Routes.setPing(App);

        // initialise routes
        Routes.set(App);

        // gère modes de l'app
        await Modes.run();

        // initialise parcours de bienvenue
        await Auth.initiateWelcome();

        // lancement des jobs récurrents
        await Jobs.init();

        // app listening
        const port = process.env.API_PORT ?? 8787;
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
