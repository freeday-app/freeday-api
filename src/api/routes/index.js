const Package = require('../../../package.json');

const Controllers = require('../controllers/index.js');
const PublicRoutes = require('./public.js');
const PrivateRoutes = require('./private.js');
const { NotFoundError } = require('../../services/errors.js');

module.exports = {

    set(App) {
        // routes publiques sans authentification
        PublicRoutes(App);
        // routes privées nécessitant authentification
        PrivateRoutes(App, Controllers.auth.middleware);
        // gère calls à routes inconnues
        App.all('/api/*', (req, res) => {
            res.error(new NotFoundError());
        });
    },

    setPing(App) {
        // ping
        App.get('/api/ping', (req, res) => {
            res.send({
                version: Package.version
            });
        });
    }

};
