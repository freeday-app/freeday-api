const Mongoose = require('mongoose');
const { expect } = require('chai');
const API = require('../utils/api.js');
const { assertLastLogEntryValues } = require('../utils/statslog.js');
const Tools = require('../../src/services/tools.js');

let user;

describe('[API] Users', () => {
    before(async () => {
        await API.init();
    });

    describe('POST /api/users', () => {
        it('Should throw validation error', async () => {
            const response = await API.request()
                .post('/api/users')
                .send({
                    username: 'user.test',
                    fake: 'fake'
                });
            expect(response).to.have.status(400);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4000);
        });

        it('Should throw validation error for invalid theme', async () => {
            const response = await API.request()
                .post('/api/users')
                .send({
                    language: 'en',
                    theme: 'fake.theme',
                    username: 'user.with.wrong.theme',
                    password: 'some.password'
                });
            expect(response).to.have.status(400);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4000);
        });

        it('Should throw conflict error', async () => {
            const createResponse = await API.request()
                .post('/api/users')
                .send({
                    username: 'user.with.same.name',
                    password: 'some.password'
                });
            expect(createResponse).to.have.status(200);
            const response = await API.request()
                .post('/api/users')
                .send({
                    username: 'User.With.Same.Name',
                    password: 'some.other.password'
                });
            expect(response).to.have.status(409);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4090);
        });

        it('Should create a new user', async () => {
            const username = `test${Tools.generateRandomString(6)}`;
            const password = Tools.generateRandomString(10);
            const response = await API.request()
                .post('/api/users')
                .send({
                    language: 'en',
                    theme: 'light',
                    username,
                    password
                });
            expect(response).to.have.status(200);
            expect(response).to.be.json;
            assertLastLogEntryValues({
                interface: 'client',
                type: 'addadmin',
                user: API.user.id
            });
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('id');
            expect(body).to.have.property('username');
            expect(body.username).to.equal(username);
            expect(body).to.have.property('language');
            expect(body.language).to.equal('en');
            expect(body).to.have.property('theme');
            expect(body.theme).to.equal('light');
            user = body;
        });
    });

    describe('POST /api/users/:id', () => {
        it('Should throw not found error', async () => {
            const unknownMongoId = Mongoose.Types.ObjectId();
            const response = await API.request()
                .post(`/api/users/${unknownMongoId}`)
                .send({
                    username: 'user.test'
                });
            expect(response).to.have.status(404);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4040);
        });

        it('Should throw validation error', async () => {
            const response = await API.request()
                .post(`/api/users/${user.id}`)
                .send({
                    username: 'user.test',
                    fake: 'fake'
                });
            expect(response).to.have.status(400);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4000);
        });

        it('Should throw validation error for invalid theme', async () => {
            const response = await API.request()
                .post(`/api/users/${user.id}`)
                .send({
                    language: 'en',
                    theme: 'fake.theme',
                    username: 'user.with.wrong.theme',
                    password: 'some.password'
                });
            expect(response).to.have.status(400);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4000);
        });

        it('Should throw conflict error', async () => {
            const otherUserResponse = await API.request()
                .post('/api/users')
                .send({
                    username: 'Some.User.With.A.Name',
                    password: 'some.password'
                });
            expect(otherUserResponse).to.have.status(200);
            const createResponse = await API.request()
                .post('/api/users')
                .send({
                    username: 'some.user.with.another.name',
                    password: 'some.other.password'
                });
            expect(createResponse).to.have.status(200);
            const createBody = createResponse.body;
            expect(createBody).to.be.an('object');
            expect(createBody).to.have.property('id');
            const response = await API.request()
                .post(`/api/users/${createBody.id}`)
                .send({
                    username: 'some.user.with.a.name'
                });
            expect(response).to.have.status(409);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4090);
        });

        it('Should edit user', async () => {
            const editData = [{
                language: 'fr',
                theme: 'light',
                username: `test${Tools.generateRandomString(6)}`,
                password: Tools.generateRandomString(10)
            }, {
                language: 'en',
                theme: 'dark'
            }, {
                language: 'fr',
                theme: 'light',
                username: `test${Tools.generateRandomString(6)}`,
                password: Tools.generateRandomString(10)
            }];
            const updateUser = async (data) => {
                const userResponse = await API.request()
                    .get(`/api/users/${user.id}`);
                expect(userResponse).to.have.status(200);
                const { body: userData } = userResponse;
                const expected = { ...userData, ...data };
                const response = await API.request()
                    .post(`/api/users/${user.id}`)
                    .send(data);
                expect(response).to.have.status(200);
                expect(response).to.be.json;
                assertLastLogEntryValues({
                    interface: 'client',
                    type: 'editadmin',
                    user: API.user.id
                });
                const { body } = response;
                expect(body).to.be.an('object');
                expect(body).to.have.property('id');
                expect(body).to.have.property('username');
                expect(body.username).to.equal(expected.username);
                expect(body).to.have.property('language');
                expect(body.language).to.equal(expected.language);
                expect(body).to.have.property('theme');
                expect(body.theme).to.equal(expected.theme);
                user = body;
            };
            for (const data of editData) {
                await updateUser(data);
            }
        });

        it('Should edit self user', async () => {
            const username = `test${Tools.generateRandomString(6)}`;
            const password = Tools.generateRandomString(10);
            const response = await API.request()
                .post('/api/users/me')
                .send({
                    language: 'fr',
                    theme: 'light',
                    username,
                    password
                });
            expect(response).to.have.status(200);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('id');
            expect(body).to.have.property('username');
            expect(body.username).to.equal(username);
            expect(body).to.have.property('language');
            expect(body.language).to.equal('fr');
            expect(body).to.have.property('theme');
            expect(body.theme).to.equal('light');
            // stocke nouvelles données user de test après modif
            API.user = body;
            API.password = password;
        });
    });

    describe('GET /api/users', () => {
        it('Should list users', async () => {
            const response = await API.request()
                .get('/api/users');
            expect(response).to.have.status(200);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('users');
            expect(body.users).to.be.an('array');
            expect(body.users).to.have.lengthOf.above(0);
            for (const usr of body.users) {
                expect(usr).to.be.an('object');
                expect(usr).to.have.property('id');
                expect(usr).to.have.property('username');
                expect(usr).to.have.property('language');
                expect(usr).to.have.property('theme');
            }
        });
    });

    describe('GET /api/users/:id', () => {
        it('Should throw validation error', async () => {
            const response = await API.request()
                .get('/api/users/InvalidMongoId');
            expect(response).to.have.status(400);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4000);
        });

        it('Should throw not found error', async () => {
            const unknownMongoId = Mongoose.Types.ObjectId();
            const response = await API.request()
                .get(`/api/users/${unknownMongoId}`);
            expect(response).to.have.status(404);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4040);
        });

        it('Should get target user information', async () => {
            const response = await API.request()
                .get(`/api/users/${user.id}`);
            expect(response).to.have.status(200);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('id');
            expect(body.id).to.equal(user.id);
            expect(body).to.have.property('username');
            expect(body.username).to.equal(user.username);
            expect(body).to.have.property('language');
            expect(body.language).to.equal(user.language);
            expect(body).to.have.property('theme');
            expect(body.theme).to.equal(user.theme);
        });

        it('Should get self user information', async () => {
            const response = await API.request()
                .get('/api/users/me');
            expect(response).to.have.status(200);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('id');
            expect(body.id).to.equal(API.user.id);
            expect(body).to.have.property('username');
            expect(body.username).to.equal(API.user.username);
            expect(body).to.have.property('language');
            expect(body.language).to.equal(API.user.language);
            expect(body).to.have.property('theme');
            expect(body.theme).to.equal(API.user.theme);
        });
    });

    describe('DELETE /api/users/:id', () => {
        it('Should throw not found error', async () => {
            const unknownMongoId = Mongoose.Types.ObjectId();
            const response = await API.request()
                .delete(`/api/users/${unknownMongoId}`);
            expect(response).to.have.status(404);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4040);
        });

        it('Should throw forbidden error', async () => {
            const getResponse = await API.request()
                .get('/api/users/me');
            const { id } = getResponse.body;
            const response = await API.request()
                .delete(`/api/users/${id}`);
            expect(response).to.have.status(403);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4030);
        });

        it('Should delete a user', async () => {
            const responseDelete = await API.request()
                .delete(`/api/users/${user.id}`);
            expect(responseDelete).to.have.status(200);
            expect(responseDelete).to.be.json;
            assertLastLogEntryValues({
                interface: 'client',
                type: 'removeadmin',
                user: API.user.id
            });
            const bodyDelete = responseDelete.body;
            expect(bodyDelete).to.be.an('object');
            const responseGet = await API.request()
                .get(`/api/users/${user.id}`);
            expect(responseGet).to.have.status(404);
            expect(responseGet).to.be.json;
            const bodyGet = responseGet.body;
            expect(bodyGet).to.be.an('object');
            expect(bodyGet).to.have.property('error');
        });
    });
});
