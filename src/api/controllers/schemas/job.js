const Tools = require('../../../services/tools.js');

module.exports = {

    upsert: {
        name: {
            in: 'params',
            type: 'String',
            optional: false,
            allowNull: false
        },
        enabled: {
            in: 'body',
            type: 'Boolean',
            optional: true
        },
        hour: {
            in: 'body',
            type: 'String',
            optional: true,
            check: (val) => Tools.isCronHour(val)
        },
        minute: {
            in: 'body',
            type: 'String',
            optional: true,
            check: (val) => Tools.isCronMinute(val)
        },
        dayOfMonth: {
            in: 'body',
            type: 'String',
            optional: true,
            check: (val) => Tools.isCronDayOfMonth(val)
        }
    }

};
