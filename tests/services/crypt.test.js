const { expect } = require('chai');

const Tools = require('../../src/services/tools.js');
const Crypt = require('../../src/services/crypt.js');

describe('[Services] Crypt', () => {
    it('Should hash and verify password correctly', async () => {
        const password = Tools.generateRandomPassword(10);
        const hash = await Crypt.hashPassword(password);
        const verified = await Crypt.verifyPassword(password, hash);
        expect(hash).to.not.equal(password);
        expect(verified).to.be.true;
    });
});
