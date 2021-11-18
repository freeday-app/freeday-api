const Controllers = require('../controllers/index.js');

module.exports = (App) => {
    // authentification
    App.get('/api/auth', Controllers.auth.check);
    App.post('/api/auth', Controllers.auth.login);
    // welcome
    App.get('/api/auth/welcome', Controllers.auth.checkWelcome);
    App.post('/api/auth/welcome', Controllers.auth.doWelcome);
    // public configuration
    App.get('/api/configuration/public', Controllers.configuration.getPublic);
};
