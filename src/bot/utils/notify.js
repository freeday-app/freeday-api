const Attachments = require('../views/attachments.js');
const SDK = require('./sdk.js');
const MessageDispatcher = require('./messageDispatcher.js');
const Log = require('../../services/log.js');
const StatsLog = require('../../services/statsLog.js');
const LanguageService = require('../../services/language.js');

const Notify = {

    // send message content to user
    async send(userId, content, dispatch = false) {
        if (SDK.isActive()) {
            const data = {
                channel: userId,
                as_user: true,
                ...content
            };
            if (dispatch) {
                MessageDispatcher.post(data);
            } else {
                const SDKWeb = await SDK.web();
                await SDKWeb.chat.postMessage(data);
            }
            StatsLog.logNotifyUser(userId);
        }
    },

    // envoie messages confirmations à utilisateur après opération absence
    confirmCreate: async (userId, dayoff, dispatch = false) => (
        Notify.confirm('create', userId, dayoff, null, true, dispatch)
    ),
    confirmEdit: async (userId, dayoff) => (
        Notify.confirm('edit', userId, dayoff, null, true)
    ),
    confirmDelete: async (userId, dayoff) => (
        Notify.confirm('delete', userId, dayoff, '#CCCCCC', false)
    ),
    async confirm(type, userId, dayoff, color = null, status = true, dispatch = false) {
        Log.info(`Sending ${type} confirmation to channel ${userId} for dayoff ${dayoff.id}`);
        // récupère une fonction permettant d'obtenir le texte dans la langue de l'utilisateur
        const getText = await LanguageService.getUserLocaleAccessor(userId);
        const title = getText(`notifications.user_${type}`);
        const dayoffAttachment = Attachments.dayoff({
            dayoff,
            withTitle: title,
            withButtons: false,
            withStatus: status
        }, getText);
        await Notify.send(userId, {
            text: '',
            attachments: [{
                ...dayoffAttachment,
                color: color || dayoffAttachment.color
            }]
        }, dispatch);
    },

    // envoie messages notifications à référent après opération absence
    referrerCreate: async (referrerId, dayoff) => Notify.referrer('create', referrerId, dayoff),
    referrerBulkCreate: async (referrerId, dayoff) => Notify.referrer('bulkCreate', referrerId, dayoff),
    referrerEdit: async (referrerId, dayoff) => Notify.referrer('edit', referrerId, dayoff),
    referrerCancel: async (referrerId, dayoff) => Notify.referrer('cancel', referrerId, dayoff),
    async referrer(type, referrerId, dayoff, status = true) {
        Log.info(`Sending referrer notification to channel ${referrerId} for dayoff ${dayoff.id}`);
        // récupère une fonction permettant d'obtenir le texte dans la langue du channel référent
        const getText = LanguageService.getLocaleAccessor(LanguageService.DEFAULT);
        const title = getText(
            `notifications.referrer_${type}`,
            type === 'bulkCreate' ? dayoff.bulkCount : dayoff.slackUser.name
        );
        const dayoffAttachment = Attachments.dayoff({
            dayoff,
            withTitle: title,
            withButtons: false,
            withStatus: status,
            highlightImportant: true
        }, getText);
        StatsLog.logNotifyReferrer(referrerId);
        await Notify.send(referrerId, {
            text: '',
            attachments: [{
                ...dayoffAttachment,
                color: '#3AA3E3'
            }]
        });
    },

    // envoie notification à utilisateur après action sur absence
    async statusChange(userId, dayoff, userAdmin) {
        Log.info(`Sending status change to channel ${userId} for dayoff ${dayoff.id}`);
        // récupère une fonction permettant d'obtenir le texte dans la langue de l'utilisateur
        const getText = await LanguageService.getUserLocaleAccessor(userId);
        let color = 'warning';
        if (dayoff.confirmed) { color = 'good'; }
        if (dayoff.canceled) { color = 'danger'; }
        const title = getText('notifications.action', userAdmin.username);
        const dayoffAttachment = Attachments.dayoff({
            dayoff,
            withTitle: title,
            withButtons: false
        }, getText);
        await Notify.send(userId, {
            text: '',
            attachments: [{
                ...dayoffAttachment,
                color
            }]
        });
    },

    // envoie message erreur aucun jour ouvré à utilisateur
    async error(userId, localeKey) {
        // récupère une fonction permettant d'obtenir le texte dans la langue de l'utilisateur
        const getText = await LanguageService.getUserLocaleAccessor(userId);
        await Notify.send(userId, {
            attachments: [{
                text: getText(localeKey),
                color: 'danger'
            }]
        });
    },

    // envoie message d'avertissement à utilisateur
    async warning(userId, localeKey) {
        // récupère une fonction permettant d'obtenir le texte dans la langue de l'utilisateur
        const getText = await LanguageService.getUserLocaleAccessor(userId);
        await Notify.send(userId, {
            attachments: [{
                text: getText(localeKey),
                color: 'warning'
            }]
        });
    }

};

module.exports = Notify;
