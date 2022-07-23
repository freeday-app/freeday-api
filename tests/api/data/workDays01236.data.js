module.exports = (slackUsers) => {
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ noWorkDay

    const noWorkDay = {
        slackUserId: slackUsers[0].slackId,
        start: '2019-11-28',
        end: '2019-11-29'
    };

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ create

    const create = [{
        post: {
            slackUserId: slackUsers[0].slackId,
            start: '2019-12-15',
            end: '2019-12-17',
            startPeriod: 'pm',
            endPeriod: 'am',
            comment: 'Some comment'
        },
        expected: {
            count: 2,
            start: '2019-12-15',
            end: '2019-12-17',
            startPeriod: 'pm',
            endPeriod: 'am',
            days: [
                '2019-12-15',
                '2019-12-16',
                '2019-12-17'
            ],
            slackUser: slackUsers[0],
            comment: 'Some comment',
            canceled: false,
            confirmed: false
        }
    }, {
        post: {
            slackUserId: slackUsers[0].slackId,
            start: '2019-11-25'
        },
        expected: {
            count: 1,
            start: '2019-11-25',
            end: '2019-11-25',
            startPeriod: 'am',
            endPeriod: 'pm',
            days: [
                '2019-11-25'
            ],
            slackUser: slackUsers[0],
            comment: '',
            canceled: false,
            confirmed: false
        }
    }, {
        post: {
            slackUserId: slackUsers[1].slackId,
            start: '2019-12-14',
            end: '2019-12-15',
            endPeriod: 'am'
        },
        expected: {
            count: 1.5,
            start: '2019-12-14',
            end: '2019-12-15',
            startPeriod: 'am',
            endPeriod: 'am',
            days: [
                '2019-12-14',
                '2019-12-15'
            ],
            slackUser: slackUsers[1],
            comment: '',
            canceled: false,
            confirmed: false
        }
    }, {
        post: {
            slackUserId: slackUsers[2].slackId,
            start: '2020-01-19',
            end: '2020-01-20'
        },
        expected: {
            count: 2,
            start: '2020-01-19',
            end: '2020-01-20',
            startPeriod: 'am',
            endPeriod: 'pm',
            days: [
                '2020-01-19',
                '2020-01-20'
            ],
            slackUser: slackUsers[2],
            comment: '',
            canceled: false,
            confirmed: false
        }
    }, {
        post: {
            slackUserId: slackUsers[0].slackId,
            start: '2019-11-26',
            end: '2019-11-30',
            startPeriod: 'pm',
            endPeriod: 'am',
            comment: 'Some comment'
        },
        expected: {
            count: 2,
            start: '2019-11-26',
            end: '2019-11-30',
            startPeriod: 'pm',
            endPeriod: 'am',
            days: [
                '2019-11-26',
                '2019-11-27',
                '2019-11-30'
            ],
            slackUser: slackUsers[0],
            comment: 'Some comment',
            canceled: false,
            confirmed: false
        }
    }, {
        post: {
            slackUserId: slackUsers[1].slackId,
            start: '2019-12-17',
            end: '2019-12-18',
            startPeriod: 'pm'
        },
        expected: {
            count: 1.5,
            start: '2019-12-17',
            end: '2019-12-18',
            startPeriod: 'pm',
            endPeriod: 'pm',
            days: [
                '2019-12-17',
                '2019-12-18'
            ],
            slackUser: slackUsers[1],
            comment: '',
            canceled: false,
            confirmed: false
        }
    }, {
        post: {
            slackUserId: slackUsers[2].slackId,
            start: '2020-01-12',
            end: '2020-01-14'
        },
        expected: {
            count: 3,
            start: '2020-01-12',
            end: '2020-01-14',
            startPeriod: 'am',
            endPeriod: 'pm',
            days: [
                '2020-01-12',
                '2020-01-13',
                '2020-01-14'
            ],
            slackUser: slackUsers[2],
            comment: '',
            canceled: false,
            confirmed: false
        }
    }];

    const activeSlackUsers = slackUsers.filter(({ deleted }) => !deleted);

    const createBulk = {
        post: {
            slackUserId: activeSlackUsers.map(({ slackId }) => slackId),
            start: '2022-07-25',
            end: '2022-07-27',
            startPeriod: 'am',
            endPeriod: 'pm',
            comment: 'Bulk comment'
        },
        expected: activeSlackUsers.map((slackUser) => ({
            count: 3,
            start: '2022-07-25',
            end: '2022-07-27',
            startPeriod: 'am',
            endPeriod: 'pm',
            days: [
                '2022-07-25',
                '2022-07-26',
                '2022-07-27'
            ],
            slackUser,
            comment: 'Bulk comment',
            canceled: false,
            confirmed: false
        }))
    };

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ conflict

    const conflict = [{
        base: {
            slackUserId: slackUsers[0].slackId,
            start: '2019-10-13'
        },
        conflicts: [{
            slackUserId: slackUsers[0].slackId,
            start: '2019-10-12',
            end: '2019-10-16'
        }, {
            slackUserId: slackUsers[0].slackId,
            start: '2019-10-12',
            end: '2019-10-13',
            startPeriod: 'pm',
            endPeriod: 'am'
        }, {
            slackUserId: slackUsers[0].slackId,
            start: '2019-10-12',
            end: '2019-10-16',
            startPeriod: 'pm',
            endPeriod: 'am'
        }]
    }, {
        base: {
            slackUserId: slackUsers[0].slackId,
            start: '2019-10-20',
            end: '2019-10-22',
            startPeriod: 'pm',
            endPeriod: 'am'
        },
        conflicts: [{
            slackUserId: slackUsers[0].slackId,
            start: '2019-10-19',
            end: '2019-10-21'
        }, {
            slackUserId: slackUsers[0].slackId,
            start: '2019-10-21',
            end: '2019-10-23'
        }]
    }, {
        base: {
            slackUserId: slackUsers[1].slackId,
            start: '2019-10-27',
            end: '2019-10-29',
            startPeriod: 'am',
            endPeriod: 'pm'
        },
        conflicts: [{
            slackUserId: slackUsers[1].slackId,
            start: '2019-10-27',
            end: '2019-10-29',
            startPeriod: 'am',
            endPeriod: 'pm'
        }, {
            slackUserId: slackUsers[1].slackId,
            start: '2019-10-28'
        }]
    }];

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ edit

    const edit = {
        post: {
            start: '2019-12-08',
            end: '2019-12-11',
            startPeriod: 'pm',
            endPeriod: 'pm',
            comment: 'Random comment'
        },
        expected: {
            count: 3.5,
            start: '2019-12-08',
            end: '2019-12-11',
            startPeriod: 'pm',
            endPeriod: 'pm',
            days: [
                '2019-12-08',
                '2019-12-09',
                '2019-12-10',
                '2019-12-11'
            ],
            slackUser: slackUsers[0],
            comment: 'Random comment',
            canceled: false,
            confirmed: false
        }
    };

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ blank

    const blank = {
        ...create[0].post,
        start: '2020-01-05',
        end: '2020-01-06'
    };

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ return

    return {
        noWorkDay,
        create,
        createBulk,
        conflict,
        edit,
        blank
    };
};
