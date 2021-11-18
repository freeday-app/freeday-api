const Models = require('../api/models/index.js');
const Log = require('./log.js');

const StatsLogService = {
    async logLogin(user, ip) {
        await StatsLogService.log('client', 'login', { user, ip });
    },
    async logShowHome(slackUser) {
        await StatsLogService.log('bot', 'showhome', { slackUser });
    },
    async logClientCreateDayOff(user, slackUser) {
        await StatsLogService.log('client', 'createdayoff', { user, slackUser });
    },
    async logBotCreateDayOff(slackUser) {
        await StatsLogService.log('bot', 'createdayoff', { slackUser });
    },
    async logClientEditDayOff(user, slackUser) {
        await StatsLogService.log('client', 'editdayoff', { user, slackUser });
    },
    async logBotEditDayOff(slackUser) {
        await StatsLogService.log('bot', 'editdayoff', { slackUser });
    },
    async logListDaysOff(slackUser) {
        await StatsLogService.log('bot', 'listdaysoff', { slackUser });
    },
    async logClientActionDayOff(action, user, slackUser) {
        await StatsLogService.log('client', `${action}dayoff`, { user, slackUser });
    },
    async logBotCancelDayOff(slackUser) {
        await StatsLogService.log('bot', 'canceldayoff', { slackUser });
    },
    async logNotifyUser(slackUser) {
        await StatsLogService.log('bot', 'notifyuser', { slackUser });
    },
    async logNotifyReferrer(slackChannel) {
        await StatsLogService.log('bot', 'notifyreferrer', { slackChannel });
    },
    async logClientChangeLanguage(user) {
        await StatsLogService.log('client', 'changelanguage', { user });
    },
    async logBotChangeLanguage(slackUser) {
        await StatsLogService.log('bot', 'changelanguage', { slackUser });
    },
    async logChangeTheme(user) {
        await StatsLogService.log('client', 'changetheme', { user });
    },
    async logEditConfig(user) {
        await StatsLogService.log('client', 'editconfig', { user });
    },
    async logAddAdmin(user) {
        await StatsLogService.log('client', 'addadmin', { user });
    },
    async logEditAdmin(user) {
        await StatsLogService.log('client', 'editadmin', { user });
    },
    async logRemoveAdmin(user) {
        await StatsLogService.log('client', 'removeadmin', { user });
    },
    async logAddDayOffType(user) {
        await StatsLogService.log('client', 'adddayofftype', { user });
    },
    async logEditDayOffType(user) {
        await StatsLogService.log('client', 'editdayofftype', { user });
    },
    async logInstallApp(user) {
        await StatsLogService.log('client', 'installapp', { user });
    },
    async log(iface, type, params) {
        try {
            await Models.StatsLog.create({
                interface: iface,
                type,
                ...params
            });
        } catch (err) {
            Log.error(`Failed to log ${iface}:${type} action`);
        }
    }
};

module.exports = StatsLogService;
