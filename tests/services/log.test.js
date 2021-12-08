const Chai = require('chai');

const { expect } = Chai;
const Path = require('path');
const Fs = require('fs');

const Log = require('../../src/services/log.js');

describe('[Services] Log', () => {
    it('Should write logs in a file', () => {
        const testText = `test_text_${Date.now()}`;
        // on met le niveau de log à info
        Log.toggleTransport('file', true, 'info');
        // on écrit un log
        Log.info(testText);
        // fichier de log
        console.log(process.env.API_LOG_DIR);
        const pathFile = Path.join(process.env.API_LOG_DIR, 'freeday.log');
        // on regarde si on a bien écrit dans le log
        const fileExists = Fs.existsSync(pathFile);
        expect(fileExists).to.be.true;
        let logWritten = false;
        const data = Fs.readFileSync(pathFile, 'UTF-8');
        if (data) {
            const text = data.split('\n');
            logWritten = text[text.length - 2].split(testText).length === 2;
            // on efface le message quand on a écrit
            text.splice(text.length - 2, 1);
            Fs.writeFileSync(pathFile, text.join('\n'));
        }
        expect(logWritten).to.be.true;
        // on remet le niveau de log à erreur
        Log.toggleTransport('file', true, 'error');
    });
});
