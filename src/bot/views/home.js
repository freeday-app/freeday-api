const SDK = require('../utils/sdk.js');

const Home = {

    // envoie accueil bot
    // si postNew true, poste nouveau menu dans channel, attend event en premier paramètre
    // si postNew false, update menu existant, attend payload en premier paramètre
    async send(payloadOrEvent, postNew = false) {
        const textPath = payloadOrEvent.dialogActions
            ? payloadOrEvent.dialogActions.path || 'menu.home.hello'
            : 'menu.home.hello';
        const content = {
            text: payloadOrEvent.getText(textPath),
            attachments: [{
                text: payloadOrEvent.getText('menu.home.question'),
                fallback: payloadOrEvent.getText('menu.home.question'),
                color: '#3AA3E3',
                callback_id: 'home_action',
                actions: [{
                    type: 'button',
                    name: 'action',
                    value: 'dayoff_create',
                    text: payloadOrEvent.getText('menu.home.create_dayoff')
                }, {
                    type: 'button',
                    name: 'action',
                    value: 'dayoff_list',
                    text: payloadOrEvent.getText('menu.home.list_dayoff')
                }, {
                    type: 'button',
                    name: 'action',
                    value: 'language_select',
                    text: payloadOrEvent.getText('menu.home.select_lang')
                }]
            }]
        };
        const SDKWeb = await SDK.web();
        if (postNew) {
            await SDKWeb.chat.postMessage({
                channel: payloadOrEvent.channel,
                ...content
            });
        } else {
            await SDKWeb.chat.update({
                channel: payloadOrEvent.channel.id,
                ts: payloadOrEvent.message_ts,
                ...content
            });
        }
    }

};

module.exports = Home;
