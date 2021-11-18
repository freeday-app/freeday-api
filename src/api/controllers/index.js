const auth = require('./auth.js');
const configuration = require('./configuration.js');
const dayoff = require('./dayoff.js');
const dayoffType = require('./dayoffType.js');
const job = require('./job.js');
const slackAuth = require('./slackAuth.js');
const slackData = require('./slackData.js');
const user = require('./user.js');

module.exports = {
    auth,
    configuration,
    dayoff,
    dayoffType,
    job,
    slackAuth,
    slackData,
    user
};
