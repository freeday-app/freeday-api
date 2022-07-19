const {
    validator,
    validateParamSlackId,
    validateParamSlackUserId
} = require('../../services/validator.js');
const Log = require('../../services/log.js');
const { env } = require('../../services/env.js');
const Tools = require('../../services/tools.js');
const Models = require('../models/index.js');
const SDK = require('../../bot/utils/sdk.js');
const {
    NotFoundError,
    ForbiddenError
} = require('../../services/errors.js');

const SlackDataSchemas = require('./schemas/slackData.json');

const validateListUsers = validator(SlackDataSchemas.listUsers);
const validateCreateUser = validator(SlackDataSchemas.createUser);
const validateListChannels = validator(SlackDataSchemas.listChannels);
const validateCreateChannel = validator(SlackDataSchemas.createChannel);

const SlackData = {

    // variables de contrôle pour que la synchro des données slack
    // avec l'api slack se fasse maximum une fois par intervale
    lastUpdateMs: null,
    timerUpdateSeconds: 10,

    // détermine si la synchronisation avec l'api slack est possible
    canSync(setLastUpdate = true) {
        const dateNowMs = Date.now();
        const delaySeconds = Math.floor((dateNowMs - SlackData.lastUpdateMs) / 1000);
        const canSync = !SlackData.lastUpdateMs || delaySeconds > SlackData.timerUpdateSeconds;
        if (canSync && setLastUpdate) {
            SlackData.lastUpdateMs = dateNowMs;
        }
        return canSync;
    },

    // renvoie secondes restantes avant prochaine synchro possible
    getSyncDelay() {
        const dateNowMs = Date.now();
        const delaySeconds = Math.floor((dateNowMs - SlackData.lastUpdateMs) / 1000);
        return SlackData.timerUpdateSeconds - delaySeconds;
    },

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ USERS

    // liste users slack enregistrés en base avec synchro api slack
    async listUsers(req, res) {
        try {
            validateListUsers(req.query);
            // synchronise users slack avec api slack
            if (env.SLACK_ENABLED) {
                await SlackData.syncUsers();
            }
            // liste users slack
            const result = await SlackData.listUsersProxy(req.query);
            res.status(200).json(result);
        } catch (err) {
            res.error(err);
        }
    },
    async listUsersProxy(query, byId = false) {
        // gère filtrage
        const find = {};
        if (Object.hasOwnProperty.call(query, 'deleted')) {
            find.deleted = query.deleted === 'true';
        }
        // liste users slack
        const result = await Models.SlackUser.paginateToResult(
            'slackUsers',
            query.page,
            query.limit,
            find,
            { name: 'asc' }
        );
        if (byId) {
            const slackUsersById = {};
            for (const slackUser of result.slackUsers) {
                slackUsersById[slackUser.slackId] = slackUser;
            }
            return slackUsersById;
        }
        return result;
    },

    // renvoie données user slack enregistré en base
    async getUser(req, res) {
        try {
            validateParamSlackUserId(req.params.slackId);
            const slackUser = await Models.SlackUser.findOne({
                slackId: req.params.slackId
            }).exec();
            if (slackUser !== null) {
                res.status(200).json(slackUser.toJSON());
            } else {
                throw new NotFoundError('Slack user not found');
            }
        } catch (err) {
            res.error(err);
        }
    },

    // créée ou modifie user slack en base (mode test uniquement)
    async upsertUser(req, res) {
        try {
            if (env.ENVIRONMENT === 'test') {
                validateCreateUser(req.body);
                const slackUser = await SlackData.upsertUserProxy(req.body);
                res.status(200).json(slackUser.toJSON());
            } else {
                throw new ForbiddenError('This route is only available in test mode');
            }
        } catch (err) {
            res.error(err);
        }
    },

    // ajoute ou met à jour user slack
    async upsertUserProxy(data) {
        const slackUser = {
            deleted: false,
            ...data
        };
        // upsert user slack
        const result = await Models.SlackUser.findOneAndUpdate({
            slackId: slackUser.slackId
        }, {
            $set: slackUser
        }, {
            runValidators: true,
            upsert: true,
            new: true
        }).exec();
        // update les données du user slack sur toutes ses absences
        await Models.Dayoff.updateMany({
            'slackUser.slackId': slackUser.slackId
        }, { slackUser }).exec();
        //
        Log.info(`Slack user ${result.slackId} has been upserted`);
        return result;
    },

    // met à jour les données d'un utilisateur pour sauvegarder son choix de langue
    async saveUserLocaleProxy(userId, locale) {
        const user = await SlackData.getUserData(userId);
        await SlackData.upsertUserProxy({
            ...user,
            forcedLocale: locale
        });
        Log.info(`Language ${locale} saved for user ${userId}`);
    },

    // synchronise liste users slack en base avec celle de l'api
    async syncUsers() {
        if (SDK.isActive()) {
            if (SlackData.canSync()) {
                const SDKWeb = await SDK.web();
                const { members } = await SDKWeb.users.list({
                    include_locale: true
                });
                // users slack existant en base
                const existingSlackUsersById = await SlackData.listUsersProxy({
                    page: 'all'
                }, true);
                // parse données users slack à synchroniser
                const slackUsers = members.filter((member) => (
                    // élimine users de type bot
                    !SlackData.isMemberABot(member)
                )).map((nonBotMember) => (
                    // parse données user
                    SlackData.parseSlackUser(nonBotMember)
                )).filter((slackUser) => (
                    // filtre uniquement users dont les données doivent être mises à jour
                    SlackData.userMustBeUpdated(
                        slackUser,
                        existingSlackUsersById
                    )
                ));
                //
                if (slackUsers.length > 0) {
                    await Promise.all([
                        // update users slack en base
                        Models.SlackUser.bulkWrite(
                            slackUsers.map((slackUser) => ({
                                updateOne: {
                                    filter: {
                                        slackId: slackUser.slackId
                                    },
                                    update: {
                                        $set: slackUser
                                    },
                                    upsert: true
                                }
                            }))
                        ),
                        // update données slack user dans ses absences
                        Models.Dayoff.bulkWrite(
                            slackUsers.map((slackUser) => ({
                                updateMany: {
                                    filter: {
                                        'slackUser.slackId': slackUser.slackId
                                    },
                                    update: {
                                        $set: { slackUser }
                                    }
                                }
                            }))
                        )
                    ]);
                }
                Log.info(`${members.length} Slack users synchronized`);
            } else {
                Log.info(`Skipped Slack users synchronization (waiting ${SlackData.getSyncDelay()} seconds)`);
            }
        }
    },

    // synchronise un utilisateur de la base avec l'API slack et renvoie les données
    // ne s'effectue que si canSync est vérifié ou si on force la synchronisation
    async syncUser(userId, force = false) {
        if (SDK.isActive() && !SlackData.isMemberIdABot(userId)) {
            if (force || SlackData.canSync()) {
                const SDKWeb = await SDK.web();
                const result = await SDKWeb.users.info({
                    user: userId,
                    include_locale: true
                });
                if (result.ok && result.user) {
                    const slackUser = SlackData.parseSlackUser(result.user);
                    // update user slack en base
                    const userData = await SlackData.upsertUserProxy(slackUser);
                    Log.info(`Synchronized Slack user: ${slackUser.name} (${userId})`);
                    return userData.toObject();
                }
                Log.error(`Synchronization failed for Slack user ${userId}`);
            } else {
                Log.info(`Skipped Slack user ${userId} synchronization (waiting ${SlackData.getSyncDelay()} seconds)`);
            }
        }
        return null;
    },

    // parse données user de l'api slack vers format bdd mongo
    parseSlackUser(user) {
        let name = null;
        if (user.real_name) {
            name = user.real_name;
        } else if (user.profile && user.profile.real_name) {
            name = user.profile.real_name;
        } else if (user.name) {
            name = user.name.replace('.', ' ');
        }
        return {
            slackId: user.id,
            name: Tools.formatName(name),
            avatar: user.profile.image_72,
            deleted: !!user.deleted,
            locale: user.locale ? user.locale.substring(0, 2) : null
        };
    },

    // contrôle si les données d'un user slack sont nouvelles
    // ou ont changé par rapport à la liste des users slack existante
    userMustBeUpdated(slackUser, existingSlackUsersById) {
        const existingSlackUser = existingSlackUsersById[slackUser.slackId];
        if (existingSlackUser) {
            for (const field of Object.keys(slackUser)) {
                if (slackUser[field] !== existingSlackUser[field]) {
                    return true;
                }
            }
            return false;
        }
        return true;
    },

    // contrôle si un user slack (non parsé) est un bot
    isMemberABot(member) {
        return SlackData.isMemberIdABot(member.id) || member.is_bot;
    },

    // contrôle si l'id de membre slack est celui d'un bot
    isMemberIdABot(memberId) {
        return memberId === 'USLACKBOT';
    },

    // récupère les données d'un utilisateur
    // depuis l'API si la synchronisation a eu lieu
    // sinon depuis la BD
    async getUserData(userId, force = false) {
        if (env.SLACK_ENABLED) {
            const userData = await SlackData.syncUser(userId, force);
            if (userData) {
                return userData;
            }
        }
        const userDataDB = await Models.SlackUser.findOne({ slackId: userId }).exec();
        return userDataDB.toObject();
    },

    // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ CHANNELS

    // liste channels slack enregistrés en base avec synchro api slack
    async listChannels(req, res) {
        try {
            validateListChannels(req.query);
            // synchronise channels slack avec api slack
            if (env.SLACK_ENABLED) {
                await SlackData.syncChannels();
            }
            const onlyMember = req.query.onlyMember === 'true';
            // liste channels slack
            const result = await SlackData.listChannelsProxy(
                req.query,
                false,
                onlyMember
            );
            res.status(200).json(result);
        } catch (err) {
            res.error(err);
        }
    },
    async listChannelsProxy(query, byId = false, onlyMember = false) {
        const memberFilter = onlyMember ? { isMember: true } : {};
        // liste channels slack
        const result = await Models.SlackChannel.paginateToResult(
            'slackChannels',
            query.page,
            query.limit,
            { archived: false, ...memberFilter },
            { name: 'asc' }
        );
        if (byId) {
            const slackChannelsById = {};
            for (const slackChannel of result.slackChannels) {
                slackChannelsById[slackChannel.slackId] = slackChannel;
            }
            return slackChannelsById;
        }
        return result;
    },

    // renvoie données channel slack
    async getChannel(req, res) {
        try {
            validateParamSlackId(req.params.slackId);
            const slackChannel = await SlackData.getChannelProxy(req.params.slackId);
            if (slackChannel !== null) {
                res.status(200).json(slackChannel.toJSON());
            } else {
                throw new NotFoundError('Slack channel not found');
            }
        } catch (err) {
            res.error(err);
        }
    },

    async getChannelProxy(channelId) {
        return Models.SlackChannel.findOne({
            slackId: channelId
        }).exec();
    },

    // créée ou modifie un channel slack en base (mode test uniquement)
    async upsertChannel(req, res) {
        try {
            if (env.ENVIRONMENT === 'test') {
                validateCreateChannel(req.body);
                const slackChannel = {
                    isChannel: true,
                    isGroup: false,
                    isIm: false,
                    isMpIm: false,
                    isMember: false,
                    isPrivate: false,
                    archived: false,
                    ...req.body
                };
                // upsert channel slack
                const result = await Models.SlackChannel.findOneAndUpdate({
                    slackId: slackChannel.slackId
                }, {
                    $set: slackChannel
                }, {
                    runValidators: true,
                    upsert: true,
                    new: true
                }).exec();
                //
                Log.info(`Slack channel ${result.slackId} has been upserted`);
                res.status(200).json(result.toJSON());
            } else {
                throw new ForbiddenError('This route is only available in test mode');
            }
        } catch (err) {
            res.error(err);
        }
    },

    // synchronise liste channels slack en base avec celle de l'api
    async syncChannels() {
        if (SDK.isActive()) {
            if (SlackData.canSync()) {
                const SDKWeb = await SDK.web();
                let channels = [];
                let cursor = '';
                /* eslint-disable no-await-in-loop */
                // disabled because we must use await in while loop in case of slack api pagination
                do {
                    const reply = await SDKWeb.conversations.list({
                        exclude_archived: true,
                        types: 'public_channel,private_channel',
                        limit: 100,
                        cursor
                    });
                    channels = channels.concat(reply.channels);
                    cursor = reply.response_metadata.next_cursor;
                } while (cursor);
                /* eslint-enable no-await-in-loop */
                // channels slack existant en base
                const knownSlackChannelsById = await SlackData.listChannelsProxy({
                    page: 'all'
                }, true);
                // parse données channels slack à synchroniser
                const slackChannels = channels.map((channel) => (
                    // parse données channel
                    SlackData.parseSlackChannel(channel)
                ));
                // filtre uniquement channels dont les données doivent être mises à jour
                const channelsToUpdate = slackChannels.filter((slackChannel) => (
                    SlackData.channelMustBeUpdated(
                        slackChannel,
                        knownSlackChannelsById
                    )
                ));
                //
                if (channelsToUpdate.length > 0) {
                    // update channels slack en base
                    await Models.SlackChannel.bulkWrite(
                        channelsToUpdate.map((slackChannel) => ({
                            updateOne: {
                                filter: {
                                    slackId: slackChannel.slackId
                                },
                                update: {
                                    $set: slackChannel
                                },
                                upsert: true
                            }
                        }))
                    );
                }

                // supprime channels inexistants en base
                const existingChannelIds = slackChannels.map((channel) => channel.slackId);
                await Models.SlackChannel.deleteMany({
                    slackId: { $nin: existingChannelIds }
                });

                const config = await Models.Configuration.findOne();
                if (config) {
                    const { slackReferrer } = await config.toJSON();

                    // enlève référant si le bot n'y a plus accès
                    if (!existingChannelIds.includes(slackReferrer)) {
                        await Models.Configuration.updateOne({}, {
                            $set: {
                                slackReferrer: null
                            }
                        });
                    }
                }
                Log.info(`${channels.length} Slack channels synchronized`);
            } else {
                Log.info(`Skipped Slack channels synchronization (waiting ${SlackData.getSyncDelay()} seconds)`);
            }
        }
    },

    // parse données channel de l'api slack vers format bdd mongo
    parseSlackChannel(channel) {
        return {
            slackId: channel.id,
            name: channel.name,
            isChannel: !!channel.is_channel,
            isGroup: !!channel.is_group,
            isIm: !!channel.is_im,
            isMpIm: !!channel.is_mpim,
            isMember: !!channel.is_member,
            isPrivate: !!channel.is_private,
            archived: !!channel.is_archived
        };
    },

    // contrôle si les données d'un channel slack sont nouvelles
    // ou ont changé par rapport à la liste des channels slack existante
    channelMustBeUpdated(slackChannel, existingSlackChannelsById) {
        const existingSlackChannel = existingSlackChannelsById[slackChannel.slackId];
        if (existingSlackChannel) {
            for (const field of Object.keys(slackChannel)) {
                if (slackChannel[field] !== existingSlackChannel[field]) {
                    return true;
                }
            }
            return false;
        }
        return true;
    }

};

module.exports = SlackData;
