/*
Warning!
This service is required by many other files in the project
To avoid circular dependencies this service has a very limited number of required dependencies
So beware when adding dependencies to this file
*/
const Tools = require('./tools.js');
const confFileContent = require('../conf/conf.json');

const Configuration = {

    data: confFileContent,

    // configuration for tests
    test: {
        slack: {
            clientId: '00000000000.000000000000',
            clientSecret: 'abcdef0123456789abcdef0123456789',
            signingSecret: 'abcdef0123456789abcdef0123456789'
        }
    },

    // loads configuration
    async load(mode) {
        const content = await Configuration.getConfFileContent();
        Configuration.data = content;
        // if test mode replaces some configuration values with the test values
        if (mode === 'test') {
            Configuration.data = {
                ...Configuration.data,
                ...Configuration.test
            };
        }
    },

    // reads local configuration file content
    getConfFileContent: async () => (
        Tools.getJsonFileContent('src/conf/conf.json')
    )

};

module.exports = Configuration;
