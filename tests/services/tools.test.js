const DayJS = require('dayjs');
const Path = require('path');
const { expect } = require('chai');

const Tools = require('../../src/services/tools.js');

describe('[Services] Tools', () => {
    describe('arrayIntersect', () => {
        it('Should filter values that two arrays have in common', () => {
            const a1 = ['a', 1, false, 'c', 555];
            const a2 = [555, 'b', true, false, 'c'];
            const expected = [555, false, 'c'];
            const intersect = Tools.arrayIntersect(a1, a2);
            expect(intersect).to.have.members(expected);
        });
    });

    describe('buildUrl', () => {
        it('Should build URLs from given parts', () => {
            const data = [{
                parts: ['https://test.domain.com', 'path', '/to', 'route/'],
                expected: 'https://test.domain.com/path/to/route'
            }, {
                parts: ['localhost:1234', 'path'],
                expected: 'localhost:1234/path'
            }];
            for (const dt of data) {
                expect(Tools.buildUrl(...dt.parts)).to.equal(dt.expected);
            }
        });
    });

    describe('buildMongoUri', () => {
        it('Should build mongo URIs from given parts', () => {
            const data = [{
                parts: {
                    baseUri: 'mongodb://localhost:27017',
                    database: 'freeday-test'
                },
                expected: 'mongodb://localhost:27017/freeday-test'
            }, {
                parts: {
                    baseUri: 'mongodb://localhost:2717/',
                    database: 'freeday-test'
                },
                expected: 'mongodb://localhost:2717/freeday-test'
            }, {
                parts: {
                    baseUri: 'mongodb://user:pass@server1:2717,server2:2717,server3:2717/?authSource=admin&replicaSet=rs0',
                    database: 'freeday-test'
                },
                expected: 'mongodb://user:pass@server1:2717,server2:2717,server3:2717/freeday-test?authSource=admin&replicaSet=rs0'
            }, {
                parts: {
                    baseUri: 'mongodb://user:pass@server1:2717,server2:2717,server3:2717?authSource=admin&replicaSet=rs0',
                    database: 'freeday-test'
                },
                expected: 'mongodb://user:pass@server1:2717,server2:2717,server3:2717/freeday-test?authSource=admin&replicaSet=rs0'
            }];
            for (const dt of data) {
                expect(Tools.buildMongoUri(
                    dt.parts.baseUri,
                    dt.parts.database
                )).to.equal(dt.expected);
            }
        });
    });

    describe('extract', () => {
        it('Should extract object values of specified keys', () => {
            const object = {
                a: 'a', 1: '1', b: 'b', 2: '2', c: 'c'
            };
            const keys = ['a', 2, 'c'];
            const expectedJson = JSON.stringify({ a: 'a', 2: '2', c: 'c' });
            const extracted = Tools.extract(object, keys);
            const extractedJson = JSON.stringify(extracted);
            expect(extractedJson).to.equal(expectedJson);
        });
    });

    describe('defaults', () => {
        it('Should merge object with default values', () => {
            const object = { a: 'a', c: 'c' };
            const defaults = {
                a: 'aaa', b: 'bbb', c: 'ccc', d: 'ddd'
            };
            const expectedJson = JSON.stringify({
                a: 'a', b: 'bbb', c: 'c', d: 'ddd'
            });
            const merged = Tools.defaults(object, defaults);
            const mergedJson = JSON.stringify(merged);
            expect(mergedJson).to.equal(expectedJson);
        });
    });

    describe('generateRandomPassword', () => {
        it('Should generate a random password', () => {
            const password = Tools.generateRandomPassword(10);
            expect(password).to.match(/^[.a-z0-9]{10}$/);
        });
    });

    describe('formatName', () => {
        it('Should format names with first letter uppercased', () => {
            const strings = [
                'test test',
                'test Test',
                'Test test'
            ];
            const expected = 'Test Test';
            for (const string of strings) {
                expect(Tools.formatName(string)).to.equal(expected);
            }
        });
    });

    describe('inArray', () => {
        it('Should detect if value exists within array', () => {
            const array = ['a', 'b', 'c', 10, 20];
            expect(Tools.inArray('a', array)).to.be.true;
            expect(Tools.inArray(10, array)).to.be.true;
            expect(Tools.inArray('e', array)).to.be.false;
        });
    });

    describe('isBoolean', () => {
        it('Should detect if value is a boolean', () => {
            expect(Tools.isBoolean(true)).to.be.true;
            expect(Tools.isBoolean(false)).to.be.true;
            expect(Tools.isBoolean(0)).to.be.false;
            expect(Tools.isBoolean(1)).to.be.false;
            expect(Tools.isBoolean(2)).to.be.false;
            expect(Tools.isBoolean('')).to.be.false;
            expect(Tools.isBoolean('a')).to.be.false;
            expect(Tools.isBoolean(NaN)).to.be.false;
            expect(Tools.isBoolean(null)).to.be.false;
            expect(Tools.isBoolean(undefined)).to.be.false;
        });
    });

    describe('parseBooleanString', () => {
        it('Should parse from string to boolean', () => {
            expect(Tools.parseBooleanString('true')).to.equal(true);
            expect(Tools.parseBooleanString(true)).to.equal(true);
            expect(Tools.parseBooleanString('false')).to.equal(false);
            expect(Tools.parseBooleanString(false)).to.equal(false);
            expect(Tools.parseBooleanString(0)).to.equal(false);
            expect(Tools.parseBooleanString(1)).to.equal(false);
            expect(Tools.parseBooleanString(2)).to.equal(false);
            expect(Tools.parseBooleanString('')).to.equal(false);
            expect(Tools.parseBooleanString('a')).to.equal(false);
            expect(Tools.parseBooleanString(NaN)).to.equal(false);
            expect(Tools.parseBooleanString(null)).to.equal(false);
            expect(Tools.parseBooleanString(undefined)).to.equal(false);
        });
    });

    describe('isEmail', () => {
        it('Should detect if string is a valid email', () => {
            expect(Tools.isEmail('random@domain.com')).to.be.true;
            expect(Tools.isEmail('the.random.name@domain.test.com')).to.be.true;
            expect(Tools.isEmail('there.is.something.missing.com')).to.be.false;
            expect(Tools.isEmail('what is going @on.com')).to.be.false;
            expect(Tools.isEmail('it.is.not.okay@')).to.be.false;
            expect(Tools.isEmail('@where.is')).to.be.false;
        });
    });

    describe('isMongoId', () => {
        it('Should check if string is a valid MongoDB ID', () => {
            const values = {
                '5daf57698ea524058bbd0e1f': true,
                '5daf577a8ea524058bbd0e20': true,
                '5dc74a5f3d600315a7c13e28': true,
                '5dc80daf5d661d0368dd4a29': true,
                '5daf57698eb52e058bbd0e1f': false,
                '5duf577a8ea5240581bd0x20': false,
                aaa111222: false
            };
            Object.values(values).forEach((id) => {
                if (values[id]) {
                    expect(Tools.isMongoId(id)).to.be.true;
                } else {
                    expect(Tools.isMongoId(id)).to.be.false;
                }
            });
        });
    });

    describe('isSlackId', () => {
        it('Should check if string is a valid Slack ID', () => {
            const values = {
                U1R2DK6E9: true,
                T73EXK68T: true,
                C734XK68T: true,
                '': false,
                '5dc745a7c13e28': false,
                aaa111222: false
            };
            Object.values(values).forEach((id) => {
                if (values[id]) {
                    expect(Tools.isSlackId(id)).to.be.true;
                } else {
                    expect(Tools.isSlackId(id)).to.be.false;
                }
            });
        });
    });

    describe('isSlackUserId', () => {
        it('Should check if string is a valid Slack user ID', () => {
            const values = {
                U1R2DK6E9: true,
                U73EXK68T: true,
                T73EXK68T: false,
                '': false,
                '5dc745a7c13e28': false,
                aaa111222: false
            };
            Object.values(values).forEach((id) => {
                if (values[id]) {
                    expect(Tools.isSlackUserId(id)).to.be.true;
                } else {
                    expect(Tools.isSlackUserId(id)).to.be.false;
                }
            });
        });
    });

    describe('isSlackTeamId', () => {
        it('Should check if string is a valid Slack team ID', () => {
            const values = {
                T1R2DK6E9: true,
                T73EXK68T: true,
                U73EXK68T: false,
                '': false,
                '5dc745a7c13e28': false,
                aaa111222: false
            };
            Object.values(values).forEach((id) => {
                if (values[id]) {
                    expect(Tools.isSlackTeamId(id)).to.be.true;
                } else {
                    expect(Tools.isSlackTeamId(id)).to.be.false;
                }
            });
        });
    });

    describe('isString', () => {
        it('Should check if value is a string', () => {
            expect(Tools.isString('')).to.be.true;
            expect(Tools.isString('aze')).to.be.true;
            expect(Tools.isString(123)).to.be.false;
            expect(Tools.isString(null)).to.be.false;
            expect(Tools.isString(true)).to.be.false;
            expect(Tools.isString(undefined)).to.be.false;
        });
    });

    describe('listFiles', () => {
        it('Should list files in directory', () => {
            const expectedFiles = [
                'cleanup.js',
                'crypt.js',
                'dayoff.js',
                'dialog.js',
                'env.js',
                'env.schema.json',
                'jobs.js',
                'language.js',
                'log.js',
                'paginator.js',
                'tools.js',
                'validator.js'
            ];
            const excludedFiles = [
                'errors.js',
                'statsLog'
            ];
            const files = Tools.listFiles(Path.join(__dirname, '../../src/services'), excludedFiles);
            expect(files).to.have.members(expectedFiles);
        });
    });

    describe('splitChars', () => {
        it('Should split string with given characters', () => {
            const string = 'Some string with some separator / Or not';
            const splitChars = ['with', '/'];
            const expectedArray = ['Some string ', ' some separator ', ' Or not'];
            const split = Tools.splitChars(string, splitChars);
            expect(split).to.have.members(expectedArray);
        });
    });

    describe('removeFileExt', () => {
        it('Should remove extension from file name', () => {
            expect(Tools.removeFileExt('file.ext')).to.equal('file');
            expect(Tools.removeFileExt('some.file.ext')).to.equal('some.file');
            expect(Tools.removeFileExt('/path/to/file.fl')).to.equal('file');
        });
    });

    describe('trimChar', () => {
        it('Should trim char from a string', () => {
            expect(Tools.trimChar('+++abc+++def+++', '+')).to.equal('abc+++def');
            expect(Tools.trimChar('/abc/def/', '/')).to.equal('abc/def');
            expect(Tools.trimChar('abc/def/', '/')).to.equal('abc/def');
            expect(Tools.trimChar('/abc/def', '/')).to.equal('abc/def');
            expect(Tools.trimChar('///', '/')).to.equal('');
            expect(Tools.trimChar('/', '/')).to.equal('');
        });
    });

    describe('ucfirst', () => {
        it('Should set first character of string as uppercase', () => {
            expect(Tools.ucfirst('abc')).to.equal('Abc');
            expect(Tools.ucfirst('test value!')).to.equal('Test value!');
        });
    });

    describe('jobShouldRun', () => {
        it('Should decide to run the job or not', () => {
            const job = {
                name: 'goodJob',
                dayOfMonth: '5',
                hour: '12',
                enabled: true
            };
            expect(Tools.jobShouldRun(job, '2019-10-05')).to.be.true;
            job.enabled = false;
            expect(Tools.jobShouldRun(job, '2019-10-05')).to.be.false;
            job.enabled = true;
            expect(Tools.jobShouldRun(job, '2222-11-11')).to.be.false;
        });
    });

    describe('nextDateSince', () => {
        it('Should give the next date', () => {
            const job = {
                name: 'goodJob',
                dayOfMonth: '5',
                hour: '12',
                enabled: true
            };
            expect(Tools.nextDateSince(DayJS('2020-10-26').toDate(), job).isSame(DayJS('2020-11-05 12:00'))).to.be.true;
            const pattern1 = {
                dayOfMonth: '31',
                hour: '*'
            };
            expect(Tools.nextDateSince(DayJS('2020-10-26').toDate(), pattern1).isSame(DayJS('2020-10-31 00:00'))).to.be.true;
            expect(Tools.nextDateSince(DayJS('2020-10-31 06:30').toDate(), pattern1).isSame(DayJS('2020-10-31 07:00'))).to.be.true;
            expect(Tools.nextDateSince(DayJS('2020-11-01 00:00').toDate(), pattern1).isSame(DayJS('2020-12-31 00:00'))).to.be.true;
            const pattern2 = {
                dayOfMonth: '*',
                hour: '22'
            };
            expect(Tools.nextDateSince(DayJS('2020-10-26 12:00').toDate(), pattern2).isSame(DayJS('2020-10-26 22:00'))).to.be.true;
            expect(Tools.nextDateSince(DayJS('2020-10-26 22:00').toDate(), pattern2).isSame(DayJS('2020-10-27 22:00'))).to.be.true;
            // every monday of december at 3:33
            const pattern3 = {
                dayOfMonth: '*',
                hour: '3',
                minute: '33',
                month: '12',
                dayOfWeek: '1'
            };
            expect(Tools.nextDateSince(DayJS('2020-10-26 12:00').toDate(), pattern3).isSame(DayJS('2020-12-07 03:33'))).to.be.true;
            expect(Tools.nextDateSince(DayJS('2020-12-30 12:00').toDate(), pattern3).isSame(DayJS('2021-12-06 03:33'))).to.be.true;
        });
    });
});
