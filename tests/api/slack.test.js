const { expect } = require('chai');
const API = require('../utils/api.js');
const { assertLastLogEntryValues } = require('../utils/statslog.js');
const SlackAuthController = require('../../src/api/controllers/slackAuth.js');
const SlackSDK = require('../../src/bot/utils/sdk.js');
const Data = require('./data/global.data.js');

const slackUsersById = {};
for (const user of Data.slackUsers) {
    slackUsersById[user.slackId] = user;
}

const slackChannelsById = {};
for (const channel of Data.slackChannels) {
    slackChannelsById[channel.slackId] = channel;
}

const assertSlackUser = (data, expected) => {
    expect(data).to.be.an('object');
    expect(data).to.have.property('slackId');
    expect(data).to.have.property('name');
    expect(data).to.have.property('avatar');
    expect(data).to.have.property('locale');
    expect(data).to.have.property('deleted');
    expect(data.slackId).to.equal(expected.slackId);
    expect(data.name).to.equal(expected.name);
    expect(data.avatar).to.equal(expected.avatar);
    expect(data.locale).to.equal(expected.locale);
    expect(data.deleted).to.equal(expected.deleted);
};

const assertSlackChannel = (data, expected) => {
    expect(data).to.be.an('object');
    expect(data).to.have.property('slackId');
    expect(data).to.have.property('name');
    expect(data).to.have.property('isChannel');
    expect(data).to.have.property('isGroup');
    expect(data).to.have.property('isIm');
    expect(data).to.have.property('isMpIm');
    expect(data).to.have.property('isMember');
    expect(data).to.have.property('isPrivate');
    expect(data).to.have.property('archived');
    expect(data.slackId).to.equal(expected.slackId);
    expect(data.name).to.equal(expected.name);
    expect(data.isChannel).to.equal(expected.isChannel);
    expect(data.isGroup).to.equal(expected.isGroup);
    expect(data.isIm).to.equal(expected.isIm);
    expect(data.isMpIm).to.equal(expected.isMpIm);
    expect(data.isMember).to.equal(expected.isMember);
    expect(data.isPrivate).to.equal(expected.isPrivate);
    expect(data.archived).to.equal(expected.archived);
};

const countAccessibleChannels = (channels) => {
    let count = 0;
    for (const channel of channels) {
        if (channel.isMember) {
            count += 1;
        }
    }
    return count;
};

