const userController = require('./userController');
const userAdminController = require('./userAdminController');
const bulkController = require('./bulkController');
const sessionController = require('./sessionController');
const adminController = require('./adminController');

module.exports = {
    ...userController,
    ...userAdminController,
    ...bulkController,
    ...sessionController,
    ...adminController,
};
