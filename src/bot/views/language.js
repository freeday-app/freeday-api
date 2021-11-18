const SDK = require('../utils/sdk.js');
const LanguageService = require('../../services/language.js');

const Language = {

    // envoie select choix langue
    async send(payload) {
        const SDKWeb = await SDK.web();
        await SDKWeb.chat.update({
            channel: payload.channel.id,
            ts: payload.message_ts,
            response_type: 'in_channel',
            attachments: [{
                text: payload.getText('menu.language.choose'),
                fallback: payload.getText('menu.language.choose'),
                color: '#3AA3E3',
                attachment_type: 'default',
                callback_id: 'language_save',
                actions: [{
                    type: 'select',
                    name: 'language_select',
                    text: payload.getText('menu.language.choose'),
                    options: Object.keys(LanguageService.languages).map((code) => ({
                        text: LanguageService.languages[code].name,
                        value: code
                    }))
                }]
            }, {
                callback_id: 'back_home',
                color: '#CCCCCC',
                text: '',
                actions: [{
                    name: 'back_home',
                    text: payload.getText('buttons.back'),
                    type: 'button',
                    value: 'back'
                }]
            }]
        });
    }

};

module.exports = Language;
