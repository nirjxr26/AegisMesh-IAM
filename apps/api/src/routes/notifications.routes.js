const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const schemas = require('../config/validationSchemas');
const notificationsController = require('../controllers/notifications.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', validate(schemas.notificationsList), notificationsController.getNotifications);
router.patch('/:id/read', validate(schemas.notificationReadUpdate), notificationsController.updateNotificationReadState);
router.post('/mark-all-read', notificationsController.markAllNotificationsRead);
router.delete('/:id', validate(schemas.notificationIdParam), notificationsController.deleteNotification);

module.exports = router;