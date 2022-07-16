const DayJS = require('dayjs');

const Models = require('../models/index.js');
const Schemas = require('./schemas/index.js');
const Validator = require('../../services/validator.js');
const Tools = require('../../services/tools.js');
const StatsLog = require('../../services/statsLog.js');
const Crypt = require('../../services/crypt.js');
const Log = require('../../services/log.js');
const { env } = require('../../services/env.js');
const {
    AuthenticationError,
    WelcomeSecretError,
    ForbiddenError
} = require('../../services/errors.js');
const UserController = require('./user.js');

const Auth = {

    // endpoint authentification
    async login(req, res) {
        try {
            // contrôle données postées
            await Validator.checkSchema(req, Schemas.auth.login);
            // cherche user par username
            const user = await Models.User.findOne({
                username: req.body.username
            }).exec();
            // vérifie password si user trouvé
            const verify = user
                ? await Crypt.verifyPassword(req.body.password, user.password)
                : false;
            // si user trouvé et password correspond
            if (user && verify) {
                // génère nouveau token et insère en base
                const uid = await Tools.generateToken();
                const result = await Models.Token.findOneAndUpdate({
                    userId: user.id
                }, {
                    userId: user.id,
                    token: uid,
                    limit: DayJS().add(3, 'hours').toDate()
                }, {
                    new: true,
                    runValidators: true,
                    upsert: true
                }).exec();
                // données token
                const token = await result.toJSON();
                // cleans initialization token
                await Auth.deleteInitialization();
                //
                Log.info(`User ${user.id} logged in`);
                StatsLog.logLogin(user.id, req.ip);
                res.status(200).json(token);
            } else {
                throw new AuthenticationError();
            }
        } catch (err) {
            res.error(err);
        }
    },

    // endpoint vérification token
    async check(req, res) {
        Auth.middleware(req, res, () => {
            res.status(200).json({
                userId: req.auth.userId,
                token: req.auth.token,
                limit: req.auth.limit
            });
        });
    },

    // middleware contrôle token authentification
    async middleware(req, res, next) {
        try {
            // contrôle données postées
            await Validator.checkSchema(req, Schemas.auth.check);
            // contrôle token
            const token = req.get('Authorization');
            if (!token) {
                throw new AuthenticationError();
            }
            // cherche token valide correspondant en base
            const result = await Models.Token.findOneAndUpdate({
                $and: [{
                    token
                }, {
                    limit: { $gt: DayJS().toDate() }
                }, {
                    userId: {
                        $exists: true,
                        $ne: null
                    }
                }, {
                    $or: [
                        { initialization: { $exists: false } },
                        { initialization: { $eq: false } }
                    ]
                }]
            }, {
                $set: {
                    limit: DayJS().add(3, 'hours').toDate()
                }
            }, {
                new: true,
                runValidators: true
            }).exec();
            // si token trouvé
            if (result) {
                // renvoie données user et token
                req.auth = result.toJSON();
                next();
            } else {
                throw new AuthenticationError();
            }
        } catch (err) {
            res.error(err);
        }
    },

    // endpoint déconnexion
    async logout(req, res) {
        try {
            // supprime donnée token en base
            const token = await Models.Token.findOneAndDelete({
                token: req.auth.token
            }).exec();
            Log.info(`User ${token.userId} logged out`);
            res.status(200).json({});
        } catch (err) {
            res.error(err);
        }
    },

    // TEST route only
    // initializes welcome system
    // self user must be the only one in database
    // self user will be deleted and all tokens deleted as well
    async initiateTest(req, res) {
        try {
            if (env.ENVIRONMENT === 'test') {
                // checks if self user is the only one in database
                const users = await Models.User.find({
                    _id: {
                        $ne: req.auth.userId
                    }
                });
                if (users.length) {
                    throw new ForbiddenError('Self user must be the only one in database');
                }
                // deletes self user
                await Models.User.deleteOne({
                    _id: req.auth.userId
                });
                // deletes tokens in database
                await Models.Token.deleteMany({}).exec();
                // initiates welcome data
                let init = await Auth.initiateWelcome(false);
                if (!init) {
                    init = await Auth.getInitialization();
                }
                const secret = Crypt.encodeBase64(init.token, false);
                //
                res.status(200).json({
                    secret
                });
            } else {
                throw new ForbiddenError('This route is only available in test mode');
            }
        } catch (err) {
            res.error(err);
        }
    },

    // creates initialization token
    async initiateWelcome(deleteIfNotEmpty = true) {
        // if there are no users and no tokens in database
        const isEmpty = await Auth.isEmpty();
        if (isEmpty) {
            // if initialization token already exist
            let init = await Auth.getInitialization();
            // creates initialization token if not exist
            if (!init) {
                init = await Auth.createInitialization();
            }
            // builds url
            const url = Auth.buildWelcomeUrl(init.token);
            //
            Log.info(`Welcome URL is ${url}`);
            //
            return init;
        }
        if (deleteIfNotEmpty) {
            // if user or token found in database deletes initialization token
            await Auth.deleteInitialization();
        }
        return null;
    },

    // endpoint checking validity of a welcome secret
    async checkWelcome(req, res) {
        try {
            await Validator.checkSchema(req, Schemas.auth.check);
            // checks that instance is empty
            await Auth.isEmpty(true);
            // gets post secret
            const base64Secret = req.get('Authorization');
            // checks secret validity
            await Auth.checkWelcomeSecret(base64Secret);
            //
            res.status(200).json({});
        } catch (err) {
            res.error(err);
        }
    },

    // endpoint used to handle welcome
    async doWelcome(req, res) {
        try {
            await Validator.checkSchema(req, {
                ...Schemas.auth.welcome,
                ...Schemas.auth.check
            });
            // checks that instance is empty
            await Auth.isEmpty(true);
            // gets post secret
            const base64Secret = req.get('Authorization');
            // checks secret validity
            await Auth.checkWelcomeSecret(base64Secret);
            //
            const results = await Promise.all([
                // creates new user
                UserController.createProxy(req.body),
                // deletes initialization token
                Auth.deleteInitialization()
            ]);
            // returns created user data
            const user = results.shift();
            res.status(200).json(user);
        } catch (err) {
            res.error(err);
        }
    },

    // checks validity of a welcom secret code
    async checkWelcomeSecret(base64Secret) {
        if (!base64Secret) {
            throw new WelcomeSecretError();
        }
        const secret = Crypt.decodeBase64(base64Secret);
        if (!secret) {
            throw new WelcomeSecretError();
        }
        // checks secret matches with the one in database
        const result = await Models.Token.findOne({
            initialization: true,
            token: secret
        }).exec();
        if (!result) {
            throw new WelcomeSecretError();
        }
        return secret;
    },

    // gets initialization token
    async getInitialization() {
        const result = await Models.Token.findOne({
            initialization: true
        }).exec();
        return result ? result.toJSON() : null;
    },

    // creates initialization token
    async createInitialization() {
        await Auth.deleteInitialization();
        Log.info('Creating welcome initialization token');
        const uid = await Tools.generateToken();
        const token = new Models.Token({
            token: uid,
            userId: null,
            limit: null,
            initialization: true
        });
        await token.save();
        return token;
    },

    // deletes initialization token
    async deleteInitialization() {
        Log.info('Cleaning welcome initialization tokens');
        await Models.Token.deleteMany({
            initialization: true
        });
    },

    // checks if instance has no user and no auth tokens
    async isEmpty(throwErrorIfNotEmpty = false) {
        const userCount = await Models.User.countDocuments({});
        const tokenCount = await Models.Token.countDocuments({
            $or: [
                { initialization: { $exists: false } },
                { initialization: { $eq: false } }
            ]
        });
        const isEmpty = !userCount && !tokenCount;
        if (throwErrorIfNotEmpty && !isEmpty) {
            throw new ForbiddenError('Instance is not empty');
        }
        return isEmpty;
    },

    // builds welcome url
    buildWelcomeUrl(initToken) {
        const apiUrl = env.PUBLIC_URL;
        // encodes token in base64
        const base64Token = Crypt.encodeBase64(initToken, false);
        // builds url
        return new URL(`/welcome/${base64Token}`, apiUrl).href;
    }

};

module.exports = Auth;