describe('[API] Slack', () => {
    before(async () => {
        await API.init();
    });

    describe('Pre-test operations', () => {
        it('Should create Slack users and channels', async () => {
            await Data.createSlackUsers();
            await Data.createSlackChannels();
        });
    });

    describe('GET /api/slack/users', () => {
        it('Should list Slack users', async () => {
            const response = await API.request()
                .get('/api/slack/users');
            expect(response).to.have.status(200);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('slackUsers');
            expect(body.slackUsers).to.be.an('array');
            expect(body.slackUsers).to.have.lengthOf(
                Data.slackUsers.length
            );
            const bodySlackUsersById = {};
            for (const bodySlackUser of body.slackUsers) {
                bodySlackUsersById[bodySlackUser.slackId] = bodySlackUser;
            }
            for (const slackUser of Data.slackUsers) {
                assertSlackUser(
                    bodySlackUsersById[slackUser.slackId],
                    slackUser
                );
            }
        });

        it('Should filter Slack users', async () => {
            for (const deleted of [true, false]) {
                const slackUsers = Data.slackUsers.filter((su) => su.deleted === deleted);
                const response = await API.request()
                    .get(`/api/slack/users?page=all&deleted=${deleted ? 'true' : 'false'}`);
                expect(response).to.have.status(200);
                expect(response).to.be.json;
                const { body } = response;
                expect(body).to.be.an('object');
                expect(body).to.have.property('slackUsers');
                expect(body.slackUsers).to.be.an('array');
                expect(body.slackUsers).to.have.lengthOf(
                    slackUsers.length
                );
                const bodySlackUsersById = {};
                for (const bodySlackUser of body.slackUsers) {
                    bodySlackUsersById[bodySlackUser.slackId] = bodySlackUser;
                }
                for (const slackUser of slackUsers) {
                    assertSlackUser(
                        bodySlackUsersById[slackUser.slackId],
                        slackUser
                    );
                }
            }
        });
    });

    describe('POST /api/slack/users', () => {
        it('Should udpate Slack user data in all his daysoff', async () => {
            const randomSlackUser = Data.slackUsers[0];
            const assertDaysoffSlackUser = async (slackUser) => {
                const response = await API.request()
                    .get(`/api/daysoff?slackUser=${slackUser.slackId}`);
                expect(response).to.have.status(200);
                expect(response).to.be.json;
                const { body } = response;
                expect(body).to.be.an('object');
                expect(body).to.have.property('daysoff');
                expect(body.daysoff).to.be.an('array');
                expect(body.daysoff).to.have.lengthOf.above(0);
                for (const dayoff of response.body.daysoff) {
                    assertSlackUser(dayoff.slackUser, slackUser);
                }
            };
            const updateSlackUser = async (slackUser) => {
                const response = await API.request()
                    .post('/api/slack/users')
                    .send(slackUser);
                expect(response).to.have.status(200);
                expect(response).to.be.json;
                const { body } = response;
                expect(body).to.be.an('object');
                assertSlackUser(body, slackUser);
            };
            await assertDaysoffSlackUser(randomSlackUser);
            const slackUserOldName = randomSlackUser.name;
            randomSlackUser.name = 'Test Name';
            expect(slackUserOldName).to.not.equal(randomSlackUser.name);
            await updateSlackUser(randomSlackUser);
            await assertDaysoffSlackUser(randomSlackUser);
            randomSlackUser.name = slackUserOldName;
            await updateSlackUser(randomSlackUser);
        });
    });

    describe('GET /api/slack/users/:id', () => {
        it('Should throw validation error', async () => {
            const response = await API.request()
                .get('/api/slack/users/InvalidId');
            expect(response).to.have.status(400);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4000);
        });

        it('Should throw not found error', async () => {
            const response = await API.request()
                .get('/api/slack/users/UA0A0A0A0');
            expect(response).to.have.status(404);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4040);
        });

        it('Should get target Slack user information', async () => {
            const response = await API.request()
                .get(`/api/slack/users/${Data.slackUsers[0].slackId}`);
            expect(response).to.have.status(200);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            assertSlackUser(body, Data.slackUsers[0]);
        });
    });

    describe('GET /api/slack/channels', () => {
        it('Should list all Slack channels', async () => {
            const response = await API.request()
                .get('/api/slack/channels');
            expect(response).to.have.status(200);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('slackChannels');
            expect(body.slackChannels).to.be.an('array');
            expect(body.slackChannels).to.have.lengthOf(Data.slackChannels.length);
            const bodySlackChannelsById = {};
            for (const bodySlackChannel of body.slackChannels) {
                bodySlackChannelsById[bodySlackChannel.slackId] = bodySlackChannel;
            }
            for (const slackChannel of Data.slackChannels) {
                if (slackChannel.isMember) {
                    assertSlackChannel(
                        bodySlackChannelsById[slackChannel.slackId],
                        slackChannel
                    );
                }
            }
        });
    });

    describe('GET /api/slack/channels', () => {
        it('Should list accessible Slack channels', async () => {
            const response = await API.request()
                .get('/api/slack/channels?onlyMember=true');
            expect(response).to.have.status(200);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('slackChannels');
            expect(body.slackChannels).to.be.an('array');
            expect(body.slackChannels).to.have.lengthOf(
                countAccessibleChannels(Data.slackChannels)
            );
            const bodySlackChannelsById = {};
            for (const bodySlackChannel of body.slackChannels) {
                bodySlackChannelsById[bodySlackChannel.slackId] = bodySlackChannel;
            }
            for (const slackChannel of Data.slackChannels) {
                if (slackChannel.isMember) {
                    assertSlackChannel(
                        bodySlackChannelsById[slackChannel.slackId],
                        slackChannel
                    );
                }
            }
        });
    });

    describe('POST /api/slack/channels', () => {
        it('Should upsert Slack channel', async () => {
            const slackChannel = JSON.parse(JSON.stringify(
                Data.slackChannels[0]
            ));
            const updateSlackChannel = async (channel) => {
                const response = await API.request()
                    .post('/api/slack/channels')
                    .send(channel);
                expect(response).to.have.status(200);
                expect(response).to.be.json;
                const { body } = response;
                expect(body).to.be.an('object');
                assertSlackChannel(body, channel);
            };
            slackChannel.name = 'Test channel name';
            slackChannel.archived = true;
            slackChannel.isPrivate = true;
            await updateSlackChannel(slackChannel);
            await updateSlackChannel(Data.slackChannels[0]);
        });
    });

    describe('GET /api/slack/channels/:id', () => {
        it('Should throw validation error', async () => {
            const response = await API.request()
                .get('/api/slack/channels/InvalidId');
            expect(response).to.have.status(400);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4000);
        });

        it('Should throw not found error', async () => {
            const response = await API.request()
                .get('/api/slack/channels/CA0A0A0A0');
            expect(response).to.have.status(404);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4040);
        });

        it('Should get target Slack channel data', async () => {
            const response = await API.request()
                .get(`/api/slack/channels/${Data.slackChannels[0].slackId}`);
            expect(response).to.have.status(200);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            assertSlackChannel(body, Data.slackChannels[0]);
        });
    });

    describe('GET /api/slack/auth', () => {
        it('Should return Slack OAuth URL', async () => {
            const expectedUrl = encodeURI(process.env.PUBLIC_URL);
            const response = await API.request()
                .get('/api/slack/auth');
            expect(response).to.have.status(200);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('url');
            expect(body.url).to.match(/^https:\/\/slack.com\/oauth\/v2\/authorize/);
            expect(body.url).to.match(/client_id=[0-9.]+/);
            expect(body.url).to.match(/scope=[a-z:%20]+/);
            expect(body.url).to.match(/state=[a-zA-Z0-9]+/);
            expect(body.url).to.include(`redirect_uri=${expectedUrl}`);
        });
    });

    describe('POST /api/slack/auth', () => {
        it('Should throw validation error', async () => {
            const response = await API.request()
                .post('/api/slack/auth')
                .send({
                    wrong: 'data'
                });
            expect(response).to.have.status(400);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            expect(body).to.have.property('error');
            expect(body).to.have.property('code');
            expect(body.code).to.equal(4000);
        });

        // SlackAuthController
        it('Should register Slack app after OAuth', async () => {
            // mocks sdk oauth verification
            const authData = {
                teamId: 'TE85A2X11',
                accessToken: 'xoxb-abcdef0123456789'
            };
            SlackSDK.checkOAuthCode = async () => (authData);
            // generates oauth state
            const urlResponse = await API.request()
                .get('/api/slack/auth');
            expect(urlResponse).to.have.status(200);
            assertLastLogEntryValues({
                interface: 'client',
                type: 'installapp',
                user: API.user.id
            });
            // gets expected state from slack auth controller
            const slackAuth = await SlackAuthController.get();
            const { state } = slackAuth;
            // registers slack app
            const response = await API.request()
                .post('/api/slack/auth')
                .send({
                    code: 'someFakeCode',
                    state
                });
            expect(response).to.have.status(200);
            expect(response).to.be.json;
            const { body } = response;
            expect(body).to.be.an('object');
            // gets state from slack auth controller after register
            const auth = await SlackAuthController.get();
            expect(auth).to.have.property('state');
            expect(auth.state).to.equal(state);
            expect(auth).to.have.property('teamId');
            expect(auth.teamId).to.equal(authData.teamId);
            expect(auth).to.have.property('accessToken');
            expect(auth.accessToken).to.equal(authData.accessToken);
        });
    });
});
