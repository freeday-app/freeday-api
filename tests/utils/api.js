require('dotenv').config();

const Chai = require('chai');
const ChaiHttp = require('chai-http');

Chai.use(ChaiHttp);

const Tools = require('../../src/services/tools.js');
const SlackNotify = require('../../src/bot/utils/notify.js');
const SlackDataController = require('../../src/api/controllers/slackData.js');
const Data = require('../api/data/global.data.js');

const API = {

    app: null,
    user: null,
    password: null,
    token: null,
    initDone: false,

    // initialise api pour tests
    async init() {
        if (API.initDone) {
            return;
        }
        // données pour user de test
        const username = `test${Tools.generateRandomPassword(6)}`;
        const password = Tools.generateRandomPassword(10);
        // variable environnement mode test
        process.env.MODE = 'test';
        process.env.SLACK_ENABLED = 'false';
        // variable environnement pour création user de test
        process.env.TEST_USER = `${username}:${password}`;
        // récupère instance app
        API.app = require('../../src/app.js'); // eslint-disable-line global-require
        // attend que l'app soit initialisée
        await new Promise((resolve) => {
            if (API.app.isReady) {
                resolve();
            } else {
                API.app.on('ready', resolve);
            }
        });
        // set données user de test
        await API.setUserData(username, password);
        await API.initSlackData();
        // mocks
        API.mockSlack();
        //
        API.initDone = true;
    },

    // renvoie object chai http pour requête sur api
    request: (auth = true) => {
        const getReq = (method, ...args) => {
            let chaiReq = Chai.request(API.app)[method](...args);
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
