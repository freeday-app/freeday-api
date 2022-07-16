const DayJS = require('dayjs');

const Log = require('../../services/log.js');
const StatsLog = require('../../services/statsLog.js');
const Views = require('../views/index.js');
const Notify = require('./notify.js');
const DayoffController = require('../../api/controllers/dayoff.js');
const SlackDataController = require('../../api/controllers/slackData.js');
const {
    NoWorkDaysError,
    EndBeforeStartError,
    ConflictError,
    NotifyReferrerError,
    NotifyUserError
} = require('../../services/errors.js');
const LanguageService = require('../../services/language.js');

const Handlers = {

    // gère réception évènement slack
    async onMessage(event) {
        // controle que l'expéditeur est un user
        // et n'est pas le bot lui-même (pour ne pas qu'il s'écoute tou seul...)
        // et que le message est envoyé en direct message
        if (!Handlers.isMessageFromBot(event) && event.channel.startsWith('D')) {
            try {
                if (event.dialogActions) {
                    const { type } = event.dialogActions;
                    if (type === 'message') {
                        await Views.home.send(event, true);
                        StatsLog.logShowHome(event.user);
                    } else if (type === 'modal') {
                        Views.create.send(event);
                    } else if (type === 'list') {
                        await Views.list.send(event, 1, true);
                    }
                } else {
                    // home menu
                    await Views.home.send(event, true);
                    StatsLog.logShowHome(event.user);
                }
            } catch (err) {
                await Notify.error(event.user, 'errors.bot');
                Log.error(err.stack);
            }
        }
        return false;
    },

    // gère réception actions interaction slack
    async onAction(payload) {
        try {
            // handles action
            const callbackId = payload.callback_id;
            if (callbackId === 'home_action') { // action bouton accueil
                await Handlers.homeAction(payload);
            } else if (callbackId === 'back_home') { // action retour à l'accueil
                await Views.home.send(payload);
            } else if (callbackId === 'dayoff_action') { // actions boutons liste absences
                await Handlers.dayoffAction(payload);
            } else if (callbackId === 'language_save') { // sauvegarde sélection langue bot
                await Handlers.saveLanguage(payload);
            } else if (callbackId === 'dayoff_list_action') { // actions liste absences
                await Handlers.listAction(payload);
            } else if (callbackId === 'dialog_dayoff') { // actions création par le chat
                await Handlers.dialogConfirmAction(payload);
            } else {
                Log.error(`Unhandled Slack interaction ${callbackId}`);
            }
        } catch (err) {
            await Notify.error(payload.user.id, 'errors.interaction');
            Log.error(err.stack);
        }
    },

    // gère action boutons acceuil
    async homeAction(payload) {
        const action = Handlers.getPayloadAction(payload);
        if (action === 'dayoff_create') { // création absence
            await Views.modal.send(payload);
        } else if (action === 'dayoff_list') { // liste absences
            await Views.list.send(payload);
        } else if (action === 'language_select') { // choix langue
            await Views.language.send(payload);
        } else {
            Log.error(`Unhandled Slack home action ${action}`);
        }
    },

    // gère actions boutons liste absence
    async dayoffAction(payload) {
        const action = Handlers.getPayloadAction(payload);
        if (action) {
            if (action.startsWith('edit.')) { // demande formulaire édition absence
                const dayoffId = action.replace('edit.', '');
                // envoie modale modification absence
                await Views.modal.send(payload, dayoffId);
                return null;
            } if (action.startsWith('cancel.')) { // annulation absence
                const dayoffId = action.replace('cancel.', '');
                // annule absence
                await Handlers.cancelDayoff(payload, dayoffId);
                return null;
            }
        }
        Log.error(`Unhandled dayoff action ${action}`);
        return null;
    },

    // gère actions boutons liste absence
    async listAction(payload) {
        const action = Handlers.getPayloadAction(payload);
        if (action) {
            // affichage pages absences
            if (action.startsWith('dayoff_list_page_')) {
                const listPage = parseInt(action.replace('dayoff_list_page_', ''));
                return Views.list.send(payload, listPage);
            }
        }
        Log.error(`Unhandled list action ${action}`);
        return null;
    },

    async dialogConfirmAction(payload) {
        const { name, value } = payload;
        if (name === 'dialog_dayoff_create') {
            await Views.modal.send(payload, null, JSON.parse(value));
        } else if (name === 'dialog_dayoff_cancel') {
            await Views.create.cancel(payload);
        }
    },

    // gère réception données modale après submit
    // parse et sauvegarde données absence
    async onViewSubmission(payload) {
        try {
            // récupère données custom dans payload
            let metadata = {};
            try {
                metadata = JSON.parse(payload.view.private_metadata);
            } catch (err) {
                metadata = {};
            }
            // récupère id absence à éditer si présent
            const dayoffId = metadata.dayoffId ? metadata.dayoffId : null;
            const isEdit = !!dayoffId;
            // récupère les données user slack via le controller en forçant la synchronisation
            const slackUser = await SlackDataController.getUserData(payload.user.id, true);
            // parse données view Slack
            const data = Handlers.parseDayoffView(payload);
            data.slackUserId = slackUser.slackId;
            if (isEdit) {
                // édite absence
                await DayoffController.updateProxy(dayoffId, data);
                StatsLog.logBotEditDayOff(data.slackUserId);
                // actualise liste absences
                await Views.list.send({
                    ...payload,
                    channel: { id: metadata.channel },
                    message_ts: metadata.ts
                });
            } else {
                // créée absence
                await DayoffController.createProxy(data);
                if (metadata.isChat) {
                    payload.message_ts = metadata.ts;
                    payload.channel = { id: metadata.channel };
                    Views.create.confirm(payload);
                }
                StatsLog.logBotCreateDayOff(data.slackUserId);
            }
        } catch (err) {
            // si erreurs de validation de l'absence
            if (err instanceof EndBeforeStartError) {
                return Views.modal.error(payload, 'end_date', 'errors.end_before_start');
            } if (err instanceof NoWorkDaysError) {
                return Views.modal.error(payload, 'start_date', 'errors.no_work_days');
            } if (err instanceof ConflictError) {
                return Views.modal.error(payload, 'start_date', 'errors.conflict');
            } if (err instanceof NotifyReferrerError) {
                await Notify.warning(payload.user.id, 'warnings.notify_referrer');
                return null;
            } if (err instanceof NotifyUserError) {
                await Notify.warning(payload.user.id, 'warnings.notify_user');
                return null;
            }
            // autre erreur
            await Notify.error(payload.user.id, 'errors.process_dayoff');
            Log.error(err.stack);
        }
        return null;
    },

    // annule une absence
    async cancelDayoff(payload, dayoffId) {
        await DayoffController.actionProxy({
            id: dayoffId,
            action: 'cancel',
            cancelNotifyReferrer: true
        });
        StatsLog.logBotCancelDayOff(payload.user.id);
        // actualise liste absences
        await Views.list.send(payload);
    },

    // champs et clés pour parsing données view Slack
    dayoffViewFields: [{
        field: 'start_date',
        keys: ['selected_date'],
        name: 'start',
        convert: (v) => DayJS(v).toDate(),
        required: true
    }, {
        field: 'start_period',
        keys: ['selected_option', 'value'],
        name: 'startPeriod'
    }, {
        field: 'end_date',
        keys: ['selected_date'],
        name: 'end',
        convert: (v) => DayJS(v).toDate(),
        required: true
    }, {
        field: 'end_period',
        keys: ['selected_option', 'value'],
        name: 'endPeriod'
    }, {
        field: 'dayoff_type',
        keys: ['selected_option', 'value'],
        name: 'type',
        required: true
    }, {
        field: 'comment',
        keys: ['value'],
        name: 'comment'
    }],

    // transforme contenu formulaire absence slack en
    // objet de données d'absence pour insertion / update en base
    parseDayoffView(payload) {
        const data = {};
        const { values } = payload.view.state;
        // parcoure les données de la view Slack et récupère valeurs
        Handlers.dayoffViewFields.forEach((vf) => {
            let isValue = false;
            if (values[vf.field] && values[vf.field][vf.field]) {
                let val = values[vf.field][vf.field];
                for (const key of vf.keys) {
                    if (val[key]) {
                        val = val[key];
                    } else {
                        val = null;
                        break;
                    }
                }
                if (val) {
                    isValue = true;
                    data[vf.name] = vf.convert ? vf.convert(val) : val;
                }
            }
            if (!isValue && vf.required) {
                throw new Error(`No value for required field ${vf.field} in dayoff Slack view state`);
            }
        });
        return data;
    },

    // détermine si un message a été envoyé par un bot
    isMessageFromBot(event) {
        return (event.bot_id || (event.user && event.user === 'USLACKBOT'));
    },

    botFilterMiddleware(event) {
        return Handlers.isMessageFromBot(event) ? null : event;
    },

    // sauvegarde langue bot
    async saveLanguage(payload) {
        const actionObject = Handlers.getPayloadActionObject(payload);
        const selectedOption = actionObject ? actionObject.selected_options.shift() : null;
        const locale = selectedOption ? selectedOption.value : null;
        if (locale) {
            // sauvegarde de la langue en base et en cache
            await SlackDataController.saveUserLocaleProxy(payload.user.id, locale);
            StatsLog.logBotChangeLanguage(payload.user.id);
            // changement de la langue dans le payload actuel avant de renvoyer une vue
            payload.getText = LanguageService.getLocaleAccessor(locale);
            // renvoie à l'acceuil du bot
            await Views.home.send(payload);
        } else {
            Log.error(`Missing selected locale ${locale} in Slack callback`);
        }
    },

    // extrait l'action d'un payload
    getPayloadAction(payload) {
        const actionObject = Handlers.getPayloadActionObject(payload);
        return (
            actionObject && actionObject.value !== undefined
        ) ? actionObject.value : null;
    },
    getPayloadActionObject(payload) {
        return Array.isArray(payload.actions)
            ? payload.actions.shift()
            : null;
    }

};

module.exports = Handlers;
