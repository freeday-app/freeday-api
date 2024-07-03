const Controllers = require('../controllers/index.js');

module.exports = (App, authMid) => {
    // déconnexion
    App.delete('/api/auth', authMid, Controllers.auth.logout);
    // testing welcome route
    App.put('/api/auth/welcome', authMid, Controllers.auth.initiateTest);

    // utilisateurs slacks en base
    App.get('/api/slack/users', authMid, Controllers.slackData.listUsers);
    App.post('/api/slack/users', authMid, Controllers.slackData.upsertUser);
    App.get('/api/slack/users/:slackId', authMid, Controllers.slackData.getUser);
    // channels slacks en base
    App.get('/api/slack/channels', authMid, Controllers.slackData.listChannels);
    App.post('/api/slack/channels', authMid, Controllers.slackData.upsertChannel);
    App.get('/api/slack/channels/:slackId', authMid, Controllers.slackData.getChannel);

    // utilisateurs app (administrateurs)
    App.get('/api/users', authMid, Controllers.user.list);
    App.post('/api/users', authMid, Controllers.user.create);
    App.get('/api/users/me', authMid, Controllers.user.getMe);
    App.get('/api/users/:id', authMid, Controllers.user.get);
    App.post('/api/users/me', authMid, Controllers.user.updateMe);
    App.post('/api/users/:id', authMid, Controllers.user.update);
    App.delete('/api/users/:id', authMid, Controllers.user.delete);

    // types d'absences (doit se trouver avant "absences" pour éviter les conflits de route)
    App.get('/api/daysoff/types', authMid, Controllers.dayoffType.list);
    App.post('/api/daysoff/types', authMid, Controllers.dayoffType.create);
    App.get('/api/daysoff/types/:id', authMid, Controllers.dayoffType.get);
    App.post('/api/daysoff/types/:id', authMid, Controllers.dayoffType.update);
    App.delete('/api/daysoff/types/:id', authMid, Controllers.dayoffType.delete);

    // absences
    App.get('/api/daysoff', authMid, Controllers.dayoff.list);
    App.post('/api/daysoff', authMid, Controllers.dayoff.create);
    App.get('/api/daysoff/:id', authMid, Controllers.dayoff.get);
    App.post('/api/daysoff/:id', authMid, Controllers.dayoff.update);
    App.delete('/api/daysoff/:id', authMid, Controllers.dayoff.delete);
    App.get('/api/daysoff/:id/conflicts', authMid, Controllers.dayoff.conflicts);
    App.put('/api/daysoff/:id/confirm', authMid, Controllers.dayoff.confirm);
    App.put('/api/daysoff/:id/cancel', authMid, Controllers.dayoff.cancel);
    App.put('/api/daysoff/:id/reset', authMid, Controllers.dayoff.reset);
    App.get('/api/daysoff/holidays/:year', authMid, Controllers.dayoff.getHolidays);

    // Configuration
    App.get('/api/configuration', authMid, Controllers.configuration.get);
    App.post('/api/configuration', authMid, Controllers.configuration.upsert);

    // Jobs
    App.get('/api/jobs/:name', authMid, Controllers.job.get);
    App.post('/api/jobs/:name', authMid, Controllers.job.upsert);
};
