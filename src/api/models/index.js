const Mongoose = require('mongoose');

const ConfigurationModel = require('./configuration.js');
const DayoffModel = require('./dayoff.js');
const DayoffTypeModel = require('./dayoffType.js');
const JobModel = require('./job.js');
const JobEventModel = require('./jobEvent.js');
const SlackChannelModel = require('./slackChannel.js');
const SlackUserModel = require('./slackUser.js');
const StatsLogModel = require('./statsLog.js');
const TokenModel = require('./token.js');
const UserModel = require('./user.js');

const { env } = require('../../services/env.js');
const Crypt = require('../../services/crypt.js');
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
        SlackChannel: Paginator.setMethods(SlackChannelModel),
        SlackUser: Paginator.setMethods(SlackUserModel),
        StatsLog: Paginator.setMethods(StatsLogModel),
        Token: Paginator.setMethods(TokenModel),
        User: Paginator.setMethods(UserModel)
    },

    // initialise la base de données
    async init() {
        try {
            Log.info('Starting MongoDB initialization');
            // connects to database and load models
            await Models.connectAndLoadModels();
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
    async connectAndLoadModels() {
        Log.info('Initializing MongoDB connection');
        const url = env.ENVIRONMENT === 'test'
            ? env.MONGO_TEST_URL
            : env.MONGO_URL;
        // connects to mongo database
        try {
            await Mongoose.connect(url, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 10000
            });
        } catch (err) {
            Log.error('Could not connect to MongoDB');
            process.exit();
        }
        // creates and loads models
        for (const name of Object.keys(Models.schemas)) {
            Models[name] = Mongoose.model(name, Models.schemas[name]);
        }
        Log.info('MongoDB connection initialized');
        // clears test database if test mode
        if (env.ENVIRONMENT === 'test') {
            await Models.clearTestDatabase();
            await Models.createTestUser();
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

    // creates a test user when in test environment
    async createTestUser() {
        if (env.ENVIRONMENT === 'test' && env.TEST_USERNAME && env.TEST_PASSWORD) {
            const hash = await Crypt.hashPassword(env.TEST_PASSWORD);
            await new Models.User({
                username: env.TEST_USERNAME,
                password: hash,
                language: 'en'
            }).save();
        }
    },

    // vide la base de données de test
    async clearTestDatabase() {
        // contrôle mode de test
        if (env.ENVIRONMENT === 'test') {
            // efface collections
            await Models.User.deleteMany();
            await Models.Dayoff.deleteMany();
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
