const Log = require('./log.js');

const enBotData = require('../bot/lang/en.json');
const frBotData = require('../bot/lang/fr.json');
const { LanguageError } = require('./errors.js');
const SlackData = require('../api/controllers/slackData.js');

const Language = {

    DEFAULT: 'fr',

    languages: {
        en: {
            name: 'English',
            data: {
                ...enBotData
            }
        },
        fr: {
            name: 'Français',
            data: {
                ...frBotData
            }
        }
    },

    formatString(string, ...params) {
        return string.replace(/%s/g, () => params.shift());
    },

    getText(code, path, ...params) {
        let text = Language.languages[code].data;
        path.split('.').forEach((p) => {
            if (Object.hasOwnProperty.call(text, p)) {
                text = text[p];
            }
        });
        const legitTypes = ['string', 'number', 'boolean'];
        const textType = typeof text;
        if (text === null || !legitTypes.includes(textType)) {
            Log.error(`Language error: text \`${path}\` not found for language \`${code}\``);
            return null;
        }

        return Language.formatString(text, ...params);
    },

    // returns a getText function for the language of the slack user
    async getUserLocaleAccessor(userId) {
        const userData = await SlackData.getUserData(userId);
        let locale = Language.DEFAULT;
        if (userData) {
            locale = userData.forcedLocale ? userData.forcedLocale : userData.locale;
        } else {
            Log.error(`Could not get Slack user ${userId} data`);
        }
        return Language.getLocaleAccessor(locale);
    },

    // returns a getText function for a specific language
    // uses default language if desired language is not found
    getLocaleAccessor(locale) {
        const usedLocale = Language.languages[locale] ? locale : Language.DEFAULT;
        return (path, ...params) => Language.getText(usedLocale, path, ...params);
    },

    // middleware for slackbot language
    // adds a function to get locales depending on the user preferences.
    // if the event was triggered by a bot we do nothing.
    async slackMiddleware(e) {
        try {
            const userId = Language.getSlackUserId(e);
            const isBot = Language.isTriggeredByBot(e);
            if (userId && !isBot) {
                // gets user locale
                e.getText = await Language.getUserLocaleAccessor(userId);
                // calls middleware next handler
                return e;
            }
            if (!userId && !isBot) {
                // if there was neither a user nor a bot
                throw new LanguageError(`Language Slack middleware: missing Slack user ID in ${JSON.stringify(e)}`);
            }
            return null;
        } catch (err) {
            Log.error(err.stack);
            return null;
        }
    },

    getSlackUserId(e) {
        const { user } = e;
        if (user && user.id) {
            return e.user.id;
        }
        if (user) {
            return e.user;
        }
        return null;
    },

    isTriggeredByBot(e) {
        return e.bot_id || (e.message && e.message.bot_id);
    }

};

module.exports = Language;
