const DayJs = require('dayjs');

const DayoffController = require('../../api/controllers/dayoff.js');
const DayoffTypeController = require('../../api/controllers/dayoffType.js');
const SDK = require('../utils/sdk.js');
const Notify = require('../utils/notify.js');

const Modal = {

    // envoie formulaire création/édition absence
    async send(payload, dayoffId = null, dayoffData = null) {
        // si édition récupère données absence
        const dayoff = dayoffId
            ? await DayoffController.getProxy(dayoffId)
            : dayoffData;
        // types d'absences
        const { dayoffTypes } = await DayoffTypeController.listProxy({
            enabled: true,
            displayed: true,
            page: 'all'
        });
        if (dayoffTypes.length) {
            // envoie formulaire saisie absence vers slack
            if (!dayoffId || dayoff) {
                const form = await Modal.getForm(payload, dayoffTypes, dayoff);
                const SDKWeb = await SDK.web();
                await SDKWeb.views.open({
                    trigger_id: payload.trigger_id,
                    ...form
                });
            }
        } else {
            await Notify.error(payload.user.id, 'errors.no_dayoff_type');
        }
    },

    // renvoie formulaire absence
    // utilise slack block kit pour construire le formulaire
    // https://api.slack.com/block-kit
    async getForm(payload, dayoffTypes, dayoff = null) {
        const startDate = dayoff && dayoff.start ? DayJs(dayoff.start).format('YYYY-MM-DD') : null;
        const endDate = dayoff && dayoff.end ? DayJs(dayoff.end).format('YYYY-MM-DD') : null;
        const startPeriod = dayoff ? dayoff.startPeriod || null : null;
        const endPeriod = dayoff ? dayoff.endPeriod || null : null;
        const dayoffType = dayoff ? dayoff.type || null : null;
        const comment = dayoff ? dayoff.comment || null : null;
        const statusType = dayoff ? dayoff.status || null : null;

        return {
            view: {
                private_metadata: JSON.stringify({
                    dayoffId: dayoff ? dayoff.id || null : null,
                    channel: payload.channel.id,
                    ts: payload.message_ts,
                    isChat: !!dayoff
                }),
                callback_id: 'dayoff_save',
                type: 'modal',
                title: {
                    type: 'plain_text',
                    text: payload.getText('form.title')
                },
                blocks: [
                    Modal.inputs.datePicker(payload, 'start', startDate, true),
                    Modal.inputs.periodSelect(payload, 'start', startPeriod),
                    Modal.inputs.datePicker(payload, 'end', endDate, true),
                    Modal.inputs.periodSelect(payload, 'end', endPeriod),
                    Modal.inputs.dayoffTypeSelect(payload, dayoffTypes, dayoffType, true),
                    Modal.inputs.textInput(payload, 'comment', comment),
                    Modal.inputs.dayoffStatusSelect(payload, statusType)
                ],
                submit: {
                    type: 'plain_text',
                    text: payload.getText('buttons.submit')
                },
                close: {
                    type: 'plain_text',
                    text: payload.getText('buttons.cancel')
                }
            }
        };
    },

    // helpers blocks slack
    // https://api.slack.com/block-kit
    inputs: {

        datePicker: (payload, prefix, value = null, required = false) => ({
            block_id: `${prefix}_date`,
            type: 'input',
            label: {
                type: 'plain_text',
                text: payload.getText(`form.${prefix}_date`)
            },
            element: {
                action_id: `${prefix}_date`,
                type: 'datepicker',
                initial_date: value || DayJs().format('YYYY-MM-DD'),
                placeholder: {
                    type: 'plain_text',
                    text: payload.getText('form.select_date')
                }
            },
            optional: !required
        }),

        periodSelect: (payload, prefix, value = null, required = false) => {
            const options = {
                am: {
                    text: {
                        type: 'plain_text',
                        text: payload.getText('common.am')
                    },
                    value: 'am'
                },
                pm: {
                    text: {
                        type: 'plain_text',
                        text: payload.getText('common.pm')
                    },
                    value: 'pm'
                }
            };
            const initial = value ? {
                initial_option: options[value]
            } : {};
            return {
                block_id: `${prefix}_period`,
                type: 'input',
                label: {
                    type: 'plain_text',
                    text: payload.getText(`form.${prefix}_period`)
                },
                element: {
                    action_id: `${prefix}_period`,
                    type: 'static_select',
                    placeholder: {
                        type: 'plain_text',
                        text: payload.getText('form.select_period')
                    },
                    options: Object.values(options),
                    ...initial
                },
                optional: !required
            };
        },

        dayoffTypeSelect: (payload, types, selectedType = null, required = false) => {
            const options = types.map((type) => ({
                text: {
                    type: 'plain_text',
                    text: type.name
                },
                value: type.id
            }));
            const initialOption = selectedType ? options.filter((opt) => (
                opt.value.toString() === selectedType.id.toString()
            ))[0] : options[0];
            return {
                block_id: 'dayoff_type',
                type: 'input',
                label: {
                    type: 'plain_text',
                    text: payload.getText('dayoff.type')
                },
                element: {
                    action_id: 'dayoff_type',
                    type: 'static_select',
                    placeholder: {
                        type: 'plain_text',
                        text: payload.getText('form.select_type')
                    },
                    options,
                    initial_option: initialOption
                },
                optional: !required
            };
        },

        textInput: (payload, id, value = null, required = false) => {
            const initial = value ? {
                initial_value: value
            } : {};
            return {
                block_id: id,
                type: 'input',
                label: {
                    type: 'plain_text',
                    text: payload.getText('form.comment')
                },
                element: {
                    action_id: id,
                    type: 'plain_text_input',
                    ...initial
                },
                optional: !required
            };
        },

        dayoffStatusSelect: (payload, selectedType = null) => {
            const required = false;
            const options = [
                { text: {
                    type: 'plain_text',
                    text: payload.getText('dayoff.status.confirmed')
                },
                value: text('dayoff.status.confirmed') },
                { text: {
                    type: 'plain_text',
                    text: payload.getText('dayoff.status.canceled')
                },
                value: payload.getText('dayoff.status.canceled') },
                { text: {
                    type: 'plain_text',
                    text: payload.getText('dayoff.status.pending')
                },
                value: payload.getText('dayoff.status.pending') 
            }]
            const initialOption = selectedType ? options.filter((opt) => (
                opt.value.toString() === selectedType.id.toString()
            ))[0] : options[0];
            return {
                block_id: 'dayoff_status',
                type: 'input',
                label: {
                    type: 'plain_text',
                    text: payload.getText('dayoff.status')
                },
                element: {
                    action_id: 'dayoff_status',
                    type: 'static_select',
                    placeholder: {
                        type: 'plain_text',
                        text: payload.getText('form.select_status')
                    },
                    options,
                    initial_option: initialOption
                },
                optional: !required
            };
        },
    },

    // returns response error object for slack view submission when validation error
    error(payload, blockId, text) {
        return {
            response_action: 'errors',
            errors: {
                [blockId]: payload.getText(text)
            }
        };
    }

};

module.exports = Modal;
