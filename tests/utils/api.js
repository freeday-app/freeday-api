require('dotenv').config();

const Chai = require('chai');
const ChaiHttp = require('chai-http');

Chai.use(ChaiHttp);

const App = require('../../src/app.js');
const Models = require('../../src/api/models/index.js');
const Log = require('../../src/services/log.js');
const Crypt = require('../../src/services/crypt.js');
const Tools = require('../../src/services/tools.js');
const SlackNotify = require('../../src/bot/utils/notify.js');
const SlackDataController = require('../../src/api/controllers/slackData.js');
const Data = require('../api/data/global.data.js');

before((done) => {
    App.on('ready', () => {
        done();
    });
});

const API = {

    user: null,
    password: null,
    token: null,
    initDone: false,

    // initializes api for tests
    async init() {
        if (API.initDone) {
            return;
        }
        // set api log level to error
        Log.info('Switching console level to error');
        Log.toggleTransport('file', true, 'error');
        Log.toggleTransport('console', true, 'error');
        // creates test user
        const { username, password } = await API.createUser();
        // set user data locally
        await API.setUserData(username, password);
        await API.initSlackData();
        // slack mock
        API.mockSlack();
        //
        API.initDone = true;
    },

    // renvoie object chai http pour requête sur api
    request: (auth = true) => {
        const getReq = (method, ...args) => {
            let chaiReq = Chai.request(App)[method](...args);
            if (auth === true) {
                chaiReq = chaiReq.set('Authorization', API.token);
            } else if (auth) {
                chaiReq = chaiReq.set('Authorization', auth);
            }
            return chaiReq;
        };
        return {
            get: (...args) => getReq('get', ...args),
            post: (...args) => getReq('post', ...args),
            put: (...args) => getReq('put', ...args),
            delete: (...args) => getReq('delete', ...args),
            patch: (...args) => getReq('patch', ...args)
        };
    },

    // creates test user
    async createUser() {
        // creates test user
        const username = `test${Tools.generateRandomPassword(6)}`;
        const password = Tools.generateRandomPassword(10);
        const hash = await Crypt.hashPassword(password);
        await new Models.User({
            username,
            password: hash,
            language: 'en'
        }).save();
        return {
            username,
            password
        };
    },

    // récupère les données du user de test
    async setUserData(usrnm = null, psswd = null) {
        const username = usrnm || API.user.username;
        const password = psswd || API.password;
        API.password = password;
        const tokenResponse = await API.request(false)
            .post('/api/auth')
            .send({ username, password });
        API.token = tokenResponse.body.token;
        if (!API.token) {
            throw new Error('Invalid token received during API initialization');
        }
        const userResponse = await API.request()
            .get('/api/users/me')
            .set('Authorization', API.token);
        API.user = userResponse.body;
    },

    // initialise les donnée de slack en base
    async initSlackData() {
        await Data.createSlackUsers();
        await Data.createSlackChannels();
    },

    // mock le module slack
    mockSlack() {
        // mock synchronisation données slacks dans controlleur slack
        SlackDataController.sync = () => {};
        // mock envois de notification slacks
        [
            'send', 'confirmCreate', 'confirmEdit', 'confirmDelete',
            'confirm', 'referrerCreate', 'referrerEdit', 'referrerDelete',
            'referrer', 'statusChange', 'noDaysError'
        ].forEach((functionName) => {
            SlackNotify[functionName] = () => {};
        });
    }

};

module.exports = API;
