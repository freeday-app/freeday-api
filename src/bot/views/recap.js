const DayJS = require('dayjs');

const DayoffController = require('../../api/controllers/dayoff.js');
const Attachments = require('./attachments.js');
const SDK = require('../utils/sdk.js');

const Recap = {

    async send(payload) {
        await Recap.sendProxy(
            payload.channel.id,
            payload.user.id,
            payload.getText
        );
    },

    // envoie récapitulatif des absences pour le mois en cours
    async sendProxy(channelId, slackUserId, getText) {
        // récupère absences du mois
        const daysoff = await Recap.getDaysoff(slackUserId);
        // attachments absences
        const attachments = Recap.getAttachments(getText, daysoff);

        // envoie recap sur slack
        const SDKWeb = await SDK.web();
        await SDKWeb.chat.postMessage({
            channel: channelId,
            text: getText('menu.monthly_recap.title'),
            attachments
        });
    },

    // renvoie attachments slack pour liste absence
    getAttachments(getText, daysoff) {
        const count = daysoff.reduce((accumulator, dayoff) => (
            dayoff.confirmed ? accumulator + dayoff.count : accumulator
        ), 0);
        return daysoff.length > 0 ? [
            {
                name: 'recap_info',
                color: '#CCCCCC',
                title: getText(
                    count > 1 ? 'menu.monthly_recap.counts' : 'menu.monthly_recap.count',
                    count
                )
            },
            ...daysoff.map((dayoff) => ({
                callback_id: 'dayoff_action',
                ...Attachments.dayoff({
                    dayoff,
                    withButtons: false
                }, getText)
            }))
        ] : [{
            title: getText('menu.monthly_recap.no_dayoff')
        }];
    },

    // renvoie la liste des absences pour le mois en cours
    async getDaysoff(slackUserId) {
        const date = DayJS().format('YYYY-MM-DD');
        const start = DayJS(date).startOf('month');
        const end = DayJS(date).endOf('month');
        const { daysoff } = await DayoffController.listProxy({
            start,
            end,
            slackUser: slackUserId,
            order: 'desc'
        });
        return daysoff;
    }

};

module.exports = Recap;
