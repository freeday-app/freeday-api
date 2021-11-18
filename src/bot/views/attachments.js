const DayJS = require('dayjs');

const Attachments = {

    // renvoie attachment d'une absence pour block kit slack
    // peut être utilisé dans les notifications et être indépendant d'un payload ou d'un evenement.
    // necessite donc une méthode getText qui retourne la localisation appropriée.
    dayoff(opts, getText) {
        const options = {
            withButtons: false,
            withTitle: null,
            withStatus: true,
            highlightImportant: false,
            ...opts
        };
        const { dayoff } = options;
        // n'autorise pas la modification et annulation si l'absence:
        // - est en cours ou passée
        // - est déjà annulée
        const today = DayJS().startOf('day');
        const allowActions = !dayoff.canceled && (
            DayJS(dayoff.start).startOf('day').isAfter(today)
        );
        // textes
        const datePeriodText = Attachments.dayoffDatePeriodText(dayoff, getText);
        let color = '#CCCCCC';
        let status = getText('dayoff.status.pending');
        let cancelReason = null;
        if (dayoff.confirmed) {
            color = 'good';
            status = getText('dayoff.status.confirmed');
        }
        if (dayoff.canceled) {
            color = 'danger';
            status = getText('dayoff.status.canceled');
            cancelReason = dayoff.cancelReason;
        }
        const texts = [];
        if (options.withTitle) {
            texts.push(datePeriodText);
        }
        if (options.highlightImportant && dayoff.type.important) {
            texts.push(`:warning: *${getText('dayoff.important').toUpperCase()}*`);
        }
        const durationUnit = getText(`common.day${dayoff.count < 2 ? '' : 's'}`);
        texts.push(`${dayoff.count} ${durationUnit.toLowerCase()}`);
        const typeText = (
            dayoff.type.emoji ? `:${dayoff.type.emoji}: ` : ''
        ) + dayoff.type.name;
        texts.push(typeText);
        if (dayoff.comment) {
            texts.push(dayoff.comment);
        }
        if (options.withStatus) {
            if (cancelReason) {
                status += ` (${cancelReason})`;
            }
            texts.push(status);
        }
        // boutons action
        const actions = [{
            name: 'dayoff_edit',
            text: getText('buttons.edit'),
            type: 'button',
            value: `edit.${dayoff.id}`
        }, {
            name: 'dayoff_cancel',
            text: getText('buttons.cancel'),
            type: 'button',
            value: `cancel.${dayoff.id}`,
            confirm: {
                title: getText('menu.list.cancel_question'),
                text: getText('common.no_way_back'),
                ok_text: getText('common.yes'),
                dismiss_text: getText('common.no')
            }
        }];
        return {
            fallback: options.withTitle ? options.withTitle : datePeriodText,
            title: options.withTitle ? options.withTitle : datePeriodText,
            text: texts.join('\n'),
            actions: options.withButtons && allowActions ? actions : [],
            color
        };
    },

    // construit phrase de la période d'absence, par exemple:
    // - Du lundi DD/MM/YYYY au mardi DD/MM/YYYY
    // - Du mercredi DD/MM/YYYY matin au vendredi DD/MM/YYYY après-midi
    // - Du mardi DD/MM/YYYY après-midi au vendredi DD/MM/YYYY
    // - Le lundi DD/MM/YYYY matin
    // - Le jeudi DD/MM/YYYY
    dayoffDatePeriodText(dayoff, getText) {
        const startDay = DayJS(dayoff.start);
        const startDate = startDay.format(getText('date_format'));
        const startDayText = getText(`days.${startDay.isoWeekday()}`).toLowerCase();
        const startText = `${startDayText} ${startDate}`;
        const endDay = DayJS(dayoff.end);
        const endDate = endDay.format(getText('date_format'));
        const endDayText = getText(`days.${endDay.isoWeekday()}`).toLowerCase();
        const endText = `${endDayText} ${endDate}`;
        if (startDate === endDate) {
            if (dayoff.startPeriod && dayoff.endPeriod && dayoff.startPeriod === dayoff.endPeriod) {
                return getText('dayoff.phrase_oneday', `${startText} ${getText(`common.${dayoff.startPeriod}`).toLowerCase()}`);
            } if (!dayoff.startPeriod && dayoff.endPeriod === 'am') {
                return getText('dayoff.phrase_oneday', `${startText} ${getText('common.am').toLowerCase()}`);
            } if (!dayoff.endPeriod && dayoff.startPeriod === 'pm') {
                return getText('dayoff.phrase_oneday', `${startText} ${getText('common.pm').toLowerCase()}`);
            }
            return getText('dayoff.phrase_oneday', startText);
        }
        const startPhrase = startText + (
            dayoff.startPeriod
                ? ` ${getText(`common.${dayoff.startPeriod}`).toLowerCase()}`
                : ''
        );
        const endPhrase = endText + (
            dayoff.endPeriod
                ? ` ${getText(`common.${dayoff.endPeriod}`).toLowerCase()}`
                : ''
        );
        return getText('dayoff.phrase', startPhrase, endPhrase);
    }

};

module.exports = Attachments;
