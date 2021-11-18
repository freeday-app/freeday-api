const Mongoose = require('mongoose');
const { expect } = require('chai');
const API = require('../utils/api.js');
const { assertLastLogEntryValues } = require('../utils/statslog.js');
const Data = require('./data/global.data.js');

const dayoffTypes = [];

const createDayoffType = async (data) => {
    const response = await API.request()
        .post('/api/daysoff/types')
        .send(data);
    expect(response).to.have.status(200);
    expect(response).to.be.json;
    assertLastLogEntryValues({
        interface: 'client',
        type: 'adddayofftype',
        user: API.user.id
    });
    const { body } = response;
    dayoffTypes.push(body);
    return body;
};

const updateDayoffType = async (id, data) => {
    const response = await API.request()
        .post(`/api/daysoff/types/${id}`)
        .send(data);
    expect(response).to.have.status(200);
    expect(response).to.be.json;
    assertLastLogEntryValues({
        interface: 'client',
        type: 'adddayofftype',
        user: API.user.id
    });
    const { body } = response;
    for (let i = 0; i < dayoffTypes.length; i += 1) {
        if (dayoffTypes[i].id === body.id) {
            dayoffTypes[i] = body;
        }
    }
    return body;
};

const assertDayoffType = (data, expected) => {
    expect(data).to.be.an('object');
    expect(data).to.have.property('id');
    expect(data).to.have.property('name');
    expect(data).to.have.property('emoji');
    expect(data).to.have.property('enabled');
    expect(data).to.have.property('displayed');
    expect(data).to.have.property('important');
    if (expected.id) {
        expect(data.id).to.have.equal(expected.id);
    }
    expect(data.name).to.have.equal(expected.name);
    expect(data.emoji).to.have.equal(expected.emoji);
    expect(data.enabled).to.have.equal(expected.enabled);
    expect(data.displayed).to.have.equal(expected.displayed);
    expect(data.important).to.have.equal(expected.important);
};

// récupère la liste de toutes les absences
// et compare leur type avec le type donné
const assertDaysoffData = async (dayoffType) => {
    const response = await API.request()
        .get(`/api/daysoff?type=${dayoffType.id}`);
    expect(response).to.have.status(200);
    const { body } = response;
    expect(body).to.be.an('object');
    for (const dayoff of body.daysoff) {
        assertDayoffType(dayoff.type, dayoffType);
    }
};

