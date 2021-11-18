const DayJS = require('dayjs');

const StatsLog = require('../../services/statsLog.js');
const DayoffController = require('../../api/controllers/dayoff.js');
const Attachments = require('./attachments.js');
const SDK = require('../utils/sdk.js');

/*
À PROPOS DE LA PAGINATION DE LA LISTE DES ABSENCES SLACK
La liste des absences sur Slack fonctionne avec une pagination spéciale:
..., -3, -2, -1, 1, 2, 3, ...
Les pages négatives sont les absences passées
Les pages positives sont les absences en cours ou à venir
Donc il n'y a pas de page zéro!
*/

const List = {

    // envoie liste des absences
    async send(payload, listPage = 1, postNew = false) {
        // récupère liste absences
        const { daysoff, page } = await List.getDaysoff(payload, listPage);
        // attachments absences
        const attachments = List.getAttachments(payload, daysoff, listPage);
        // boutons précédent / suivant
        const listActions = await List.getActionButtons(payload, listPage, page);
        // titre de la liste en fonction de la page
        const titleKey = listPage >= 1 ? 'upcoming' : 'past';

        const content = {
            text: payload.getText(`menu.list.titles.${titleKey}`),
            attachments: [...attachments, {
                callback_id: 'dayoff_list_action',
                color: '#CCCCCC',
                text: '',
                actions: listActions
            }, {
                callback_id: 'back_home',
                color: '#CCCCCC',
                text: '',
                actions: [{
                    name: 'back_home',
                    text: payload.getText('buttons.back'),
                    type: 'button',
                    value: 'back_home'
                }]
            }]
        };
        // envoie liste sur slack
        const SDKWeb = await SDK.web();
        if (postNew) {
            await SDKWeb.chat.postMessage({
                ...content,
                channel: payload.channel
            });
            StatsLog.logListDaysOff(payload.user);
        } else {
            await SDKWeb.chat.update({
                ...content,
                ts: payload.message_ts,
                channel: payload.channel.id
            });
            StatsLog.logListDaysOff(payload.user.id);
        }
    },

    // renvoie attachments slack pour liste absence
    getAttachments(payload, daysoff, listPage) {
        const attachments = daysoff.length > 0 ? daysoff.map((dayoff) => ({
            callback_id: 'dayoff_action',
            ...Attachments.dayoff({
                dayoff,
                withButtons: true
            }, payload.getText)
        })) : [{
            title: payload.getText('dayoff.no_current_upcoming'),
            text: '',
            actions: []
        }];
        return listPage >= 1 ? attachments : attachments.reverse();
    },

    // renvoie la liste des absences
    async getDaysoff(payload, listPage) {
        const { user: { id: slackUserId } } = payload;
        const isPast = listPage < 1;
        const date = DayJS().subtract((isPast ? 1 : 0), 'days').format('YYYY-MM-DD');
        const list = await DayoffController.listProxy({
            [isPast ? 'end' : 'start']: date,
            slackUser: slackUserId,
            limit: 3,
            page: Math.abs(listPage),
            order: isPast ? 'desc' : 'asc'
        });
        return list;
    },

    // renvoie boutons pour liste absences
    async getActionButtons(payload, listPage, daysoffPageObject) {
        const action = (nextOrPrevious, page) => ({
            name: 'dayoff_list_page',
            text: payload.getText(`menu.list.${nextOrPrevious}`),
            type: 'button',
            value: `dayoff_list_page_${page}`
        });
        let isPrevious = false;
        let isNext = false;
        let previousListPage = listPage - 1;
        let nextListPage = listPage + 1;
        const currentDaysoffPage = daysoffPageObject.current;
        const totalDaysoffPages = daysoffPageObject.total;
        if (listPage === 1) {
            const { daysoff } = await List.getDaysoff(payload, -1);
            isPrevious = daysoff.length > 0;
            isNext = totalDaysoffPages > currentDaysoffPage;
            previousListPage = -1;
        } else if (listPage === -1) {
            isPrevious = totalDaysoffPages > currentDaysoffPage;
            isNext = true;
            nextListPage = 1;
        } else if (listPage > 1) {
            isPrevious = true;
            isNext = totalDaysoffPages > currentDaysoffPage;
        } else if (listPage < -1) {
            isPrevious = totalDaysoffPages > currentDaysoffPage;
            isNext = true;
        }
        const actions = [];
        if (isPrevious) {
            actions.push(
                action('previous', previousListPage)
            );
        }
        if (isNext) {
            actions.push(
                action('next', nextListPage)
            );
        }
        return actions;
    }

};

module.exports = List;
