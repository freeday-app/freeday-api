const envSchema = require('./env.schema.json');

const parseEnvVar = (key, value, type) => {
    const numberRegex = /^\d+$/;
    switch (type) {
        case 'string':
            return `${value}`;
        case 'number':
            if (!numberRegex.test(value)) {
                throw new Error(`${key} should be a number`);
            }
            return parseInt(value);
        case 'boolean':
            if (value === 'true' || value === '1') { return true; }
            if (value === 'false' || value === '0') { return false; }
            throw new Error(`${key} should be either true or false`);
        default:
            throw new Error(`Unexpected configuration type ${type}`);
    }
};

const parseEnv = (data, schema) => {
    const env = {};
    const errors = [];
    const keys = Object.keys(schema);
    keys.forEach((key) => {
        try {
            const {
                type,
                required,
                filter
            } = schema[key];
            if (data[key]) {
                const value = parseEnvVar(key, data[key], type);
                if (filter && !filter.includes(value)) {
                    throw new Error(`invalid ${key} value (expected one of: ${filter.join(', ')})`);
                }
                env[key] = value;
            } else if (required) {
                throw new Error(`missing or empty ${key} environment variable`);
            }
        } catch (err) {
            errors.push(err.message);
        }
    });
    if (errors.length) {
        throw new Error(`Invalid environment: ${errors.join(' ; ')}`);
    }
    return env;
};

const env = parseEnv(process.env, envSchema);

module.exports = {
    env,
    parseEnv,
    parseEnvVar
};
