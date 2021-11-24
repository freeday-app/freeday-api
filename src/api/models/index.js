const Mongoose = require('mongoose');

const ConfigurationModel = require('./configuration.js');
const DayoffModel = require('./dayoff.js');
const DayoffTypeModel = require('./dayoffType.js');
const JobModel = require('./job.js');
const JobEventModel = require('./jobEvent.js');
const SlackAuthModel = require('./slackAuth.js');
const SlackChannelModel = require('./slackChannel.js');
const SlackUserModel = require('./slackUser.js');
const StatsLogModel = require('./statsLog.js');
const TokenModel = require('./token.js');
const UserModel = require('./user.js');

const Paginator = require('../../services/paginator.js');
const Cleanup = require('../../services/cleanup.js');
const Log = require('../../services/log.js');

const Models = {

    mode: null,
    models: {},
    schemas: {
        Configuration: Paginator.setMethods(ConfigurationModel),
        Dayoff: Paginator.setMethods(DayoffModel),
        DayoffType: Paginator.setMethods(DayoffTypeModel),
        Job: Paginator.setMethods(JobModel),
        JobEvent: Paginator.setMethods(JobEventModel),
        SlackAuth: Paginator.setMethods(SlackAuthModel),
        SlackChannel: Paginator.setMethods(SlackChannelModel),
        SlackUser: Paginator.setMethods(SlackUserModel),
        StatsLog: Paginator.setMethods(StatsLogModel),
        Token: Paginator.setMethods(TokenModel),
        User: Paginator.setMethods(UserModel)
    },

    // initialise la base de données
    async init(mode = null) {
        try {
            Log.info('Starting MongoDB initialization');
            Models.mode = mode;
            // connects to database and load models
            await Models.connectAndLoadModels(mode);
            // à la fermeture de l'app
            Cleanup.add(async () => {
                // ferme toutes les connections mongodb
                await Models.disconnect();
            });
        } catch (err) {
            Log.error('MongoDB initialization error');
            Log.error(err.stack);
        }
    },

    // connects to database and loads models
    async connectAndLoadModels(mode = null) {
        Log.info('Initializing MongoDB connection');
        const url = mode === 'test'
            ? process.env.MONGO_TEST_URL
            : process.env.MONGO_URL;
        // connects to mongo database
        const connection = await Mongoose.createConnection(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        // creates and loads models
        for (const name of Object.keys(Models.schemas)) {
            Models[name] = connection.model(name, Models.schemas[name]);
        }
        Log.info('MongoDB connection initialized');
        // clears test database if test mode
        if (mode === 'test') {
            await Models.clearTestDatabase();
        }
    },

    // closes all database connections
    async disconnect() {
        Log.info('Closing MongoDB connections');
        return new Promise((resolve, reject) => {
            Mongoose.disconnect((err) => {
                if (err) {
                    Log.info('Error while closing MongoDB connections');
                    reject(err);
                } else {
                    Log.info('MongoDB connections closed');
                    resolve();
                }
            });
        });
    },

    // vide la base de données de test
    async clearTestDatabase() {
        // contrôle mode de test
        if (Models.mode === 'test') {
            // efface collections
            await Models.User.deleteMany();
            await Models.Dayoff.deleteMany();
            await Models.SlackAuth.deleteMany();
            await Models.SlackUser.deleteMany();
            await Models.SlackChannel.deleteMany();
            await Models.Token.deleteMany();
            await Models.DayoffType.deleteMany();
            await Models.Configuration.deleteMany();
            await Models.Job.deleteMany();
            await Models.JobEvent.deleteMany();
            Log.info('MongoDB test database cleared');
        }
    }

};

module.exports = Models;
