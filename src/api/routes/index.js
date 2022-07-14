const Express = require('express');
const Path = require('path');

const Controllers = require('../controllers/index.js');
const PublicRoutes = require('./public.js');
const PrivateRoutes = require('./private.js');
const Log = require('../../services/log.js');
const { NotFoundError } = require('../../services/errors.js');

const Package = require('../../../package.json');

module.exports = {

    set(App) {
        // routes publiques sans authentification
        PublicRoutes(App);

        // routes privées nécessitant authentification
        PrivateRoutes(App, Controllers.auth.middleware);

        // ping
        App.get('/api/ping', (req, res) => {
            res.send({
                version: Package.version
            });
        });

        // gère calls à routes inconnues
        App.all('/api/*', (req, res) => {
            res.error(new NotFoundError());
        });

        // serve client build in production
        if (process.env.ENVIRONMENT === 'prod') {
            Log.info('Serving production web client build');
            App.use(Express.static(
                Path.join(__dirname, '../../../web')
            ));
            App.all('*', (req, res) => {
                res.sendFile('index.html', {
                    root: Path.join(__dirname, '../../../web')
                });
            });
        } else { // any other request falls in 404 if in dev mode
            App.all('*', (req, res) => {
                res.error(new NotFoundError());
            });
        }
    }

};
