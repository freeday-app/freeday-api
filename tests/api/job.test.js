const { expect } = require('chai');
const API = require('../utils/api.js');

let monthlyRecap;

describe('[API] Jobs', () => {
    before(async () => {
        await API.init();
    });

    describe('POST /api/jobs/:name', () => {
        it('Should throw not found error', async () => {
            const job = {
                dayOfMonth: '25',
                enabled: true
            };
            const response = await API.request()
                .post('/api/jobs/fakeJob')
                .send(job);
            expect(response).to.have.status(404);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4040);
        });

        it('Should throw validation error', async () => {
            const jobs = [{
                name: 'monthlyRecap',
                dayOfMonth: 'wrong.format',
                hour: '8',
                enabled: true
            }, {
                name: 'monthlyRecap',
                dayOfMonth: '26',
                hour: '',
                enabled: true
            }, {
                name: 'monthlyRecap',
                dayOfMonth: '32',
                hour: '5',
                enabled: true
            }, {
                name: 'monthlyRecap',
                dayOfMonth: '26',
                hour: '24',
                enabled: true
            }];
            for (const job of jobs) {
                const response = await API.request()
                    .post(`/api/jobs/${job.name}`)
                    .send(job);
                expect(response).to.have.status(400);
                expect(response).to.be.json;
                const { body } = response;
                expect(body).to.be.an('object');
                expect(body).to.have.property('error');
                expect(body).to.have.property('code');
                expect(body.code).to.equal(4000);
            }
        });

        it("Should edit the job's settings", async () => {
            const jobName = 'monthlyRecap';
            const job = {
                enabled: true,
                dayOfMonth: '10'
            };
            const response = await API.request()
                .post(`/api/jobs/${jobName}`)
                .send(job);
            console.log(JSON.stringify(response.body, null, 4));
            expect(response).to.have.status(200);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('name');
            expect(body.name).to.equal(jobName);
            expect(body).to.have.property('enabled');
            expect(body.enabled).to.equal(job.enabled);
            expect(body).to.have.property('dayOfMonth');
            expect(body.dayOfMonth).to.equal(job.dayOfMonth);
            monthlyRecap = body;
        });
    });

    describe('GET /api/jobs/:name', () => {
        it('Should throw not found error', async () => {
            const response = await API.request()
                .get('/api/jobs/fakeJob');
            expect(response).to.have.status(404);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4040);
        });

        it('Should get the job\'s settings', async () => {
            const response = await API.request()
                .get('/api/jobs/monthlyRecap');
            expect(response).to.have.status(200);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('name');
            expect(body.name).to.equal('monthlyRecap');
            expect(body).to.have.property('enabled');
            expect(body.enabled).to.equal(monthlyRecap.enabled);
            expect(body).to.have.property('dayOfMonth');
            expect(body.dayOfMonth).to.equal(monthlyRecap.dayOfMonth);
        });
    });
});
