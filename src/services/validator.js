const DayJS = require('dayjs');
const Mongoose = require('mongoose');

const { ObjectId } = Mongoose.Types;

const Schemas = require('../api/controllers/schemas/index.js');
const { ValidationError, InternError } = require('./errors.js');
const Tools = require('./tools.js');

const Validator = {

    ins: {
        body: true,
        headers: true,
        params: true,
        query: true
    },

    querySeparators: ['+', ','],

    checkSchema(req, schema) {
        if (!schema) {
            throw new InternError('Validator called without schema');
        }
        if (req.method.toLowerCase() === 'post' && Object.keys(req.body).length === 0) {
            throw new ValidationError('Empty POST body');
        }
        const errors = [];
        let opt; let typeData; let
            errorInfo;
        let isPostBody = false;
        const postBodyFields = {};
        Object.keys(req.body).forEach((field) => {
            postBodyFields[field] = true;
        });
        Object.keys(schema).forEach((key) => {
            opt = Tools.defaults(schema[key], Schemas.validator.default);
            if (Validator.ins[opt.in] && req[opt.in]) {
                if (opt.in === 'body') {
                    isPostBody = true;
                }
                errorInfo = {
                    name: key,
                    in: opt.in
                };
                if (Object.hasOwnProperty.call(req[opt.in], key)) {
                    errorInfo.value = req[opt.in][key];
                    if (opt.in === 'body') {
                        delete postBodyFields[key];
                    }
                    if (!opt.allowNull || req[opt.in][key] !== null) {
                        typeData = Validator.checkType(opt, req[opt.in][key]);

                        if (typeData.ofType) {
                            typeData.value = Validator.applyParse(opt, typeData);
                            req[opt.in][key] = typeData.value;
                            const isValidValues = Validator.checkValues(opt, typeData);
                            if (!isValidValues) {
                                errors.push({ ...errorInfo, error: `Not in valid values ${JSON.stringify(opt.values)}` });
                            }
                            Validator.processSort(req, key, opt);
                        } else {
                            errors.push({
                                ...errorInfo,
                                error: `Not of type ${opt.type}`
                            });
                        }
                    }
                } else if (!opt.optional) {
                    errors.push({
                        ...errorInfo,
                        error: 'Missing required data'
                    });
                }
            } else {
                throw new InternError(`Invalid value '${opt.in}' for field 'in' in schema`);
            }
        });
        if (isPostBody && Object.keys(postBodyFields).length > 0) {
            errors.push({
                error: 'Unexpected fields in body',
                fields: Object.keys(postBodyFields)
            });
        }
        if (errors.length > 0) {
            throw new ValidationError('Invalid parameters', errors);
        } else {
            return true;
        }
    },

    checkType(optObject, val) {
        const opt = optObject;
        let value = val;
        const typeData = {
            ofType: false,
            value: null,
            isArray: Array.isArray(opt.type)
        };
        if (typeData.isArray) {
            opt.type = opt.type.shift();
            if (opt.in === 'query') {
                value = Tools.splitChars(value, Validator.querySeparators);
            }
            typeData.ofType = true;
            typeData.value = [];
            value.forEach((v) => {
                if (Validator.ofType(opt, v)) {
                    typeData.value.push(Validator.parseType(opt, v));
                } else {
                    typeData.ofType = false;
                }
            });
        } else {
            typeData.ofType = Validator.ofType(opt, value);
            if (typeData.ofType) {
                typeData.value = Validator.parseType(opt, value);
            }
        }
        return typeData;
    },

    ofType(opt, value) {
        if (opt.check && !opt.check(value)) {
            return false;
        }
        if (opt.acceptArray) {
            if (Array.isArray(value)) {
                const optType = { ...opt, acceptArray: false };
                for (let i = 0; i < value.length; i += 1) {
                    if (!Validator.ofType(optType, value[i])) {
                        return false;
                    }
                }
                return true;
            }

            return false;
        }
        switch (opt.type) {
            case 'Boolean':
                return Tools.isBoolean(value, opt.in === 'query');
            case 'Page':
                return !Number.isNaN(value) || value === 'all';
            case 'Number':
                return !Number.isNaN(value);
            case 'Email':
                return Tools.isEmail(value);
            case 'MongoId':
                return Tools.isMongoId(value);
            case 'SlackId':
                return Tools.isSlackId(value);
            case 'SlackUserId':
                return Tools.isSlackUserId(value);
            case 'SlackTeamId':
                return Tools.isSlackTeamId(value);
            case 'Date':
                return DayJS(value, 'YYYY-MM-DD', true).isValid();
            case 'Base64':
                return Tools.isBase64(value);
            case 'String':
            default:
                return Tools.isString(value);
        }
    },

    parseType(opt, value) {
        if (opt.acceptArray) {
            return value;
        }
        switch (opt.type) {
            case 'Boolean':
                return opt.in === 'query'
                    ? Tools.parseBooleanString(value)
                    : !!value;
            case 'Page':
                return value === 'all' ? value : parseInt(value);
            case 'Number':
                return parseInt(value);
            case 'Email':
                return String(value).toLowerCase();
            case 'MongoId':
                return ObjectId(value);
            case 'Date':
                return DayJS(value, 'YYYY-MM-DD').toDate();
            case 'Base64':
            case 'String':
            default:
                return String(value);
        }
    },

    processSort(req, key, opt) {
        if (opt.sort && Object.hasOwnProperty.call(req.query, key)) {
            let val = req.query[key];
            if (!Array.isArray(val)) {
                val = [val];
            }
            req.sort = {};
            val.forEach((v) => {
                if (v.charAt(0) === '-') {
                    req.sort[v.substring(1)] = -1;
                } else {
                    req.sort[v] = 1;
                }
            });
        }
    },

    applyParse(opt, typeData) {
        if (opt.parse) {
            if (typeData.isArray) {
                return typeData.value.map((val) => opt.parse(val));
            }
            return opt.parse(typeData.value);
        }
        return typeData.value;
    },

    parseOperator(string) {
        if (!Number.isNaN(string)) {
            return {
                operator: false,
                value: parseInt(string)
            };
        }
        return {
            operator: string.charAt(0),
            value: parseInt(string.substring(1))
        };
    },

    checkValues(opt, typeData) {
        if (opt.values) {
            if (opt.acceptArray && Array.isArray(typeData.value)) {
                return typeData.value.reduce((acc, v) => acc && opt.values.includes(v), true);
            }
            return opt.values.indexOf(typeData.value);
        }
        return true;
    }
};

module.exports = Validator;
