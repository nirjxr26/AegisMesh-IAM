const profileController = require('./profileController');
const securityController = require('./securityController');
const mfaController = require('./mfaController');
const apiKeyController = require('./apiKeyController');
const organizationController = require('./organizationController');
const notificationController = require('./notificationController');
const sessionController = require('./sessionController');
const { ensureDefaults } = require('./helpers');

module.exports = {
    ...profileController,
    ...securityController,
    ...mfaController,
    ...apiKeyController,
    ...organizationController,
    ...notificationController,
    ...sessionController,
    ensureDefaults,
};