describe('[API] Dayoff types', () => {
    before(async () => {
        await API.init();
    });

    before(async () => {
        const response = await API.request()
            .get('/api/daysoff/types');
        expect(response).to.have.status(200);
        expect(response).to.be.json;
        const { dayoffTypes: list } = response.body;
        dayoffTypes.push(...list);
    });

    describe('POST /api/daysoff/types', () => {
        it('Should throw validation error', async () => {
            const response = await API.request()
                .post('/api/daysoff/types')
                .send({
                    name: 'Some type',
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

        it('Should throw validation error for type name', async () => {
            const response = await API.request()
                .post('/api/daysoff/types')
                .send({
                    name: 'a string of more than 75 chars, a string of more than 75 chars, a string of more than 75 chars',
                    emoji: null,
                    enabled: true,
                    displayed: true,
                    important: false
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
            await createDayoffType({
                name: 'Type with same name'
            });
            const response = await API.request()
                .post('/api/daysoff/types')
                .send({
                    name: 'type with Same name'
                });
            expect(response).to.have.status(409);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4090);
        });

        it('Should create a dayoff type', async () => {
            for (let i = 0; i < Data.dayoffTypes.length; i += 1) {
                const data = Data.dayoffTypes[i];
                const body = await createDayoffType(data);
                assertDayoffType(body, {
                    emoji: null,
                    enabled: true,
                    displayed: true,
                    important: false,
                    ...data
                });
            }
        });
    });

    describe('POST /api/daysoff/types/:id', () => {
        it('Should throw not found error', async () => {
            const unknownMongoId = Mongoose.Types.ObjectId();
            const response = await API.request()
                .post(`/api/daysoff/types/${unknownMongoId}`)
                .send({
                    name: 'Test'
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
                .post(`/api/daysoff/types/${dayoffTypes[0].id}`)
                .send({
                    name: 'Blah',
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

        it('Should throw validation error for type name', async () => {
            const response = await API.request()
                .post(`/api/daysoff/types/${dayoffTypes[0].id}`)
                .send({
                    name: 'a string of more than 75 chars, a string of more than 75 chars, a string of more than 75 chars',
                    emoji: null,
                    enabled: true,
                    displayed: true,
                    important: false
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
            await createDayoffType({
                name: 'Type with Same Name for Edit'
            });
            const dayoffType = await createDayoffType({
                name: 'Some other random type'
            });
            const response = await API.request()
                .post(`/api/daysoff/types/${dayoffType.id}`)
                .send({
                    name: 'type WITH same name FOR edit'
                });
            expect(response).to.have.status(409);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4090);
        });

        it('Should edit dayoff type', async () => {
            const editData = [{
                name: 'Random name 1',
                emoji: 'no_mouth'
            }, {
                name: 'Random name 2',
                emoji: null,
                important: true
            }, {
                enabled: true,
                displayed: true,
                important: false
            }, {
                enabled: false,
                displayed: false
            }];
            for (let i = 0; i < editData.length; i += 1) {
                const dayoffType = dayoffTypes[i];
                const post = editData[i];
                await assertDaysoffData(dayoffType);
                const body = await updateDayoffType(dayoffType.id, post);
                assertDayoffType(body, {
                    ...dayoffType,
                    ...post
                });
                await assertDaysoffData(body);
            }
        });
    });

    describe('GET /api/daysoff/types', () => {
        it('Should list dayoff types', async () => {
            const dayoffTypesById = {};
            for (const dt of dayoffTypes) {
                dayoffTypesById[dt.id] = dt;
            }
            const response = await API.request()
                .get('/api/daysoff/types');
            expect(response).to.have.status(200);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('dayoffTypes');
            expect(body.dayoffTypes).to.be.an('array');
            const bodyDayoffTypesById = {};
            for (const bdt of body.dayoffTypes) {
                bodyDayoffTypesById[bdt.id] = bdt;
            }
            expect(Object.keys(bodyDayoffTypesById)).to.have.lengthOf(
                dayoffTypes.length
            );
            for (const dayoffTypeId of Object.keys(bodyDayoffTypesById)) {
                assertDayoffType(
                    bodyDayoffTypesById[dayoffTypeId],
                    dayoffTypesById[dayoffTypeId]
                );
            }
        });

        it('Should filter dayoff types', async () => {
            const clonedDayoffTypes = JSON.parse(
                JSON.stringify(dayoffTypes)
            );
            const filterDayoffTypes = async (filter) => {
                const filteredDayoffTypesById = {};
                for (const dt of clonedDayoffTypes) {
                    filteredDayoffTypesById[dt.id] = dt;
                }
                const params = [];
                for (const key of Object.keys(filter)) {
                    const val = filter[key];
                    let paramVal = val;
                    if (typeof val === 'boolean') {
                        paramVal = val ? 'true' : 'false';
                    }
                    params.push(`${key}=${paramVal}`);
                    for (const id of Object.keys(filteredDayoffTypesById)) {
                        if (filteredDayoffTypesById[id][key] !== val) {
                            delete filteredDayoffTypesById[id];
                        }
                    }
                }
                const response = await API.request()
                    .get(`/api/daysoff/types?${params.join('&')}`);
                expect(response).to.have.status(200);
                expect(response).to.be.json;
                const { body } = response;
                expect(body).to.be.an('object');
                expect(body).to.have.property('dayoffTypes');
                expect(body.dayoffTypes).to.be.an('array');
                const bodyDayoffTypesById = {};
                for (const bdt of body.dayoffTypes) {
                    bodyDayoffTypesById[bdt.id] = bdt;
                }
                expect(Object.keys(bodyDayoffTypesById)).to.have.lengthOf(
                    Object.keys(filteredDayoffTypesById).length
                );
                for (const dayoffTypeId of Object.keys(bodyDayoffTypesById)) {
                    assertDayoffType(
                        bodyDayoffTypesById[dayoffTypeId],
                        filteredDayoffTypesById[dayoffTypeId]
                    );
                }
            };
            await filterDayoffTypes({
                enabled: true,
                displayed: true
            });
            await filterDayoffTypes({
                enabled: false,
                displayed: false
            });
            await filterDayoffTypes({
                important: true
            });
            await filterDayoffTypes({
                important: false
            });
            await filterDayoffTypes({
                enabled: true,
                displayed: false,
                important: false
            });
            await filterDayoffTypes({
                enabled: false,
                displayed: true,
                important: true
            });
            await filterDayoffTypes({
                enabled: true,
                important: true
            });
            await filterDayoffTypes({
                enabled: false,
                important: false
            });
        });
    });

    describe('GET /api/daysoff/types/:id', () => {
        it('Should throw validation error', async () => {
            const response = await API.request()
                .get('/api/daysoff/types/InvalidMongoId');
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
                .get(`/api/daysoff/types/${unknownMongoId}`);
            expect(response).to.have.status(404);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4040);
        });

        it('Should get target dayoff type information', async () => {
            const dt = dayoffTypes[0];
            const response = await API.request()
                .get(`/api/daysoff/types/${dt.id}`);
            expect(response).to.have.status(200);
            expect(response).to.be.json;
            const { body } = response;
            assertDayoffType(body, dt);
        });
    });
});
