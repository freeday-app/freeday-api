const Log = require('./log.js');
const Recap = require('../bot/views/recap.js');
const Language = require('./language.js');
const Modes = require('./modes.js');
const Tools = require('./tools.js');
const SlackDataController = require('../api/controllers/slackData.js');
const JobController = require('../api/controllers/job.js');

const Jobs = {

    interval: 60000,

    timeout: null,

    async init() {
        await JobController.createDefault();
        Jobs.start();
    },

    start() {
        if (!Jobs.timeout) {
            setTimeout(() => {
                Jobs.timeout = setInterval(Jobs.invoke, Jobs.interval);
                Jobs.invoke();
            }, Tools.durationToNextMinute());
        }
    },

    stop() {
        if (Jobs.timeout) {
            clearInterval(Jobs.timeout);
            Jobs.timeout = null;
        }
    },

    // this function is called every minute to launch jobs
    async invoke() {
        Log.info('Invoking Freeday jobs');
        await JobController.acquire('monthlyRecap', Jobs.jobMonthlyRecap);
    },

    // Jobs to run
    // Exceptions are handled by the job controller
    jobMonthlyRecap: async () => {
        if (Modes.botIsEnabled()) {
            const { slackUsers } = await SlackDataController.listUsersProxy({
                page: 'all',
                deleted: false
            });
            // sends the recap to every user
            await Promise.all(slackUsers.map((user) => (
                (async () => {
                    Log.info(`Sending recap to ${user.name} (${user.slackId})`);
                    const localeCode = user.forcedLocale ? user.forcedLocale : user.locale;
                    await Recap.sendProxy(
                        user.slackId, // channel to send to
                        user.slackId, // user of which we should list the daysoff
                        Language.getLocaleAccessor(localeCode)
                    );
                })()
            )));
        }
    }

};

module.exports = Jobs;
