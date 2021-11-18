const Chai = require('chai');

const { expect } = Chai;
const Path = require('path');
const Fs = require('fs');

const Conf = require('../../src/conf/conf.json');
const Log = require('../../src/services/log.js');

describe('[Services] Log', () => {
    it('Should write logs in a file', () => {
        const testText = `test_text_${Date.now()}`;
        // on met le niveau de log à info
        Log.toggleTransport('file', true, 'info');
        // on écrit un log
        Log.info(testText);
        // on regarde si le fichier où les log sont écrit existe
        const pathFile = Path.join(Conf.logDir, 'freeday.log');
        // on regarde si on a bien écrit dans le log
        const fileExists = Fs.existsSync(pathFile);
        let text;
        let logWritten = false;
        const data = Fs.readFileSync(pathFile, 'UTF-8');
        if (data) {
            text = data.split('\n');
            logWritten = text[text.length - 2].split(testText).length === 2;
        }
        expect(fileExists).to.be.true;
        expect(logWritten).to.be.true;
        // on efface le message quand on a écrit
        if (text) {
            text.splice(text.length - 2, 1);
            Fs.writeFileSync(pathFile, text.join('\n'));
        }
        // on remet le niveau de log à erreur
        Log.toggleTransport('file', true, 'error');
    });
});
