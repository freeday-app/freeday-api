/* eslint-disable max-classes-per-file */
const Log = require('./log.js');

// generic custom error / don't instanciate from this class, use children!
class CustomError extends Error {
    constructor(message, httpCode, internalCode, data = null) {
        super(message);
        this.httpCode = httpCode;
        this.internalCode = internalCode;
        this.data = data;
    }
}

// custom error types extending js error class
class InternError extends CustomError {
    constructor(message = 'Intern error') {
        super(message, 500, 5000);
    }
}
class AuthenticationError extends CustomError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 4010);
    }
}
class WelcomeSecretError extends CustomError {
    constructor(message = 'Welcome authentication error') {
        super(message, 401, 4012);
    }
}
class NotFoundError extends CustomError {
    constructor(message = 'Not found') {
        super(message, 404, 4040);
    }
}
class ValidationError extends CustomError {
    constructor(message = 'Invalid data', data = null) {
        super(message, 400, 4000, data);
    }
}
class NoWorkDaysError extends CustomError {
    constructor(message = 'No work days in dayoff') {
        super(message, 400, 4001);
    }
}
class EndBeforeStartError extends CustomError {
    constructor(message = 'End date can\'t be less than start date') {
        super(message, 400, 4002);
    }
}
class PaginationError extends CustomError {
    constructor(message = 'Invalid page') {
        super(message, 400, 4003);
    }
}
class DisabledDayoffTypeError extends CustomError {
    constructor(message = 'Dayoff type is disabled') {
        super(message, 400, 4004);
    }
}
class InvalidSlackReferrerError extends CustomError {
    constructor(message = 'This channel cannot be set as referrer') {
        super(message, 400, 4005);
    }
}
class ConflictError extends CustomError {
    constructor(message = 'Conflict with existing data', data = null) {
        super(message, 409, 4090, data);
    }
}
class ForbiddenError extends CustomError {
    constructor(message = 'Forbidden') {
        super(message, 403, 4030);
    }
}
class LanguageError extends CustomError {
    constructor(message = 'Language error') {
        super(message, 403, 4032);
    }
}
class NotifyUserError extends CustomError {
    constructor(message = 'Notify User Error', data = null) {
        super(message, 500, 5000, data);
    }
}
class NotifyReferrerError extends CustomError {
    constructor(message = 'Notify User Error', data = null) {
        super(message, 500, 5001, data);
    }
}

// si l'erreur est une erreur mongoose renvoie l'erreur custom correspondante
// sinon renvoie l'objet erreur intact
const handleMongooseError = (err) => {
    if (err.name === 'ValidationError') {
        return new ValidationError(err.message);
    }
    return err;
};

// injecte fonction utilitire dans app express pour renvoyer des errreurs
const middleware = (_req, res, next) => {
    res.error = (e) => {
        const err = handleMongooseError(e);
        let { message } = err;
        const httpCode = err.httpCode || 500;
        if (httpCode === 500) {
            Log.error(err.stack || err.message || err);
            message = 'Intern error';
        }
        const response = {
            error: message,
            code: err.internalCode || null
        };
        if (err.data) {
            response.data = err.data;
        }
        res.status(httpCode).json(response);
    };
    next();
};

module.exports = {
    middleware,
    InternError,
    NotFoundError,
    ValidationError,
    AuthenticationError,
    NoWorkDaysError,
    EndBeforeStartError,
    DisabledDayoffTypeError,
    InvalidSlackReferrerError,
    ConflictError,
    ForbiddenError,
    PaginationError,
    LanguageError,
    WelcomeSecretError,
    NotifyUserError,
    NotifyReferrerError
};

/* eslint-enable max-classes-per-file */
