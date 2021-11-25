const Models = require('../api/models/index.js');
const Crypt = require('./crypt.js');
const Log = require('./log.js');

const Modes = {

    currentMode: false,
    legitModes: ['test'],

    // renvoie mode en cours, null si aucun
    current() {
        if (Modes.currentMode === false) {
            Modes.currentMode = Modes.legitModes.includes(process.env.MODE)
                ? process.env.MODE
                : null;
        }
        return Modes.currentMode;
    },

    // indique si le bot slack est activé
    botIsEnabled() {
        return process.env.SLACK_ENABLED === 'true';
    },

    // lance tâches pour modes de l'app
    async run() {
        try {
            // gets current mode
            const mode = Modes.current();
            const modeName = mode || 'normal';
            Log.info(`App is running in ${modeName} mode`);
            // executes tasks
            if (mode && Modes[`${mode}Tasks`]) {
                await Modes[`${mode}Tasks`]();
            }
        } catch (err) {
            Log.error('Error during app initialization');
            Log.error(err.stack);
            Log.error(JSON.stringify(err));
        }
    },

    // tâches mode de test
    async testTasks() {
        if (Modes.current() === 'test') {
            Log.info('Executing test mode tasks');
            // si création utilisateur
            if (process.env.TEST_USER && /^.{6,}:.{6,}$/.test(process.env.TEST_USER)) {
                const split = process.env.TEST_USER.split(':');
                const username = split[0];
                const password = split[1];
                const hash = await Crypt.hashPassword(password);
                await new Models.User({
                    username,
                    password: hash,
                    language: 'en'
                }).save();
                Log.info(`Test user '${username}' created`);
            }
            // set le niveau de log à erreur
            Log.info('Switching console level to error');
            Log.toggleTransport('file', true, 'error');
            Log.toggleTransport('console', true, 'error');
        }
    }

};

module.exports = Modes;
