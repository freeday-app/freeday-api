const { expect } = require('chai');

const StatsLog = require('../../src/services/statsLog.js');
const Models = require('../../src/api/models/index.js');
const Log = require('../../src/services/log.js');

const { assertEntryValues } = require('../utils/statslog.js');

describe('[Services] Usage Logs', () => {
    before(() => {
        Log.toggleTransport('console', false);
    });

    after(() => {
        Log.toggleTransport('console', true);
    });

    beforeEach(async () => {
        await Models.StatsLog.deleteMany({});
    });

    describe('login', () => {
        it('Should not insert if incomplete', async () => {
            const userId = `${Date.now()}`;
            await StatsLog.logLogin(userId, null);
            const lastEntry = await Models.StatsLog.findOne({ type: 'login', user: userId });
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const user = `${Date.now()}`;
            const ip = '127.0.0.1';
            await StatsLog.logLogin(user, ip);
            const lastEntry = await Models.StatsLog.findOne({ user });
            assertEntryValues(lastEntry, {
                interface: 'client',
                type: 'login',
                user,
                ip
            });
        });
    });

    describe('showhome', () => {
        it('Should not insert if incomplete', async () => {
            await StatsLog.logShowHome();
            const lastEntry = await Models.StatsLog.findOne();
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const slackUser = `${Date.now()}`;
            await StatsLog.logShowHome(slackUser);
            const lastEntry = await Models.StatsLog.findOne({ slackUser });
            assertEntryValues(lastEntry, {
                interface: 'bot',
                type: 'showhome',
                slackUser
            });
        });
    });

    describe('createdayoff (client)', () => {
        it('Should not insert if incomplete', async () => {
            const user = `${Date.now()}`;
            await StatsLog.logClientCreateDayOff(user);
            const lastEntry = await Models.StatsLog.findOne();
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const user = `${Date.now()}`;
            const slackUser = `${Date.now()}`;
            await StatsLog.logClientCreateDayOff(user, slackUser);
            const lastEntry = await Models.StatsLog.findOne({ user });
            assertEntryValues(lastEntry, {
                interface: 'client',
                type: 'createdayoff',
                user,
                slackUser
            });
        });
    });

    describe('createdayoff (bot)', () => {
        it('Should not insert if incomplete', async () => {
            await StatsLog.logBotCreateDayOff();
            const lastEntry = await Models.StatsLog.findOne();
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const slackUser = `${Date.now()}`;
            await StatsLog.logBotCreateDayOff(slackUser);
            const lastEntry = await Models.StatsLog.findOne({ slackUser });
            assertEntryValues(lastEntry, {
                interface: 'bot',
                type: 'createdayoff',
                slackUser
            });
        });
    });

    describe('editdayoff (client)', () => {
        it('Should not insert if incomplete', async () => {
            const user = `${Date.now()}`;
            await StatsLog.logClientEditDayOff(user);
            const lastEntry = await Models.StatsLog.findOne();
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const user = `${Date.now()}`;
            const slackUser = `${Date.now()}`;
            await StatsLog.logClientEditDayOff(user, slackUser);
            const lastEntry = await Models.StatsLog.findOne({ user });
            assertEntryValues(lastEntry, {
                interface: 'client',
                type: 'editdayoff',
                user,
                slackUser
            });
        });
    });

    describe('editdayoff (bot)', () => {
        it('Should not insert if incomplete', async () => {
            await StatsLog.logBotEditDayOff();
            const lastEntry = await Models.StatsLog.findOne();
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const slackUser = `${Date.now()}`;
            await StatsLog.logBotEditDayOff(slackUser);
            const lastEntry = await Models.StatsLog.findOne({ slackUser });
            assertEntryValues(lastEntry, {
                interface: 'bot',
                type: 'editdayoff',
                slackUser
            });
        });
    });

    describe('listdaysoff', () => {
        it('Should not insert if incomplete', async () => {
            await StatsLog.logListDaysOff();
            const lastEntry = await Models.StatsLog.findOne();
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const slackUser = `${Date.now()}`;
            await StatsLog.logListDaysOff(slackUser);
            const lastEntry = await Models.StatsLog.findOne({ slackUser });
            assertEntryValues(lastEntry, {
                interface: 'bot',
                type: 'listdaysoff',
                slackUser
            });
        });
    });

    describe('confirmdayoff', () => {
        it('Should not insert if incomplete', async () => {
            const user = `${Date.now()}`;
            await StatsLog.logClientActionDayOff('confirm', user);
            const lastEntry = await Models.StatsLog.findOne();
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const user = `${Date.now()}`;
            const slackUser = `${Date.now()}`;
            await StatsLog.logClientActionDayOff('confirm', user, slackUser);
            const lastEntry = await Models.StatsLog.findOne({ user });
            assertEntryValues(lastEntry, {
                interface: 'client',
                type: 'confirmdayoff',
                user,
                slackUser
            });
        });
    });

    describe('canceldayoff (client)', () => {
        it('Should not insert if incomplete', async () => {
            const user = `${Date.now()}`;
            await StatsLog.logClientActionDayOff('cancel', user);
            const lastEntry = await Models.StatsLog.findOne();
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const user = `${Date.now()}`;
            const slackUser = `${Date.now()}`;
            await StatsLog.logClientActionDayOff('cancel', user, slackUser);
            const lastEntry = await Models.StatsLog.findOne({ user });
            assertEntryValues(lastEntry, {
                interface: 'client',
                type: 'canceldayoff',
                user,
                slackUser
            });
        });
    });

    describe('canceldayoff (bot)', () => {
        it('Should not insert if incomplete', async () => {
            await StatsLog.logBotCancelDayOff();
            const lastEntry = await Models.StatsLog.findOne();
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const slackUser = `${Date.now()}`;
            await StatsLog.logBotCancelDayOff(slackUser);
            const lastEntry = await Models.StatsLog.findOne({ slackUser });
            assertEntryValues(lastEntry, {
                interface: 'bot',
                type: 'canceldayoff',
                slackUser
            });
        });
    });

    describe('resetdayoff', () => {
        it('Should not insert if incomplete', async () => {
            const user = `${Date.now()}`;
            await StatsLog.logClientActionDayOff('reset', user);
            const lastEntry = await Models.StatsLog.findOne();
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const user = `${Date.now()}`;
            const slackUser = `${Date.now()}`;
            await StatsLog.logClientActionDayOff('reset', user, slackUser);
            const lastEntry = await Models.StatsLog.findOne({ user });
            assertEntryValues(lastEntry, {
                interface: 'client',
                type: 'resetdayoff',
                user,
                slackUser
            });
        });
    });

    describe('notifyuser', () => {
        it('Should not insert if incomplete', async () => {
            await StatsLog.logNotifyUser();
            const lastEntry = await Models.StatsLog.findOne();
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const slackUser = `${Date.now()}`;
            await StatsLog.logNotifyUser(slackUser);
            const lastEntry = await Models.StatsLog.findOne({ slackUser });
            assertEntryValues(lastEntry, {
                interface: 'bot',
                type: 'notifyuser',
                slackUser
            });
        });
    });

    describe('notifyreferrer', () => {
        it('Should not insert if incomplete', async () => {
            await StatsLog.logNotifyReferrer();
            const lastEntry = await Models.StatsLog.findOne();
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const slackChannel = `${Date.now()}`;
            await StatsLog.logNotifyReferrer(slackChannel);
            const lastEntry = await Models.StatsLog.findOne({ slackChannel });
            assertEntryValues(lastEntry, {
                interface: 'bot',
                type: 'notifyreferrer',
                slackChannel
            });
        });
    });

    describe('changelanguage (client)', () => {
        it('Should not insert if incomplete', async () => {
            await StatsLog.logClientChangeLanguage();
            const lastEntry = await Models.StatsLog.findOne();
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const user = `${Date.now()}`;
            await StatsLog.logClientChangeLanguage(user);
            const lastEntry = await Models.StatsLog.findOne({ user });
            assertEntryValues(lastEntry, {
                interface: 'client',
                type: 'changelanguage',
                user
            });
        });
    });

    describe('changelanguage (bot)', () => {
        it('Should not insert if incomplete', async () => {
            await StatsLog.logBotChangeLanguage();
            const lastEntry = await Models.StatsLog.findOne();
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const slackUser = `${Date.now()}`;
            await StatsLog.logBotChangeLanguage(slackUser);
            const lastEntry = await Models.StatsLog.findOne({ slackUser });
            assertEntryValues(lastEntry, {
                interface: 'bot',
                type: 'changelanguage',
                slackUser
            });
        });
    });

    describe('changetheme', () => {
        it('Should not insert if incomplete', async () => {
            await StatsLog.logChangeTheme();
            const lastEntry = await Models.StatsLog.findOne();
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const user = `${Date.now()}`;
            await StatsLog.logChangeTheme(user);
            const lastEntry = await Models.StatsLog.findOne({ user });
            assertEntryValues(lastEntry, {
                interface: 'client',
                type: 'changetheme',
                user
            });
        });
    });

    describe('editconfig', () => {
        it('Should not insert if incomplete', async () => {
            await StatsLog.logEditConfig();
            const lastEntry = await Models.StatsLog.findOne();
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const user = `${Date.now()}`;
            await StatsLog.logEditConfig(user);
            const lastEntry = await Models.StatsLog.findOne({ user });
            assertEntryValues(lastEntry, {
                interface: 'client',
                type: 'editconfig',
                user
            });
        });
    });

    describe('addadmin', () => {
        it('Should not insert if incomplete', async () => {
            await StatsLog.logAddAdmin();
            const lastEntry = await Models.StatsLog.findOne();
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const user = `${Date.now()}`;
            await StatsLog.logAddAdmin(user);
            const lastEntry = await Models.StatsLog.findOne({ user });
            assertEntryValues(lastEntry, {
                interface: 'client',
                type: 'addadmin',
                user
            });
        });
    });

    describe('editadmin', () => {
        it('Should not insert if incomplete', async () => {
            await StatsLog.logEditAdmin();
            const lastEntry = await Models.StatsLog.findOne();
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const user = `${Date.now()}`;
            await StatsLog.logEditAdmin(user);
            const lastEntry = await Models.StatsLog.findOne({ user });
            assertEntryValues(lastEntry, {
                interface: 'client',
                type: 'editadmin',
                user
            });
        });
    });

    describe('removeadmin', () => {
        it('Should not insert if incomplete', async () => {
            await StatsLog.logRemoveAdmin();
            const lastEntry = await Models.StatsLog.findOne();
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const user = `${Date.now()}`;
            await StatsLog.logRemoveAdmin(user);
            const lastEntry = await Models.StatsLog.findOne({ user });
            assertEntryValues(lastEntry, {
                interface: 'client',
                type: 'removeadmin',
                user
            });
        });
    });

    describe('adddayofftype', () => {
        it('Should not insert if incomplete', async () => {
            await StatsLog.logAddDayOffType();
            const lastEntry = await Models.StatsLog.findOne();
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const user = `${Date.now()}`;
            await StatsLog.logAddDayOffType(user);
            const lastEntry = await Models.StatsLog.findOne({ user });
            assertEntryValues(lastEntry, {
                interface: 'client',
                type: 'adddayofftype',
                user
            });
        });
    });

    describe('editdayofftype', () => {
        it('Should not insert if incomplete', async () => {
            await StatsLog.logEditDayOffType();
            const lastEntry = await Models.StatsLog.findOne();
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const user = `${Date.now()}`;
            await StatsLog.logEditDayOffType(user);
            const lastEntry = await Models.StatsLog.findOne({ user });
            assertEntryValues(lastEntry, {
                interface: 'client',
                type: 'editdayofftype',
                user
            });
        });
    });

    describe('installapp', () => {
        it('Should not insert if incomplete', async () => {
            await StatsLog.logInstallApp();
            const lastEntry = await Models.StatsLog.findOne();
            expect(lastEntry).to.be.null;
        });
        it('Should have all properties', async () => {
            const user = `${Date.now()}`;
            await StatsLog.logInstallApp(user);
            const lastEntry = await Models.StatsLog.findOne({ user });
            assertEntryValues(lastEntry, {
                interface: 'client',
                type: 'installapp',
                user
            });
        });
    });
});
