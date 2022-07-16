const Mongoose = require('mongoose');

const Log = require('../../services/log.js');

// field required depending on type and interface
function forTypes(...types) {
    return function required() {
        return types.includes(this.type);
    };
}
function forBotTypes(...types) {
    return function required() {
        return this.interface === 'bot' && types.includes(this.type);
    };
}
function forClientTypes(...types) {
    return function required() {
        return this.interface === 'client' && types.includes(this.type);
    };
}

// combine validators (call every validator until one returns true)
function either(...validators) {
    return function validateAll() {
        return validators.some((validator) => validator.call(this));
    };
}

const statsLogSchema = Mongoose.Schema({
    interface: {
        type: String,
        required: true,
        enum: [
            'bot',
            'client'
        ]
    },
    timestamp: {
        type: Date,
        required: true,
        default: () => (Date.now())
    },
    type: {
        type: String,
        required: true,
        enum: [
            'login',
            'showhome',
            'createdayoff',
            'editdayoff',
            'listdaysoff',
            'confirmdayoff',
            'canceldayoff',
            'resetdayoff',
            'notifyuser',
            'notifyreferrer',
            'changelanguage',
            'changetheme',
            'editconfig',
            'addadmin',
            'editadmin',
            'removeadmin',
            'adddayofftype',
            'editdayofftype',
            'installapp'
        ]
    },
    user: {
        type: String,
        required: [forClientTypes(
            'login',
            'createdayoff',
            'editdayoff',
            'confirmdayoff',
            'canceldayoff',
            'resetdayoff',
            'changelanguage',
            'changetheme',
            'editconfig',
            'addadmin',
            'editadmin',
            'removeadmin',
            'adddayofftype',
            'editdayofftype',
            'installapp'
        ), (error) => Log.error(`'${error.path}' required`)]
    },
    slackUser: {
        type: String,
        required: [either(
            forTypes(
                'createdayoff',
                'editdayoff',
                'canceldayoff'
            ),
            forBotTypes(
                'showhome',
                'listdaysoff',
                'notifyuser',
                'changelanguage'
            ),
            forClientTypes(
                'confirmdayoff',
                'resetdayoff'
            )
        ), (error) => Log.error(`'${error.path}' required`)]
    },
    slackChannel: {
        type: String,
        required: [forBotTypes(
            'notifyreferrer'
        ), (error) => Log.error(`'${error.path}' required`)]
    },
    ip: {
        type: String,
        required: [forClientTypes(
            'login'
        ), (error) => Log.error(`'${error.path}' required`)]
    }
}, {
    collection: 'statslog',
    versionKey: false,
    toJSON: {
        transform(_doc, ret) {
            ret.id = ret._id;
            delete ret._id;
        }
    },
    collation: {
        locale: 'fr',
        strength: 2
    }
});

module.exports = statsLogSchema;
