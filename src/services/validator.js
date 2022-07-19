const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const Tools = require('./tools.js');
const { ValidationError } = require('./errors.js');

const ajv = new Ajv({
    allErrors: true
});

// standard string formats
addFormats(ajv);

// custom formats
ajv.addFormat('slack-id', /^[A-Z]{1}[A-Z0-9]{8,10}$/);
ajv.addFormat('slack-user-id', /^[UW]{1}[A-Z0-9]{8,10}$/);
ajv.addFormat('slack-team-id', /^T[A-Z0-9]{8,10}$/);
ajv.addFormat('theme', /^(?:light|dark)$/);
ajv.addFormat('cron-day-of-month', /^(^\*$)|(^[1-9]$)|(^[1-2]\d$)|(^3[0-1]$)$/);
ajv.addFormat('cron-hour', /^(^\*$)|(^\d$)|(^1\d$)|(^2[0-3]$)$/);
ajv.addFormat('cron-minute', /^(^\*$)|(^\d$)|(^[1-5]\d$)$/);
ajv.addFormat('base64', /^(?:data:\w+\/[a-zA-Z+-.]+;base64,)(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/i);
ajv.addFormat('mongo-id', /^[0-9a-fA-F]{24}$/);
ajv.addFormat('page', /^all|\d+$/);
ajv.addFormat('number', /^\d+$/);

// return a function that validates data against a json schema
const validator = (schema) => {
    const validate = ajv.compile(schema);
    return (data) => {
        const valid = validate(data);
        if (valid) {
            return true;
        }
        throw new ValidationError(
            'Invalid data',
            validate.errors
        );
    };
};

// check an id is a valid uuid, throw validation error otherwise
const validateParamUuid = (id) => {
    if (!Tools.isMongoId(id)) {
        throw new ValidationError('Provided ID is not a valid UUID');
    }
};

// check an id is a valid slack id, throw validation error otherwise
const validateParamSlackId = (id) => {
    if (!Tools.isSlackId(id)) {
        throw new ValidationError('Provided ID is not a valid Slack ID');
    }
};

// check an id is a valid slack user id, throw validation error otherwise
const validateParamSlackUserId = (id) => {
    if (!Tools.isSlackUserId(id)) {
        throw new ValidationError('Provided ID is not a valid Slack user ID');
    }
};

module.exports = {
    validator,
    validateParamUuid,
    validateParamSlackId,
    validateParamSlackUserId
};
