const { expect } = require('chai');

const Models = require('../../src/api/models/index.js');

const StatsLogTestUtils = {
    async assertLastLogEntryValues(values) {
        const entry = await Models.StatsLog.findOne().sort({ _id: 'descending' });
        StatsLogTestUtils.assertEntryValues(entry, values);
    },

    assertEntryValues(entry, values) {
        for (const key of Object.keys(values)) {
            expect(entry).to.have.property(key);
            expect(entry[key]).to.equal(values[key]);
        }
    }
};

module.exports = StatsLogTestUtils;
