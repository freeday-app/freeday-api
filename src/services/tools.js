const CronParser = require('cron-parser');
const Fs = require('fs');
const DayJS = require('dayjs');
const Path = require('path');
const RandToken = require('rand-token');

const Tools = {

    arrayIntersect(a, b) {
        return a.filter((v) => b.indexOf(v) !== -1);
    },

    buildUrl(...args) {
        const items = [];
        for (const arg of args) {
            items.push(Tools.trimChar(arg, '/'));
        }
        return items.join('/');
    },

    buildMongoUri(baseUri, database) {
        if (baseUri.includes('?')) {
            return baseUri.replace(/(\/\?)|(\?)/, `/${database}?`);
        }
        return `${Tools.trimChar(baseUri, '/')}/${database}`;
    },

    extract(object, keys) {
        const extracted = {};
        keys.forEach((key) => {
            if (Object.hasOwnProperty.call(object, key)) {
                extracted[key] = object[key];
            }
        });
        return extracted;
    },

    defaults(obj, defaults, restrictKeys = null) {
        const merged = {};
        Object.keys(defaults).forEach((key) => {
            if (!restrictKeys || restrictKeys.includes(key)) {
                if (Object.hasOwnProperty.call(obj, key)) {
                    merged[key] = obj[key];
                } else {
                    merged[key] = defaults[key];
                }
            }
        });
        return merged;
    },

    // set ucfirst on each part of a name
    formatName(name) {
        return name.toLowerCase().split(' ').map((s) => Tools.ucfirst(s)).join(' ');
    },

    generateRandomPassword(length = 8) {
        return Math.random().toString(36).slice(-length);
    },

    async generateToken() {
        return RandToken.generate(32);
    },

    async getFileContent(path) {
        return new Promise((resolve, reject) => {
            Fs.readFile(path, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    },

    async getJsonFileContent(path) {
        const content = await Tools.getFileContent(path);
        return JSON.parse(content);
    },

    inArray(v, a) {
        return a.indexOf(v) !== -1;
    },

    isBase64(string) {
        const regex = /^(?:data:\w+\/[a-zA-Z+-.]+;base64,)(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/i;
        return regex.test(string);
    },

    isBoolean(v, stringAllowed = false) {
        return typeof v === 'boolean' || (
            stringAllowed && ['true', 'false'].includes(v)
        );
    },

    parseBooleanString(v) {
        return v === 'true' || v === true;
    },

    isEmail(string) {
        const regex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return regex.test(String(string).toLowerCase());
    },

    isMongoId(string) {
        return /^[0-9a-fA-F]{24}$/.test(string);
    },

    isSlackId(string) {
        return /^[A-Z]{1}[A-Z0-9]{8,10}$/.test(string);
    },

    isSlackUserId(string) {
        return /^[UW]{1}[A-Z0-9]{8,10}$/.test(string);
    },

    isSlackTeamId(string) {
        return /^T[A-Z0-9]{8,10}$/.test(string);
    },

    isString(string, minLength = 0, maxLength = null) {
        return typeof string === 'string' && string.length >= minLength && (!maxLength || string.length <= maxLength);
    },

    isValidTheme(string) {
        return ['light', 'dark'].includes(string);
    },

    listFiles(dir, exclusions = []) {
        const files = [];
        let path;
        let name;
        Fs.readdirSync(dir).forEach((filename) => {
            path = Path.join(dir, filename);
            name = Path.parse(filename).name;
            if (!Fs.lstatSync(path).isDirectory() && (
                exclusions.length === 0
                || (
                    !Tools.inArray(filename, exclusions)
                    && !Tools.inArray(name, exclusions)
                )
            )) {
                files.push(filename);
            }
        });
        return files;
    },

    splitChars(string, chrs) {
        const chars = Array.isArray(chrs) ? chrs : chrs.split('');
        let array = string;
        chars.forEach((char, idx) => {
            array = array.split(char);
            if (idx < chars.length - 1) {
                array = array.join(chars[idx + 1]);
            }
        });
        return array;
    },

    removeFileExt(filename) {
        return Path.parse(filename).name;
    },

    trimChar(str, char) {
        let string = str;
        while (string.charAt(0) === char) {
            string = string.substring(1);
        }
        while (string.charAt(string.length - 1) === char) {
            string = string.substring(0, string.length - 1);
        }
        return string;
    },

    ucfirst(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    // Job tools

    isCronDayOfMonth(string) {
        const regex = /(^\*$)|(^[1-9]$)|(^[1-2][0-9]$)|(^3[0-1]$)/g;
        return regex.test(string);
    },

    isCronHour(string) {
        const regex = /(^\*$)|(^[0-9]$)|(^1[0-9]$)|(^2[0-3]$)/g;
        return regex.test(string);
    },

    isCronMinute(string) {
        const regex = /(^\*$)|(^[0-9]$)|(^[1-5][0-9]$)/g;
        return regex.test(string);
    },

    // tests if a job should be run at the current time
    jobShouldRun(job, lastUpdate) {
        const startDate = DayJS(lastUpdate).toDate();
        const next = Tools.nextDateSince(startDate, job);
        const now = DayJS();
        return job.enabled && (next <= now);
    },

    // returns the next day.js date since a specific date for a cron pattern
    nextDateSince(date, pattern) {
        // completes the pattern with default values
        const p = {
            minute: '0',
            hour: '0',
            dayOfMonth: '1',
            month: '*',
            dayOfWeek: '*',
            ...pattern
        };
        const cronPattern = `${p.minute} ${p.hour} ${p.dayOfMonth} ${p.month} ${p.dayOfWeek}`;
        const options = {
            currentDate: date
        };
        const cronIterator = CronParser.parseExpression(cronPattern, options);
        return DayJS(cronIterator.next().toDate());
    },

    durationToNextMinute() {
        const now = DayJS();
        const then = DayJS().startOf('minute').add(1, 'minutes');
        return then.diff(now);
    }

};

module.exports = Tools;
