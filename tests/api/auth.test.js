const { expect } = require('chai');
const API = require('../utils/api.js');
const { assertLastLogEntryValues } = require('../utils/statslog.js');

describe('[API] Authentication', () => {
    before(async () => {
        await API.init();
    });

    describe('POST /api/auth', () => {
        it('Should throw validation error', async () => {
            const response = await API.request(false)
                .post('/api/auth')
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

        it('Should throw authentication error', async () => {
            const response = await API.request(false)
                .post('/api/auth')
                .send({
                    username: 'fake',
                    password: 'fake'
                });
            expect(response).to.have.status(401);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4010);
        });

        it('Should authenticate successfully', async () => {
            const response = await API.request(false)
                .post('/api/auth')
                .send({
                    username: API.user.username,
                    password: API.password
                });
            expect(response).to.have.status(200);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('userId');
            expect(body).to.have.property('limit');
            expect(body).to.have.property('token');
            expect(body.userId).to.equal(API.user.id);
            assertLastLogEntryValues({
                interface: 'client',
                type: 'login',
                user: API.user.id
            });
            // stocke nouveau token pour ne pas empaler les autres tests
            API.token = body.token;
        });
    });

    describe('GET /api/auth', () => {
        it('Should throw authentication error', async () => {
            const authenticationError = async (url) => {
                const response = await API.request(false)
                    .get(url)
                    .set('Authorization', 'abc123');
                expect(response).to.have.status(401);
                expect(response).to.be.json;
                const { body } = response;
                expect(body).to.be.an('object');
                expect(body).to.have.property('error');
                expect(body).to.have.property('code');
                expect(body.code).to.equal(4010);
            };
            await authenticationError('/api/auth');
            await authenticationError('/api/users');
            await authenticationError('/api/daysoff');
            await authenticationError('/api/configuration');
        });

        it('Should authenticate successfully', async () => {
            const response = await API.request(false)
                .get('/api/auth')
                .set('Authorization', API.token);
            expect(response).to.have.status(200);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('userId');
            expect(body).to.have.property('limit');
            expect(body).to.have.property('token');
            expect(body.userId).to.equal(API.user.id);
        });
    });
});
