const DayJS = require('dayjs');
const Chai = require('chai');

const { expect } = Chai;

const API = require('../utils/api.js');
const DayoffService = require('../../src/services/dayoff.js');
const ConfigurationController = require('../../src/api/controllers/configuration.js');

const {
    EndBeforeStartError,
    NoWorkDaysError
} = require('../../src/services/errors.js');

const slackUser = {
    slackId: 'UGJ7AYX32',
    avatar: 'https://fake-url-slack-avatar-12345.fr/avatar.png',
    name: 'Jeanine'
};

describe('[Services] Dayoff', () => {
    before(async () => {
        await API.init();
    });

    describe('process', () => {
        it('Should throw error because end date before start date', async () => {
            const { workDays } = await ConfigurationController.getProxy();
            expect(() => {
                DayoffService.process({
                    start: new Date('2019-12-05'),
                    end: new Date('2019-12-01')
                }, workDays);
            }).to.throw(EndBeforeStartError);
        });

        it('Should throw error because no work day', async () => {
            const { workDays } = await ConfigurationController.getProxy();
            expect(() => {
                DayoffService.process({
                    start: new Date('2019-11-30'),
                    end: new Date('2019-12-01')
                }, workDays);
            }).to.throw(NoWorkDaysError);
        });

        it('Should process dayoff data and return correct information', async () => {
            const { workDays } = await ConfigurationController.getProxy();
            const daysoff = [{
                // la période comporte un week end et un jour férié (1er novembre)
                data: {
                    start: new Date('2019-10-30'),
                    end: new Date('2019-11-05'),
                    comment: 'Some test comment',
                    slackUser
                },
                expected: {
                    start: '2019-10-30',
                    end: '2019-11-05',
                    days: ['2019-10-30', '2019-10-31', '2019-11-04', '2019-11-05'],
                    startPeriod: 'am',
                    endPeriod: 'pm',
                    count: 4,
                    comment: 'Some test comment',
                    canceled: false,
                    confirmed: false,
                    slackUser
                }
            }, {
                // la période comporte un week end et un jour férié (pâques)
                data: {
                    start: new Date('2019-04-18'),
                    end: new Date('2019-04-24'),
                    startPeriod: 'pm',
                    endPeriod: 'am',
                    slackUser
                },
                expected: {
                    start: '2019-04-18',
                    end: '2019-04-24',
                    days: ['2019-04-18', '2019-04-19', '2019-04-23', '2019-04-24'],
                    startPeriod: 'pm',
                    endPeriod: 'am',
                    count: 3,
                    comment: '',
                    canceled: false,
                    confirmed: false,
                    slackUser
                }
            }, {
                // la période commence et se termine dans des week-end
                // les demi journées seront reset car les jours de
                // début et fin seront ignorés (week end)
                data: {
                    start: new Date('2019-11-23'),
                    end: new Date('2019-11-30'),
                    startPeriod: 'pm',
                    endPeriod: 'am',
                    slackUser
                },
                expected: {
                    start: '2019-11-25',
                    end: '2019-11-29',
                    days: ['2019-11-25', '2019-11-26', '2019-11-27', '2019-11-28', '2019-11-29'],
                    startPeriod: 'am',
                    endPeriod: 'pm',
                    count: 5,
                    comment: '',
                    canceled: false,
                    confirmed: false,
                    slackUser
                }
            }];
            for (const dayoff of daysoff) {
                const processed = DayoffService.process(dayoff.data, workDays);
                if (dayoff.expected.start === null) {
                    expect(processed.start).to.be.null;
                } else {
                    expect(
                        DayJS(processed.start).format('YYYY-MM-DD')
                    ).to.equal(dayoff.expected.start);
                }
                if (dayoff.expected.end === null) {
                    expect(processed.end).to.be.null;
                } else {
                    expect(
                        DayJS(processed.end).format('YYYY-MM-DD')
                    ).to.equal(dayoff.expected.end);
                }
                expect(processed.startPeriod).to.equal(dayoff.expected.startPeriod);
                expect(processed.endPeriod).to.equal(dayoff.expected.endPeriod);
                expect(
                    processed.days.map((day) => DayJS(day).format('YYYY-MM-DD'))
                ).to.have.members(dayoff.expected.days);
                expect(processed.count).to.equal(dayoff.expected.count);
                expect(processed.comment).to.equal(dayoff.expected.comment);
                expect(processed.slackUser).to.be.an('object');
                expect(processed.canceled).to.be.false;
                expect(processed.confirmed).to.be.false;
                expect(
                    DayJS(processed.created).format('YYYY-MM-DD')
                ).to.equal(DayJS().format('YYYY-MM-DD'));
                expect(
                    DayJS(processed.updated).format('YYYY-MM-DD')
                ).to.equal(DayJS().format('YYYY-MM-DD'));
            }
        });
    });

    describe('getHolidays', () => {
        it('Should get holidays for given years', () => {
            expect(
                DayoffService.getHolidays([2018, 2019], 'YYYY-MM-DD')
            ).to.have.members([
                // On ne considère plus les lundis de Pentecôte
                '2018-01-01', '2018-04-02', '2018-05-01', '2018-05-08', '2018-05-10', // '2018-05-21',
                '2018-07-14', '2018-08-15', '2018-11-01', '2018-11-11', '2018-12-25',
                '2019-01-01', '2019-04-22', '2019-05-01', '2019-05-08', '2019-05-30', // '2019-06-10',
                '2019-07-14', '2019-08-15', '2019-11-01', '2019-11-11', '2019-12-25'
            ]);
        });
    });
});
