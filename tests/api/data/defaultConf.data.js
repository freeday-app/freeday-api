module.exports = (slackUsers) => {
    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ noWorkDay

    const noWorkDay = {
        slackUserId: slackUsers[0].slackId,
        start: '2019-11-30',
        end: '2019-12-01'
    };

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ create

    const create = [{
        post: {
            slackUserId: slackUsers[0].slackId,
            start: '2019-12-17',
            end: '2019-12-19',
            startPeriod: 'pm',
            endPeriod: 'am',
            comment: 'Some comment'
        },
        expected: {
            count: 2,
            start: '2019-12-17',
            end: '2019-12-19',
            startPeriod: 'pm',
            endPeriod: 'am',
            days: [
                '2019-12-17',
                '2019-12-18',
                '2019-12-19'
            ],
            slackUser: slackUsers[0],
            comment: 'Some comment',
            canceled: false,
            confirmed: false
        }
    }, {
        post: {
            slackUserId: slackUsers[0].slackId,
            start: '2019-11-27'
        },
        expected: {
            count: 1,
            start: '2019-11-27',
            end: '2019-11-27',
            startPeriod: 'am',
            endPeriod: 'pm',
            days: [
                '2019-11-27'
            ],
            slackUser: slackUsers[0],
            comment: '',
            canceled: false,
            confirmed: false
        }
    }, {
        post: {
            slackUserId: slackUsers[1].slackId,
            start: '2019-12-16',
            end: '2019-12-17',
            endPeriod: 'am'
        },
        expected: {
            count: 1.5,
            start: '2019-12-16',
            end: '2019-12-17',
            startPeriod: 'am',
            endPeriod: 'am',
            days: [
                '2019-12-16',
                '2019-12-17'
            ],
            slackUser: slackUsers[1],
            comment: '',
            canceled: false,
            confirmed: false
        }
    }, {
        post: {
            slackUserId: slackUsers[2].slackId,
            start: '2020-01-21',
            end: '2020-01-22'
        },
        expected: {
            count: 2,
            start: '2020-01-21',
            end: '2020-01-22',
            startPeriod: 'am',
            endPeriod: 'pm',
            days: [
                '2020-01-21',
                '2020-01-22'
            ],
            slackUser: slackUsers[2],
            comment: '',
            canceled: false,
            confirmed: false
        }
    }, {
        post: {
            slackUserId: slackUsers[0].slackId,
            start: '2019-11-28',
            end: '2019-12-02',
            startPeriod: 'pm',
            endPeriod: 'am',
            comment: 'Some comment'
        },
        expected: {
            count: 2,
            start: '2019-11-28',
            end: '2019-12-02',
            startPeriod: 'pm',
            endPeriod: 'am',
            days: [
                '2019-11-28',
                '2019-11-29',
                '2019-12-02'
            ],
            slackUser: slackUsers[0],
            comment: 'Some comment',
            canceled: false,
            confirmed: false
        }
    }, {
        post: {
            slackUserId: slackUsers[1].slackId,
            start: '2019-12-19',
            end: '2019-12-20',
            startPeriod: 'pm'
        },
        expected: {
            count: 1.5,
            start: '2019-12-19',
            end: '2019-12-20',
            startPeriod: 'pm',
            endPeriod: 'pm',
            days: [
                '2019-12-19',
                '2019-12-20'
            ],
            slackUser: slackUsers[1],
            comment: '',
            canceled: false,
            confirmed: false
        }
    }, {
        post: {
            slackUserId: slackUsers[2].slackId,
            start: '2020-01-14',
            end: '2020-01-16'
        },
        expected: {
            count: 3,
            start: '2020-01-14',
            end: '2020-01-16',
            startPeriod: 'am',
            endPeriod: 'pm',
            days: [
                '2020-01-14',
                '2020-01-15',
                '2020-01-16'
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
            start: '2022-07-18',
            end: '2022-07-20',
            startPeriod: 'pm',
            endPeriod: 'am',
            comment: 'Bulk comment'
        },
        expected: activeSlackUsers.map((slackUser) => ({
            count: 2,
            start: '2022-07-18',
            end: '2022-07-20',
            startPeriod: 'pm',
            endPeriod: 'am',
            days: [
                '2022-07-18',
                '2022-07-19',
                '2022-07-20'
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
            start: '2019-10-15'
        },
        conflicts: [{
            slackUserId: slackUsers[0].slackId,
            start: '2019-10-14',
            end: '2019-10-18'
        }, {
            slackUserId: slackUsers[0].slackId,
            start: '2019-10-14',
            end: '2019-10-15',
            startPeriod: 'pm',
            endPeriod: 'am'
        }, {
            slackUserId: slackUsers[0].slackId,
            start: '2019-10-15',
            end: '2019-10-18',
            startPeriod: 'pm',
            endPeriod: 'am'
        }]
    }, {
        base: {
            slackUserId: slackUsers[0].slackId,
            start: '2019-10-22',
            end: '2019-10-24',
            startPeriod: 'pm',
            endPeriod: 'am'
        },
        conflicts: [{
            slackUserId: slackUsers[0].slackId,
            start: '2019-10-21',
            end: '2019-10-23'
        }, {
            slackUserId: slackUsers[0].slackId,
            start: '2019-10-23',
            end: '2019-10-25'
        }]
    }, {
        base: {
            slackUserId: slackUsers[1].slackId,
            start: '2019-10-29',
            end: '2019-10-31',
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
            start: '2019-10-30'
        }]
    }];

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ edit

    const edit = {
        post: {
            start: '2019-12-10',
            end: '2019-12-13',
            startPeriod: 'pm',
            endPeriod: 'pm',
            comment: 'Random comment'
        },
        expected: {
            count: 3.5,
            start: '2019-12-10',
            end: '2019-12-13',
            startPeriod: 'pm',
            endPeriod: 'pm',
            days: [
                '2019-12-10',
                '2019-12-11',
                '2019-12-12',
                '2019-12-13'
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
        start: '2020-01-07',
        end: '2020-01-08'
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
