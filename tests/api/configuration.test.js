const { expect } = require('chai');

const API = require('../utils/api.js');
const { assertLastLogEntryValues } = require('../utils/statslog.js');

const randomBase64Image = 'data:image/gif;base64,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';

const getConf = async (expect200 = true) => {
    const response = await API.request()
        .get('/api/configuration');
    if (expect200) {
        expect(response).to.have.status(200);
    }
    return response;
};

const setConf = async (data, expect200 = true) => {
    const response = await API.request()
        .post('/api/configuration')
        .send(data);
    if (expect200) {
        expect(response).to.have.status(200);
        assertLastLogEntryValues({
            interface: 'client',
            type: 'editconfig',
            user: API.user.id
        });
    }
    return response;
};

const assertConf = (data, expected = null) => {
    expect(data).to.be.an('object');
    expect(data).to.have.property('brandingName');
    expect(data).to.have.property('brandingLogo');
    expect(data).to.have.property('slackReferrer');
    expect(data).to.have.property('workDays');
    expect(data.workDays).to.be.an('array');
    expect(data.workDays).to.have.length.above(0);
    if (expected) {
        expect(data.brandingName).to.equal(expected.brandingName);
        expect(data.brandingLogo).to.equal(expected.brandingLogo);
        expect(data.slackReferrer).to.equal(expected.slackReferrer);
        expect(data.workDays).to.have.ordered.members(expected.workDays);
    }
};

describe('[API] Configuration', () => {
    before(async () => {
        await API.init();
    });

    describe('GET /api/configuration', () => {
        it('Should get configuration', async () => {
            const { body } = await getConf();
            assertConf(body);
        });
    });

    describe('POST /api/configuration', () => {
        it('Should throw validation error', async () => {
            const data = [{
                wrong: 'field'
            }, {
                workDays: [12, 13]
            }, {
                workDays: [1, 7],
                wrong: 'field'
            }, {
                brandingLogo: 'abcde'
            }];
            for (const dt of data) {
                const response = await setConf(dt, false);
                const { body } = response;
                expect(body).to.be.an('object');
                expect(body).to.have.property('error');
                expect(body).to.have.property('code');
                expect(body.code).to.equal(4000);
            }
        });

        it('Should update configuration', async () => {
            const data = [{
                post: {
                    workDays: [0, 1, 6, 2, 3, 6, 2],
                    slackReferrer: 'TGJ7ACX3Y'
                },
                expected: {
                    brandingName: null,
                    brandingLogo: null,
                    workDays: [0, 1, 2, 3, 6],
                    slackReferrer: 'TGJ7ACX3Y'
                }
            }, {
                post: {
                    workDays: [0, 3, 3, 5],
                    slackReferrer: 'TCG6ARX53'
                },
                expected: {
                    brandingName: null,
                    brandingLogo: null,
                    workDays: [0, 3, 5],
                    slackReferrer: 'TCG6ARX53'
                }
            }, {
                post: {
                    workDays: [1, 2, 3, 4, 5],
                    slackReferrer: null
                },
                expected: {
                    brandingName: null,
                    brandingLogo: null,
                    workDays: [1, 2, 3, 4, 5],
                    slackReferrer: null
                }
            }, {
                post: {
                    brandingName: null,
                    brandingLogo: null,
                    workDays: [1, 2, 3, 4, 5],
                    slackReferrer: null
                },
                expected: {
                    brandingName: null,
                    brandingLogo: null,
                    workDays: [1, 2, 3, 4, 5],
                    slackReferrer: null
                }
            }, {
                post: {
                    brandingName: 'Lambda',
                    brandingLogo: randomBase64Image,
                    workDays: [1, 2, 3, 4, 5],
                    slackReferrer: null
                },
                expected: {
                    brandingName: 'Lambda',
                    brandingLogo: randomBase64Image,
                    workDays: [1, 2, 3, 4, 5],
                    slackReferrer: null
                }
            }];
            for (const dt of data) {
                const saveResponse = await setConf(dt.post);
                assertConf(saveResponse.body, dt.expected);
                const getResponse = await getConf();
                assertConf(getResponse.body, dt.expected);
            }
        });
    });

    it('Should not update configuration', async () => {
        const data = [{
            post: {
                slackReferrer: 'TOHA2EFF6'
            },
            expected: {
                code: 4005
            }
        }, {
            post: {
                workDays: [0, 3, 3, 5],
                slackReferrer: 'TOHA2EFF6'
            },
            expected: {
                code: 4005
            }
        }, {
            post: {
                brandingName: null,
                brandingLogo: null,
                workDays: [1, 2, 3, 4, 5],
                slackReferrer: 'TOHA2EFF6'
            },
            expected: {
                code: 4005
            }
        }, {
            post: {
                brandingName: 'Lambda',
                brandingLogo: randomBase64Image,
                workDays: [1, 2, 3, 4, 5],
                slackReferrer: 'TOHA2EFF6'
            },
            expected: {
                code: 4005
            }
        }];
        for (const dt of data) {
            const saveResponse = await setConf(dt.post, false);
            const { body } = saveResponse;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(dt.expected.code);
        }
    });

    describe('GET /api/configuration/public', () => {
        it('Should get public configuration', async () => {
            const publicConf = {
                brandingName: 'Test company',
                brandingLogo: randomBase64Image
            };
            await API.request()
                .post('/api/configuration')
                .send(publicConf);
            const publicConfResponse = await API.request(false, true)
                .get('/api/configuration/public');
            const { body } = publicConfResponse;
            expect(body).to.be.an('object');
            expect(body).to.have.property('brandingName');
            expect(body).to.have.property('brandingLogo');
            expect(body.brandingName).to.equal(publicConf.brandingName);
            expect(body.brandingLogo).to.equal(publicConf.brandingLogo);
        });
    });
});
