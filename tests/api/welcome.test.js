const { expect } = require('chai');
const API = require('../utils/api.js');
const AuthController = require('../../src/api/controllers/auth.js');
const Models = require('../../src/api/models/index.js');

const backup = {};
const backupAuth = async () => {
    backup.users = await Models.User.find({});
    backup.tokens = await Models.Token.find({});
};
const clearAuth = async () => {
    await Models.User.deleteMany({});
    await Models.Token.deleteMany({
        $or: [
            { initialization: { $exists: false } },
            { initialization: { $eq: false } }
        ]
    });
};
const restoreAuth = async () => {
    await clearAuth();
    await Models.User.insertMany(backup.users);
    await Models.Token.insertMany(backup.tokens);
};
const insertUser = async (user) => {
    await Models.User.insertMany([user]);
};
const setWelomeSecret = async () => {
    await AuthController.createInitialization();
};
const getWelcomeSecret = async () => {
    const result = await Models.Token.findOne({
        initialization: true
    });
    if (!result) {
        return null;
    }
    const json = result.toJSON();
    return Buffer.from(json.token).toString('base64').replace('=', '');
};

describe('[API] Welcome', () => {
    before(async () => {
        await API.init();
        // clears user and token collections for welcome tests
        await backupAuth();
        await clearAuth();
        // initiates welcome secret in database
        await setWelomeSecret();
    });

    after(async () => {
        // put back users and token in database
        await restoreAuth();
        // sets user data in api util
        await API.setUserData();
    });

    describe('POST /api/auth/welcome', () => {
        it('Should throw forbidden error', async () => {
            // creates user in database
            await insertUser({
                username: 'random',
                password: 'random',
                language: 'en'
            });
            //
            const response = await API.request('fakeSecret')
                .get('/api/auth/welcome');
            expect(response).to.have.status(403);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4030);
            // deletes users
            await clearAuth();
        });

        it('Should throw authentication error', async () => {
            const response = await API.request('fakeSecret')
                .get('/api/auth/welcome');
            expect(response).to.have.status(401);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4012);
        });

        it('Should check welcome secret code', async () => {
            const secret = await getWelcomeSecret();
            // performs welcome user creation
            const response = await API.request(secret)
                .get('/api/auth/welcome');
            expect(response).to.have.status(200);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
        });
    });

    describe('POST /api/auth/welcome', () => {
        it('Should throw validation error', async () => {
            const response = await API.request('fakeSecret')
                .post('/api/auth/welcome')
                .send({
                    fake: 'field'
                });
            expect(response).to.have.status(400);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4000);
        });

        it('Should throw forbidden error', async () => {
            // creates user in database
            await insertUser({
                username: 'random',
                password: 'random',
                language: 'en'
            });
            //
            const response = await API.request('fakeSecret')
                .post('/api/auth/welcome')
                .send({
                    username: 'username',
                    password: 'password'
                });
            expect(response).to.have.status(403);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4030);
            // deletes users
            await clearAuth();
        });

        it('Should throw authentication error', async () => {
            const response = await API.request('fakeSecret')
                .post('/api/auth/welcome')
                .send({
                    username: 'username',
                    password: 'password'
                });
            expect(response).to.have.status(401);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4012);
        });

        it('Should create welcome user', async () => {
            const secret = await getWelcomeSecret();
            const user = {
                username: API.user.username,
                password: API.password,
                language: 'fr'
            };
            // performs welcome user creation
            const response = await API.request(secret)
                .post('/api/auth/welcome')
                .send({
                    ...user
                });
            expect(response).to.have.status(200);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('id');
            expect(body).to.have.property('username');
            expect(body).to.have.property('language');
            expect(body.username).to.equal(user.username);
            expect(body.language).to.equal(user.language);
            const userId = body.id;
            // logs in api
            const loginResponse = await API.request(false)
                .post('/api/auth')
                .send({
                    username: API.user.username,
                    password: API.password
                });
            expect(response).to.have.status(200);
            expect(response).to.be.json;
            const { body: loginBody } = loginResponse;
            expect(loginBody).to.be.an('object');
            expect(loginBody).to.have.property('userId');
            expect(loginBody).to.have.property('limit');
            expect(loginBody).to.have.property('token');
            expect(loginBody.userId).to.equal(userId);
        });
    });
});
