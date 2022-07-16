const { expect, assert } = require('chai');
const DayJS = require('dayjs');
const Mongoose = require('mongoose');
const API = require('../utils/api.js');
const Models = require('../../src/api/models/index.js');
const { assertLastLogEntryValues } = require('../utils/statslog.js');

const GlobalData = require('./data/global.data.js');
const DefaultConfData = require('./data/defaultConf.data.js')(GlobalData.slackUsers);
const WorkDays01236Data = require('./data/workDays01236.data.js')(GlobalData.slackUsers);

const loadConfig = async (conf) => {
    const response = await API.request()
        .post('/api/configuration')
        .send(conf);
    expect(response).to.have.status(200);
    expect(response).to.be.json;
};

// wrapper for dayoff tests so they can run multiple times for multiple configurations
// tests executions are at the bottom of this file
const runDayoffTests = (Data, cnf = null, deleteAllDaysoffWhenDone = false) => {
    const defaultConf = {
        workDays: [1, 2, 3, 4, 5]
    };
    const conf = cnf || defaultConf;

    const daysoff = [];
    const setDayoff = (id, dt) => {
        daysoff.forEach((dayoff, idx) => {
            if (dayoff.id === id) {
                daysoff[idx] = {
                    ...daysoff[idx],
                    ...dt
                };
            }
        });
    };

    const dayoffTypes = [];
    const dayoffTypesById = {};

    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
    const datePeriods = ['am', 'pm'];

    const assertDayoff = (dayoff, expected = null) => {
        expect(dayoff).to.be.an('object');
        expect(dayoff).to.have.property('id');
        expect(dayoff).to.have.property('count');
        expect(dayoff).to.have.property('start');
        expect(dayoff).to.have.property('end');
        expect(dayoff).to.have.property('startPeriod');
        expect(dayoff).to.have.property('endPeriod');
        expect(dayoff).to.have.property('days');
        expect(dayoff.days).to.be.an('array');
        expect(dayoff).to.have.property('type');
        expect(dayoff.type).to.be.an('object');
        expect(dayoff.type).to.have.property('id');
        expect(dayoff.type).to.have.property('name');
        expect(dayoff.type).to.have.property('enabled');
        expect(dayoff.type).to.have.property('important');
        expect(dayoff).to.have.property('slackUser');
        expect(dayoff.slackUser).to.be.an('object');
        expect(dayoff.slackUser).to.have.property('slackId');
        expect(dayoff.slackUser).to.have.property('avatar');
        expect(dayoff.slackUser).to.have.property('name');
        expect(dayoff.slackUser).to.have.property('locale');
        expect(dayoff.slackUser).to.have.property('deleted');
        expect(dayoff).to.have.property('comment');
        expect(dayoff).to.have.property('canceled');
        expect(dayoff).to.have.property('confirmed');
        if (expected) {
            expect(dayoff.count).to.equal(expected.count);
            expect(
                DayJS(dayoff.start).format('YYYY-MM-DD')
            ).to.equal(
                DayJS(expected.start).format('YYYY-MM-DD')
            );
            expect(
                DayJS(dayoff.end).format('YYYY-MM-DD')
            ).to.equal(
                DayJS(expected.end).format('YYYY-MM-DD')
            );
            expect(dayoff.startPeriod).to.equal(expected.startPeriod);
            expect(dayoff.endPeriod).to.equal(expected.endPeriod);
            expect(dayoff.days.map((d) => DayJS(d).format('YYYY-MM-DD'))).to.have.members(expected.days.map((d) => DayJS(d).format('YYYY-MM-DD')));
            expect(dayoff.type.id).to.have.equal(expected.type.id);
            expect(dayoff.type.name).to.have.equal(expected.type.name);
            expect(dayoff.type.enabled).to.have.equal(expected.type.enabled);
            expect(dayoff.type.important).to.have.equal(expected.type.important);
            expect(dayoff.slackUser.slackId).to.have.equal(expected.slackUser.slackId);
            expect(dayoff.slackUser.avatar).to.have.equal(expected.slackUser.avatar);
            expect(dayoff.slackUser.name).to.have.equal(expected.slackUser.name);
            expect(dayoff.slackUser.email).to.have.equal(expected.slackUser.email);
            expect(dayoff.slackUser.deleted).to.have.equal(expected.slackUser.deleted);
            expect(dayoff.comment).to.equal(expected.comment);
            expect(dayoff.canceled).to.be[expected.canceled ? 'true' : 'false'];
            expect(dayoff.confirmed).to.be[expected.confirmed ? 'true' : 'false'];
            if (expected.cancelReason) {
                expect(dayoff.cancelReason).to.equal(expected.cancelReason);
            }
        } else {
            expect(dayoff.count).to.be.above(0);
            expect(dayoff.start).to.match(dateRegex);
            expect(dayoff.end).to.match(dateRegex);
            expect(dayoff.startPeriod).to.be.oneOf(datePeriods);
            expect(dayoff.endPeriod).to.be.oneOf(datePeriods);
            expect(dayoff.days).to.have.lengthOf.above(0);
            for (const day of dayoff.days) {
                expect(day).to.match(dateRegex);
            }
            assert.isString(dayoff.comment);
            assert.isBoolean(dayoff.canceled);
            assert.isBoolean(dayoff.confirmed);
        }
    };

    // sort daysoff list by slack user name and start date
    const sortDaysoff = (dayoffList, dateOrder = 'asc') => {
        const dateOrderInt = dateOrder === 'desc' ? -1 : 1;
        return dayoffList.sort((a, b) => {
            if (a.slackUser.name > b.slackUser.name) { return 1; }
            if (a.slackUser.name < b.slackUser.name) { return -1; }
            if (a.slackUser.slackId > b.slackUser.slackId) { return 1; }
            if (a.slackUser.slackId < b.slackUser.slackId) { return -1; }
            if (a.start > b.start) { return dateOrderInt * 1; }
            if (a.start < b.start) { return dateOrderInt * -1; }
            if (a.startPeriod > b.startPeriod) { return dateOrderInt * 1; }
            if (a.startPeriod < b.startPeriod) { return dateOrderInt * -1; }
            if (a.id > b.id) { return 1; }
            if (a.id < b.id) { return -1; }
            return 0;
        });
    };

    // gets a dayoff
    const getDayoff = async (id) => {
        const response = await API.request()
            .get(`/api/daysoff/${id}`);
        expect(response).to.have.status(200);
        expect(response).to.be.json;
        return response.body;
    };

    // creates a dayoff
    const createDayoff = async (data, force = false) => {
        const response = await API.request()
            .post('/api/daysoff')
            .send({
                ...(force ? { force: true } : {}),
                ...data
            });
        expect(response).to.have.status(200);
        expect(response).to.be.json;
        assertLastLogEntryValues({
            interface: 'client',
            type: 'createdayoff',
            user: API.user.id,
            slackUser: data.slackUserId
        });
        daysoff.push(response.body);
        return response.body;
    };

    // updates a dayoff
    const updateDayoff = async (id, data, force = false) => {
        const response = await API.request()
            .post(`/api/daysoff/${id}`)
            .send({
                ...(force ? { force: true } : {}),
                ...data
            });
        expect(response).to.have.status(200);
        expect(response).to.be.json;
        assertLastLogEntryValues({
            interface: 'client',
            type: 'editdayoff',
            user: API.user.id,
            slackUser: data.slackUserId
        });
        setDayoff(response.body.id, response.body);
        return response.body;
    };

    // récupère conflits d'une absence
    const getConflicts = async (id) => {
        const response = await API.request()
            .get(`/api/daysoff/${id}/conflicts`);
        expect(response).to.have.status(200);
        expect(response).to.be.json;
        return response.body.conflicts;
    };

    // récupère conflits d'une absence
    const takeAction = async (id, action, postData = {}) => {
        const dayoffId = id || daysoff[0].id;
        let conflicts;
        if (action === 'confirm') {
            conflicts = await getConflicts(dayoffId);
        }
        const response = await API.request()
            .put(`/api/daysoff/${dayoffId}/${action}`)
            .send(postData);
        expect(response).to.have.status(200);
        expect(response).to.be.json;
        assertLastLogEntryValues({
            interface: 'client',
            type: action,
            user: API.user.id,
            slackUser: postData.slackUserId
        });
        const { body } = response;
        assertDayoff(body);
        const expected = {
            ...body,
            confirmed: action === 'confirm',
            canceled: action === 'cancel'
        };
        if (action === 'cancel' && postData.cancelReason) {
            expected.cancelReason = postData.cancelReason;
        } else if (action !== 'cancel') {
            expected.cancelReason = '';
        }
        setDayoff(dayoffId, id ? body : {
            confirmed: action === 'confirm',
            canceled: action === 'cancel'
        });
        if (conflicts) {
            for (const conflict of conflicts) {
                setDayoff(conflict.id, {
                    confirmed: false,
                    canceled: true
                });
            }
        }
        return body;
    };

    describe('Pre-test operations', () => {
        it('Should create Slack users for the tests', async () => {
            await Data.createSlackUsers();
        });
        it('Should create dayoff types for the tests', async () => {
            for (const type of Data.dayoffTypes) {
                const response = await API.request()
                    .post('/api/daysoff/types')
                    .send({
                        ...type,
                        enabled: true
                    });
                expect(response).to.have.status(200);
                expect(response).to.be.json;
                const { body } = response;
                dayoffTypes.push(body);
                dayoffTypesById[body.id] = body;
            }
        });
        it('Should set configuration', async () => {
            await loadConfig(conf);
        });
    });

    describe('POST /api/daysoff', () => {
        it('Should throw validation error', async () => {
            const response = await API.request()
                .post('/api/daysoff')
                .send({
                    type: dayoffTypes[0].id,
                    slackUserId: 'UGJ7AVX32',
                    start: '2018-10-24',
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

        it('Should throw no work days error', async () => {
            const response = await API.request()
                .post('/api/daysoff')
                .send({
                    ...Data.noWorkDay,
                    type: dayoffTypes[1].id
                });
            expect(response).to.have.status(400);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4001);
        });

        it('Should throw end before start error', async () => {
            for (const dt of Data.endBeforeStart) {
                const response = await API.request()
                    .post('/api/daysoff')
                    .send({
                        ...dt,
                        type: dayoffTypes[0].id
                    });
                expect(response).to.have.status(400);
                expect(response).to.be.json;
                const { body } = response;
                expect(body).to.be.an('object');
                expect(body).to.have.property('error');
                expect(body).to.have.property('code');
                expect(body.code).to.equal(4002);
            }
        });

        it('Should throw conflict error', async () => {
            for (const dt of Data.conflict) {
                const baseDayoff = {
                    type: dayoffTypes[0].id,
                    ...dt.base
                };
                await createDayoff(baseDayoff, true);
                for (const conflict of dt.conflicts) {
                    const response = await API.request()
                        .post('/api/daysoff')
                        .send({
                            ...conflict,
                            type: dayoffTypes[0].id
                        });
                    expect(response).to.have.status(409);
                    expect(response).to.be.json;
                    const { body } = response;
                    expect(body).to.be.an('object');
                    expect(body).to.have.property('error');
                    expect(body).to.have.property('code');
                    expect(body).to.have.property('data');
                    expect(body.code).to.equal(4090);
                    expect(body.data).to.be.an('array');
                    expect(body.data).to.have.lengthOf(1);
                    assertDayoff(body.data[0], {
                        type: {
                            ...body.data[0].type,
                            id: dayoffTypes[0].id
                        },
                        ...body.data[0],
                        ...dt.base
                    });
                }
            }
        });

        it('Should create daysoff', async () => {
            let dayoffTypeIdx = 0;
            for (const dt of Data.create) {
                if (dayoffTypeIdx > dayoffTypes.length - 1) {
                    dayoffTypeIdx = 0;
                }
                const dayoff = await createDayoff({
                    ...dt.post,
                    type: dayoffTypes[dayoffTypeIdx].id
                });
                assertDayoff(dayoff, {
                    ...dt.expected,
                    type: dayoffTypes[dayoffTypeIdx]
                });
                dayoffTypeIdx += 1;
            }
        });

        it('Should force create daysoff and ignore conflicts', async () => {
            for (const dt of Data.conflict) {
                await createDayoff({
                    type: dayoffTypes[0].id,
                    ...dt.base
                }, true);
                for (const conflict of dt.conflicts) {
                    await createDayoff({
                        ...conflict,
                        type: dayoffTypes[0].id
                    }, true);
                }
            }
        });
    });

    describe('GET /api/daysoff', () => {
        it('Should list daysoff', async () => {
            const response = await API.request()
                .get('/api/daysoff');
            expect(response).to.have.status(200);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('daysoff');
            expect(body.daysoff).to.be.an('array');
            expect(body.daysoff).to.have.lengthOf.above(0);
            expect(body.daysoff).to.have.lengthOf(daysoff.length);
            const sortedDaysoff = sortDaysoff(daysoff);
            sortedDaysoff.forEach((_d, idx) => {
                assertDayoff(body.daysoff[idx], {
                    ...sortedDaysoff[idx],
                    type: dayoffTypesById[
                        body.daysoff[idx].type.id
                    ]
                });
            });
        });

        it('Should filter daysoff', async () => {
            for (const i of [0, 2, 4]) {
                await takeAction(daysoff[i].id, 'confirm', {
                    force: true
                });
            }
            const doFilter = async (param, val, filterFct) => {
                const params = Array.isArray(param) ? param : [param];
                const vals = Array.isArray(val) ? val : [val];
                const filterFcts = Array.isArray(filterFct) ? filterFct : [filterFct];
                const query = params.map((p, i) => `${p}=${vals[i]}`).join('&');

                const response = await API.request()
                    .get(`/api/daysoff?${query}`);
                expect(response).to.have.status(200);
                expect(response).to.be.json;
                const { body } = response;
                expect(body).to.be.an('object');
                expect(body).to.have.property('daysoff');
                expect(body.daysoff).to.be.an('array');
                let filteredDaysoff = sortDaysoff(daysoff);
                for (const f of filterFcts) {
                    if (f) {
                        filteredDaysoff = f(filteredDaysoff);
                    }
                }
                expect(body.daysoff).to.have.lengthOf.above(0);
                expect(body.daysoff).to.have.lengthOf(filteredDaysoff.length);
                filteredDaysoff.forEach((_d, idx) => {
                    assertDayoff(body.daysoff[idx], {
                        ...filteredDaysoff[idx],
                        type: dayoffTypesById[
                            body.daysoff[idx].type.id
                        ]
                    });
                });
            };
            for (const parameter of Object.keys(Data.filter)) {
                const { value, fct } = Data.filter[parameter];
                await doFilter(parameter, value, fct);
            }
            await doFilter([
                'start',
                'end'
            ], [
                Data.filter.start.value,
                Data.filter.end.value
            ], [
                Data.filter.start.fct,
                Data.filter.end.fct
            ]);
            await doFilter([
                'start',
                'slackUser'
            ], [
                Data.filter.start.value,
                Data.filter.slackUser.value
            ], [
                Data.filter.start.fct,
                Data.filter.slackUser.fct
            ]);
            await doFilter([
                'start',
                'order'
            ], [
                Data.filter.start.value,
                'asc'
            ], [
                Data.filter.start.fct,
                (ds) => sortDaysoff(ds, 'asc')
            ]);
            await doFilter([
                'start',
                'order'
            ], [
                Data.filter.start.value,
                'desc'
            ], [
                Data.filter.start.fct,
                (ds) => sortDaysoff(ds, 'desc')
            ]);
            await doFilter(
                'type',
                dayoffTypes[0].id,
                (ds) => ds.filter((d) => d.type.id === dayoffTypes[0].id)
            );
            await doFilter([
                'start',
                'type'
            ], [
                Data.filter.start.value,
                dayoffTypes[0].id
            ], [
                Data.filter.start.fct,
                (ds) => ds.filter((d) => d.type.id === dayoffTypes[0].id)
            ]);
        });

        it('Should throw pagination error', async () => {
            const response = await API.request()
                .get('/api/daysoff?page=999');
            expect(response).to.have.status(400);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4003);
        });

        it('Should paginate daysoff', async () => {
            const paginate = async (page, limit = null) => {
                const paginatedDaysoff = page !== 'all'
                    ? sortDaysoff(daysoff).slice((page - 1) * limit, page * limit)
                    : sortDaysoff(daysoff);
                const limitParam = limit ? `&limit=${limit}` : '';
                const response = await API.request()
                    .get(`/api/daysoff?page=${page}${limitParam}`);
                expect(response).to.have.status(200);
                expect(response).to.be.json;
                const { body } = response;
                if (page !== 'all') {
                    expect(body.page).to.be.an('object');
                    expect(body.page).to.have.property('current');
                    expect(body.page).to.have.property('total');
                    expect(body.page.current).to.equal(page);
                    expect(body.page.total).to.equal(
                        Math.ceil(daysoff.length / limit)
                    );
                } else {
                    expect(body).to.not.have.property('page');
                }
                expect(body).to.be.an('object');
                expect(body).to.have.property('daysoff');
                expect(body.daysoff).to.be.an('array');
                expect(body.daysoff).to.have.lengthOf.above(0);
                if (limit) {
                    expect(body.daysoff).to.have.lengthOf(limit);
                }
                expect(body.daysoff.length).to.equal(paginatedDaysoff.length);
                paginatedDaysoff.forEach((_d, idx) => {
                    assertDayoff(body.daysoff[idx], {
                        ...paginatedDaysoff[idx],
                        type: dayoffTypesById[
                            body.daysoff[idx].type.id
                        ]
                    });
                });
            };
            await paginate('all');
            for (const p of Data.pages) {
                await paginate(p.page, p.limit);
            }
        });
    });

    describe('GET /api/daysoff/:id', () => {
        it('Should throw validation error', async () => {
            const response = await API.request()
                .get('/api/daysoff/InvalidMongoId');
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
                .get(`/api/daysoff/${unknownMongoId}`);
            expect(response).to.have.status(404);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4040);
        });

        it('Should get daysoff information', async () => {
            const body = await getDayoff(daysoff[0].id);
            assertDayoff(body, {
                ...daysoff[0],
                type: dayoffTypesById[
                    body.type.id
                ]
            });
        });
    });

    describe('POST /api/daysoff/:id', () => {
        it('Should throw not found error', async () => {
            const unknownMongoId = Mongoose.Types.ObjectId();
            const blankEdit = JSON.parse(JSON.stringify(Data.blank));
            delete blankEdit.slackUserId;
            const response = await API.request()
                .post(`/api/daysoff/${unknownMongoId}`)
                .send(blankEdit);
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
                .post(`/api/daysoff/${daysoff[0].id}`)
                .send(Data.validationError);
            expect(response).to.have.status(400);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4000);
        });

        it('Should throw conflict error', async () => {
            for (const dt of Data.conflict) {
                const baseDayoff = {
                    type: dayoffTypes[0].id,
                    ...dt.base
                };
                await createDayoff(baseDayoff, true);
                const dayoffIds = [];
                for (const conflict of dt.conflicts) {
                    const body = await createDayoff({
                        ...conflict,
                        type: dayoffTypes[0].id
                    }, true);
                    dayoffIds.push(body.id);
                }
                for (const dayoffId of dayoffIds) {
                    const response = await API.request()
                        .post(`/api/daysoff/${dayoffId}`)
                        .send({ type: dayoffTypes[1].id });
                    expect(response).to.have.status(409);
                    expect(response).to.be.json;
                    const { body } = response;
                    expect(body).to.be.an('object');
                    expect(body).to.have.property('error');
                    expect(body).to.have.property('code');
                    expect(body).to.have.property('data');
                    expect(body.code).to.equal(4090);
                    expect(body.data).to.be.an('array');
                    expect(body.data).to.have.length.above(0);
                }
            }
        });

        it('Should edit dayoff', async () => {
            const body = await updateDayoff(daysoff[0].id, {
                ...Data.edit.post,
                type: dayoffTypes[3].id
            });
            assertDayoff(body, {
                ...Data.edit.expected,
                type: dayoffTypes[3]
            });
            daysoff[0] = body;
        });

        it('Should reset status after dayoff has been edited', async () => {
            const editDayoff = async () => {
                const comment = `Test edit ${Date.now()}`;
                const responseEdit = await API.request()
                    .post(`/api/daysoff/${daysoff[0].id}`)
                    .send({ comment });
                expect(responseEdit).to.have.status(200);
                expect(responseEdit).to.be.json;
                const bodyEdit = responseEdit.body;
                expect(bodyEdit.confirmed).to.be.false;
                expect(bodyEdit.canceled).to.be.false;
                daysoff[0].confirmed = false;
                daysoff[0].canceled = false;
                daysoff[0].comment = comment;
            };
            await takeAction(null, 'confirm');
            await editDayoff();
            await takeAction(null, 'cancel');
            await editDayoff();
        });

        it('Should force edit daysoff ignoring conflicts', async () => {
            for (const dt of Data.conflict) {
                const baseDayoff = {
                    type: dayoffTypes[0].id,
                    ...dt.base
                };
                await createDayoff(baseDayoff, true);
                const dayoffIds = [];
                for (const conflict of dt.conflicts) {
                    const createBody = await createDayoff({
                        ...conflict,
                        type: dayoffTypes[0].id
                    }, true);
                    dayoffIds.push(createBody.id);
                }
                for (const dayoffId of dayoffIds) {
                    await updateDayoff(dayoffId, {
                        type: dayoffTypes[1].id
                    }, true);
                }
            }
        });
    });

    describe('GET /api/daysoff/:id/conflicts', () => {
        it('Should throw validation error', async () => {
            const response = await API.request()
                .get('/api/daysoff/InvalidMongoId/conflicts');
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
                .get(`/api/daysoff/${unknownMongoId}/conflicts`);
            expect(response).to.have.status(404);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4040);
        });

        it('Should get dayoff conflicts', async () => {
            for (const dt of Data.conflict) {
                const baseDayoff = await createDayoff({
                    type: dayoffTypes[0].id,
                    ...dt.base
                }, true);
                const conflictIds = {};
                for (const conflict of dt.conflicts) {
                    const body = await createDayoff({
                        ...conflict,
                        type: dayoffTypes[0].id
                    }, true);
                    conflictIds[body.id] = false;
                }
                const conflicts = await getConflicts(baseDayoff.id);
                expect(conflicts).to.have.length.above(0);
                for (const conflict of conflicts) {
                    if (conflictIds[conflict.id] === false) {
                        conflictIds[conflict.id] = true;
                    }
                }
                expect(
                    Object.values(conflictIds).filter((c) => !c)
                ).to.have.lengthOf(0);
            }
        });
    });

    describe('PUT /api/daysoff/:id/:action', () => {
        it('Should throw not found error', async () => {
            const notFoundAction = async (action) => {
                const unknownMongoId = Mongoose.Types.ObjectId();
                const response = await API.request()
                    .put(`/api/daysoff/${unknownMongoId}/${action}`);
                expect(response).to.have.status(404);
                expect(response).to.be.json;
                const { body } = response;
                expect(body).to.be.an('object');
                expect(body).to.have.property('error');
                expect(body).to.have.property('code');
                expect(body.code).to.equal(4040);
            };
            await notFoundAction('confirm');
            await notFoundAction('cancel');
            await notFoundAction('reset');
        });

        it('Should change dayoff status', async () => {
            await takeAction(null, 'confirm');
            await takeAction(null, 'cancel');
            await takeAction(null, 'reset');
            await takeAction(null, 'confirm');
        });

        it('Should add a reason for cancellation', async () => {
            await takeAction(null, 'cancel', {
                cancelReason: 'cancellation reason'
            });
        });

        it('Should throw conflict error', async () => {
            for (const dt of Data.conflict) {
                await createDayoff({
                    type: dayoffTypes[0].id,
                    ...dt.base
                }, true);
                for (const conflict of dt.conflicts) {
                    const dayoff = await createDayoff({
                        type: dayoffTypes[0].id,
                        ...conflict
                    }, true);
                    const response = await API.request()
                        .put(`/api/daysoff/${dayoff.id}/confirm`);
                    expect(response).to.have.status(409);
                    expect(response).to.be.json;
                    assertLastLogEntryValues({
                        interface: 'client',
                        type: 'confirm',
                        user: API.user.id,
                        slackUser: dayoff.slackUserId
                    });
                    const { body } = response;
                    for (const conflictDayoff of body.data) {
                        expect(conflictDayoff.id).to.not.equal(dayoff.id);
                        assertDayoff(conflictDayoff);
                    }
                }
            }
        });

        it('Should handle conflicts when forced confirm', async () => {
            for (const dt of Data.conflict) {
                const baseDayoff = await createDayoff({
                    type: dayoffTypes[0].id,
                    ...dt.base
                }, true);
                for (const conflict of dt.conflicts) {
                    const dayoff = await createDayoff({
                        type: dayoffTypes[0].id,
                        ...conflict
                    }, true);
                    const conflicts = await getConflicts(dayoff.id);
                    const confirmDayoff = await takeAction(dayoff.id, 'confirm', {
                        force: true
                    });
                    assertDayoff(confirmDayoff, {
                        ...dayoff,
                        confirmed: true,
                        canceled: false
                    });
                    for (const conflictDayoff of conflicts) {
                        const canceledDayoff = await getDayoff(conflictDayoff.id);
                        expect(canceledDayoff.confirmed).to.be.equal(false);
                        expect(canceledDayoff.canceled).to.be.equal(true);
                    }
                    await takeAction(baseDayoff.id, 'reset');
                    await takeAction(dayoff.id, 'reset');
                }
            }
        });
    });

    describe('DELETE /api/daysoff/:id', () => {
        it('Should throw not found error', async () => {
            const unknownMongoId = Mongoose.Types.ObjectId();
            const response = await API.request()
                .delete(`/api/daysoff/${unknownMongoId}`);
            expect(response).to.have.status(404);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4040);
        });

        it('Should delete a dayoff', async () => {
            const responseDelete = await API.request()
                .delete(`/api/daysoff/${daysoff[0].id}`);
            expect(responseDelete).to.have.status(200);
            expect(responseDelete).to.be.json;
            const bodyDelete = responseDelete.body;
            expect(bodyDelete).to.be.an('object');
            const responseGet = await API.request()
                .get(`/api/daysoff/${daysoff[0].id}`);
            expect(responseGet).to.have.status(404);
            expect(responseGet).to.be.json;
            const bodyGet = responseGet.body;
            expect(bodyGet).to.be.an('object');
            expect(bodyGet).to.have.property('error');
            daysoff.shift();
        });
    });

    describe('Post-test operations', () => {
        it('Should delete test dayoff types', async () => {
            for (const type of dayoffTypes) {
                const response = await API.request()
                    .delete(`/api/daysoff/types/${type.id}`);
                expect(response).to.have.status(200);
            }
        });
        it('Should restore configuration to default', async () => {
            await loadConfig(defaultConf);
        });
        if (deleteAllDaysoffWhenDone) {
            it('Should delete any dayoff in database', async () => {
                await Models.Dayoff.deleteMany({});
            });
        }
    });
};

// runs dayoff tests for all configurations
describe('[API] Daysoff', () => {
    before(async () => {
        await API.init();
    });

    describe('Should test daysoff with workDays01236 configuration', () => {
        runDayoffTests({
            ...GlobalData,
            ...WorkDays01236Data
        }, {
            workDays: [0, 1, 2, 3, 6]
        }, true);
    });

    describe('Should test daysoff with the default configuration', () => {
        runDayoffTests({
            ...GlobalData,
            ...DefaultConfData
        });
    });
});
