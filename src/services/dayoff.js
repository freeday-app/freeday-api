const DayJS = require('dayjs');

const Models = require('../api/models/index.js');
const {
    NoWorkDaysError,
    EndBeforeStartError,
    ConflictError,
    DisabledDayoffTypeError,
    ValidationError
} = require('./errors.js');

const DayoffService = {

    // contrôle et complète données absence
    // calcule liste jours en prenant en compte week-ends et fériés
    // réajuste dates de début et fin en fonction de la liste des jours valides
    // calcule compte de jours total en prenant en compte demi-journées
    process(data, workDays, withMeta = true) {
        const dayoffData = data;
        ['start', 'end'].forEach((field) => {
            if (dayoffData[field] && !(dayoffData[field] instanceof Date)) {
                dayoffData[field] = DayJS(dayoffData[field]).toDate();
            }
        });
        // contrôle que date début inférieure à date de fin
        const startFormat = DayJS(dayoffData.start).format('YYYY-MM-DD');
        const endFormat = DayJS(dayoffData.end).format('YYYY-MM-DD');
        if ((
            dayoffData.end && startFormat > endFormat
        ) || (
            (!dayoffData.end || startFormat === endFormat)
            && dayoffData.startPeriod === 'pm' && dayoffData.endPeriod === 'am'
        )) {
            throw new EndBeforeStartError();
        }
        // set date de début à aujourd'hui si pas définie
        if (!dayoffData.start) {
            dayoffData.start = DayJS().toDate();
        }
        // set nombre de jour si pas set et pas de date de fin
        if (!dayoffData.nbDays && !dayoffData.end) {
            dayoffData.nbDays = 1;
        }
        // calcule et insère liste des jours de l'absence
        let until = dayoffData.end;
        if (!dayoffData.end) {
            if (dayoffData.nbDays) {
                until = dayoffData.nbDays;
            } else {
                until = dayoffData.start;
            }
        }
        dayoffData.days = DayoffService.getDays(dayoffData.start, until, workDays);
        // récupère les dates de début et fin depuis la liste des jours
        // pour profiter du calcul et des décalages selon week-ends et
        // jours fériés si jours début ou fin initiaux différents de ceux
        // récupérés dans la liste alors reset demi-journées
        const initialStartUs = DayJS(dayoffData.start).format('YYYY-MM-DD');
        const dayListStartUs = DayJS(dayoffData.days[0]).format('YYYY-MM-DD');
        const initialEndUs = DayJS(dayoffData.end).format('YYYY-MM-DD');
        const dayListEndUs = DayJS(dayoffData.days[dayoffData.days.length - 1]).format('YYYY-MM-DD');
        if (initialStartUs !== dayListStartUs) {
            dayoffData.startPeriod = null;
        }
        if (initialEndUs !== dayListEndUs) {
            dayoffData.endPeriod = null;
        }
        dayoffData.start = dayoffData.days[0] || null;
        dayoffData.end = dayoffData.days[dayoffData.days.length - 1] || null;
        // set demi journées par défaut
        if (!dayoffData.startPeriod) {
            dayoffData.startPeriod = 'am';
        }
        if (!dayoffData.endPeriod) {
            dayoffData.endPeriod = 'pm';
        }
        // set compte jours absence
        dayoffData.count = dayoffData.days.length;
        if (dayoffData.startPeriod === 'pm') {
            dayoffData.count -= 0.5;
        }
        if (dayoffData.endPeriod === 'am') {
            dayoffData.count -= 0.5;
        }
        // set commentaire vide si null
        if (!dayoffData.comment) {
            dayoffData.comment = '';
        }
        // si aucun jour ouvré dans absence throw erreur
        if (dayoffData.count <= 0) {
            throw new NoWorkDaysError();
        }
        // parse sous document user slack
        if (dayoffData.slackUser.toJSON) {
            dayoffData.slackUser = dayoffData.slackUser.toJSON();
        }
        delete dayoffData.slackUser._id;
        delete dayoffData.slackUser.id;
        // renvoie données avec derniers champs additionnels
        return {
            type: dayoffData.type,
            slackUser: dayoffData.slackUser,
            start: dayoffData.start,
            end: dayoffData.end,
            startPeriod: dayoffData.startPeriod,
            endPeriod: dayoffData.endPeriod,
            days: dayoffData.days,
            count: dayoffData.count,
            comment: dayoffData.comment,
            ...(
                dayoffData.cancelReason && {
                    cancelReason: dayoffData.cancelReason
                }
            ),
            ...(
                withMeta ? {
                    canceled: false,
                    confirmed: false,
                    created: DayJS().toDate(),
                    updated: DayJS().toDate()
                } : {}
            )
        };
    },

    // renvoie liste dates de l'absence
    // en excluant week-ends et jours fériés
    // selon date de début et nombre de jours si until est un entier
    // ou selon date de début et fin si until est une date
    getDays(startDate, until, workDays) {
        const days = [];
        // si calcul sur nombre de jours ou date de fin
        const isEnd = until instanceof Date;
        // parse dates into day.js dates
        const startDay = DayJS(startDate);
        let currentDay = startDay;
        const endDay = isEnd ? DayJS(until) : null;
        const nbDays = isEnd ? null : parseInt(until);
        // récupères années pour jours fériés
        let thisYear = startDay.year();
        const futureYear = isEnd ? (
            endDay.year()
        ) : (
            startDay.add(nbDays, 'days').add(1, 'years').year()
        );
        const years = [];
        while (thisYear <= futureYear) {
            years.push(thisYear);
            thisYear += 1;
        }
        // jours fériés
        const holidayList = this.getHolidays(years, 'YYYY-MM-DD');
        const holidayObj = {};
        holidayList.forEach((date) => {
            holidayObj[date] = true;
        });
        if (isEnd) {
            // parcoure jours d'absences
            while (currentDay.isSameOrBefore(endDay)) {
                // si jour ouvré et non férié
                if (workDays.includes(currentDay.day()) && !holidayObj[currentDay.format('YYYY-MM-DD')]) {
                    // insère date
                    days.push(currentDay.toDate());
                }
                // incrémente date
                currentDay = currentDay.add(1, 'days');
            }
        } else {
            // parcoure jours d'absences
            for (let i = 0; i < nbDays; i += 1) {
                // tant que jour non ouvré ou férié rajoute jour
                while (!workDays.includes(currentDay.day()) || !!holidayObj[currentDay.format('YYYY-MM-DD')]) {
                    currentDay = currentDay.add(1, 'days');
                }
                // insère date
                days.push(currentDay.toDate());
                // incrémente date
                currentDay = currentDay.add(1, 'days');
            }
        }
        //
        return days;
    },

    // renvoie liste des dates fériés sur années ciblées
    getHolidays(yrs, format = false) {
        let years = yrs;
        if (!Array.isArray(years)) {
            years = [years];
        }
        const holidays = [];
        years.forEach((year) => {
            holidays.push(
                DayJS(`${year}-1-1`, 'YYYY-M-D'), // jour de l'an
                DayJS(`${year}-5-1`, 'YYYY-M-D'), // fête du travail
                DayJS(`${year}-5-8`, 'YYYY-M-D'), // victoire des alliés
                DayJS(`${year}-7-14`, 'YYYY-M-D'), // fête nationale
                DayJS(`${year}-8-15`, 'YYYY-M-D'), // assomption
                DayJS(`${year}-11-1`, 'YYYY-M-D'), // toussaint
                DayJS(`${year}-11-11`, 'YYYY-M-D'), // armistice
                DayJS(`${year}-12-25`, 'YYYY-M-D') // noël
            );
        });
        const easters = this.getEasters(years);
        easters.forEach((easter) => {
            holidays.push(easter.add(1, 'days')); // lundi de pâques
            holidays.push(easter.add(39, 'days')); // ascension
            // holidays.push(easter.add(50, 'days')); // lundi de pentecôte
        });
        if (format) {
            return holidays.map((holiday) => holiday.format(format));
        }
        return holidays.map((holiday) => holiday.toDate());
    },

    // renvoie dates pâques pour les années ciblées
    getEasters(years) {
        return years.map((year) => {
            const { floor } = Math;
            const G = year % 19;
            const C = floor(year / 100);
            const H = (C - floor(C / 4) - floor((8 * C + 13) / 25) + 19 * G + 15) % 30;
            const I = H - floor(H / 28) * (1 - floor(29 / (H + 1)) * floor((21 - G) / 11));
            const J = (year + floor(year / 4) + I + 2 - C + floor(C / 4)) % 7;
            const L = I - J;
            const month = 3 + floor((L + 40) / 44);
            const day = L + 28 - 31 * floor(month / 4);
            return DayJS(`${year}-${month}-${day}`, 'YYYY-M-D');
        });
    },

    // contrôle conflits entre absence donnée et absences existantes
    // renvoie liste des absences en conflit
    async getConflicts(dayoff, throwError = false) {
        const conflicts = [];
        const conflictStatus = [
            'confirmed',
            'pending'
        ];
        // données absence à contrôler
        const dayoffStartFormat = DayJS(dayoff.start).format('YYYY-MM-DD');
        const dayoffEndFormat = DayJS(dayoff.end).format('YYYY-MM-DD');
        const dayoffDaysObject = {};
        dayoff.days.forEach((day) => {
            dayoffDaysObject[DayJS(day).format('YYYY-MM-DD')] = true;
        });
        // objet requête absences à contrôler
        const find = {
            'slackUser.slackId': dayoff.slackUser.slackId
        };
        const statusFindObj = (status) => ({
            confirmed: status === 'confirmed',
            canceled: status === 'canceled'
        });
        if (conflictStatus) {
            if (Array.isArray(conflictStatus)) {
                find.$or = conflictStatus.map((s) => statusFindObj(s));
            } else {
                const statusObj = statusFindObj(conflictStatus);
                find.confirmed = statusObj.confirmed;
                find.canceled = statusObj.canceled;
            }
        }
        if (dayoff.id) {
            find._id = {
                $ne: dayoff.id
            };
        }
        // récupère liste absences à contrôler
        const existingDaysoff = await Models.Dayoff.find(find).exec();
        // parcoure absences existantes
        for (const existingDayoff of existingDaysoff) {
            const existingStartFormat = DayJS(existingDayoff.start).format('YYYY-MM-DD');
            const existingEndFormat = DayJS(existingDayoff.end).format('YYYY-MM-DD');
            // compare listes jours
            for (const existingDay of existingDayoff.days) {
                const existingDayFormat = DayJS(existingDay).format('YYYY-MM-DD');
                // si jour en commun
                if (dayoffDaysObject[existingDayFormat]) {
                    // vérifie les cas où même jour mais pas
                    // de conflit car demi journées différentes
                    if (!(
                        existingDayFormat === existingEndFormat
                        && existingDayFormat === dayoffStartFormat
                        && dayoff.startPeriod === 'pm'
                        && existingDayoff.endPeriod === 'am'
                    ) && !(
                        existingDayFormat === existingStartFormat
                        && existingDayFormat === dayoffEndFormat
                        && dayoff.endPeriod === 'am'
                        && existingDayoff.startPeriod === 'pm'
                    )) {
                        conflicts.push(existingDayoff.toJSON());
                        break;
                    }
                }
            }
        }
        // throw erreur si demandé et conflits détectés
        if (throwError && conflicts.length > 0) {
            throw new ConflictError(
                'Conflict with existing daysoff',
                conflicts
            );
        }
        return conflicts;
    },

    // contrôle qu'un type d'absence est activé
    async controlType(typeId) {
        const dayoffType = await Models.DayoffType.findOne({
            _id: typeId,
            enabled: true
        }).exec();
        if (dayoffType) {
            if (dayoffType.enabled) {
                return dayoffType;
            }
            throw new DisabledDayoffTypeError(`Dayoff type ${typeId} is disabled`);
        }
        throw new ValidationError(`Wrong dayoff type '${typeId}'`);
    },

    // vérifie les modifications faites à une absence éditée
    async isDifferent(previousDayoff, editedDayoff) {
        const {
            end, endPeriod, start, startPeriod, comment
        } = editedDayoff;
        const endP = previousDayoff.end;
        const endPeriodP = previousDayoff.endPeriod;
        const startP = previousDayoff.start;
        const startPeriodP = previousDayoff.startPeriod;
        const commentP = previousDayoff.comment;
        const validStart = DayJS(start).isSame(DayJS(startP));
        const validEnd = DayJS(end).isSame(DayJS(endP));
        if (validStart && endPeriod === endPeriodP && validEnd && startPeriod === startPeriodP) {
            if (comment !== commentP) {
                return false;
            }
        }
        return true;
    }
};

module.exports = DayoffService;
