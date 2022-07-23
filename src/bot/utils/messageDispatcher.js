const SDK = require('./sdk.js');
const Log = require('../../services/log.js');
const StatsLog = require('../../services/statsLog.js');

// slack api has a rate limite that prevents sending more
// than one message very second so we use this service to
// store messages in a queue and process them with a timeout
const MessageDispatcher = {
    messages: [],
    timer: 1000,
    isRunning: false,

    // this should generally not be called with await
    // as it can take quite a bit of time to send multiple messages
    // message parameter expects a Slack postMessage payload
    async post(message) {
        if (SDK.isActive()) {
            this.messages.push(message);
            if (!this.isRunning) {
                this.isRunning = true;
                await this.process();
            }
        }
    },

    async process() {
        const message = this.messages.shift();
        await this.sendMessage(message);
        await this.timeout(this.timer);
        if (this.messages.length) {
            await this.process();
        } else {
            this.isRunning = false;
        }
    },

    async timeout(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    },

    async sendMessage(data) {
        const SDKWeb = await SDK.web();
        Log.info(`Posting Slack message to ${data.channel}`);
        await SDKWeb.chat.postMessage(data);
        StatsLog.logNotifyUser(data.channel);
    }
};

module.exports = MessageDispatcher;
