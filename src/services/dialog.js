const dialogflow = require('@google-cloud/dialogflow');
const DayJS = require('dayjs');

const Configuration = require('./configuration.js');
const Log = require('./log.js');

const Dialog = {
    path: null,
    client: null,
    options: {
        timeout: 2000,
        retry: null
    },
    textByIntent: {
        'small-aide': 'chat.help',
        'small-comment-vas-tu': 'chat.how',
        'small-insulte': 'chat.insult',
        'small-pas-compris': 'chat.misunderstood',
        'Default Fallback Intent': 'chat.misunderstood',
        'small-qui-es-tu': 'chat.who'
    },

    // récupère la configuration et initialise le client DialogFlow et l'endpoint
    init() {
        const {
            project, location, environment, user,
            endpoint, keyfile
        } = Configuration.data.dialogflow;
        Dialog.path = `projects/${project}/locations/${location}/agent/environments/${environment}/users/${user}/sessions/freeday`;
        Dialog.client = new dialogflow.SessionsClient({
            apiEndpoint: endpoint,
            keyFilename: keyfile
        });
        Log.info('Dialogflow NLU initialized');
    },

    // détecte l'intent et les entités d'un message
    async process(str) {
        // construit et envoie la requête
        const request = {
            session: Dialog.path,
            queryInput: {
                text: {
                    text: str,
                    languageCode: Configuration.data.dialogflow.language
                }
            }
        };
        const [response] = await Dialog.client.detectIntent(request, Dialog.options);

        // objet généré à partir de la réponse
        const processed = {
            intent: response.queryResult.intent.displayName
        };

        // ajoute la ou les dates si nécessaire
        const dateTime = response.queryResult.parameters.fields['date-time'];
        if (dateTime) {
            const [value] = dateTime.listValue.values;
            if (value.structValue) {
                if (value.structValue.fields.startDate) {
                    const { stringValue } = value.structValue.fields.startDate;
                    processed.startDate = DayJS(stringValue.slice(0, 10))
                        .startOf('day')
                        .toISOString();
                }
                if (value.structValue.fields.endDate) {
                    const { stringValue } = value.structValue.fields.endDate;
                    processed.endDate = DayJS(stringValue.slice(0, 10))
                        .startOf('day')
                        .toISOString();
                }
            } else if (value.stringValue) {
                processed.date = DayJS(value.stringValue.slice(0, 10))
                    .startOf('day')
                    .toISOString();
            }
        }

        // ajoute le type d'absence si nécessaire
        const dayoffType = response.queryResult.parameters.fields.absence;
        if (dayoffType && dayoffType.stringValue) {
            processed.type = dayoffType.stringValue;
        }

        return processed;
    },

    // ajoute les intentions et entités détectées à un évènement slack
    async slackMiddleware(payload) {
        try {
            if (payload.text) {
                payload.dialogflow = await Dialog.process(payload.text);
                payload.dialogActions = Dialog.actionByIntent(payload.dialogflow);
            }
        } catch (err) {
            Log.error('Error while querying DialogFlow');
            Log.error(err.stack);
            // nettoie le payload en cas d'erreur
            delete payload.dialogflow;
            delete payload.dialogActions;
        }
        return payload;
    },

    // associe une action à un intent
    actionByIntent(dialogData) {
        const {
            intent, date, startDate, endDate
        } = dialogData;

        if (intent === 'absence-creation') {
            return {
                type: 'modal',
                date,
                startDate,
                endDate
            };
        }

        if (intent === 'lister-absence') {
            return {
                type: 'list'
            };
        }

        return {
            type: 'message',
            path: Dialog.textByIntent[intent]
        };
    }
};

module.exports = Dialog;
