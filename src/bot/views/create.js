const DayJS = require('dayjs');

const Attachments = require('./attachments.js');
const SDK = require('../utils/sdk.js');
const DayoffService = require('../../services/dayoff.js');
const ConfigurationController = require('../../api/controllers/configuration.js');
const SlackDataController = require('../../api/controllers/slackData.js');
const DayoffTypeController = require('../../api/controllers/dayoffType.js');

const Create = {
    // génère un dayoff à partir d'une réponse dialogflow
    // l'affiche pour confirmer ou annuler
    async send(payload) {
        // récupère les jours ouvrés depuis la configuration
        const { workDays } = await ConfigurationController.getProxy();
        // récupère le premier type de dayoff
        const [type] = (await DayoffTypeController.listProxy({
            enabled: true,
            displayed: true,
            page: 1,
            limit: 1
        })).dayoffTypes;
        // construit le dayoff et ajoute les jours
        const { date, startDate, endDate } = payload.dialogflow;
        const data = {
            start: date || startDate ? DayJS(date || startDate).toDate() : null,
            end: endDate ? DayJS(endDate).toDate() : null,
            type,
            slackUser: await SlackDataController.getUserData(payload.user)
        };
        const dayoff = DayoffService.process(data, workDays);
        // récupère l'attachment pour le dayoff
        const attachment = Attachments.dayoff({ dayoff }, payload.getText);
        // envoie le message, l'attachment et les boutons de confirmation/annulation
        const SDKWeb = await SDK.web();
        await SDKWeb.chat.postMessage({
            text: payload.getText('chat.create'),
            attachments: [
                attachment,
                {
                    callback_id: 'dialog_dayoff',
                    color: '#CCCCCC',
                    text: '',
                    actions: [{
                        name: 'dialog_dayoff_create',
                        type: 'button',
                        text: payload.getText('buttons.edit'),
                        value: JSON.stringify(dayoff)
                    }, {
                        name: 'dialog_dayoff_cancel',
                        type: 'button',
                        text: payload.getText('buttons.cancel')
                    }]
                }
            ],
            channel: payload.channel
        });
    },

    // modifie le message envoyé par `send` si la création est annulée
    async cancel(payload) {
        const SDKWeb = await SDK.web();
        await SDKWeb.chat.update({
            text: payload.getText('chat.cancel'),
            attachments: [],
            ts: payload.message_ts,
            channel: payload.channel.id
        });
    },

    // modifie le message envoyé par `send` si la création est confirmée
    async confirm(payload) {
        const SDKWeb = await SDK.web();
        await SDKWeb.chat.update({
            text: payload.getText('chat.confirm'),
            attachments: [],
            ts: payload.message_ts,
            channel: payload.channel.id
        });
    }
};

module.exports = Create;
