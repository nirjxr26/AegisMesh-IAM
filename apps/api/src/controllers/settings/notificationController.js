const prisma = require('../../config/database');
const { createAuditLog } = require('../../utils/auditLog');
const {
    mergeNotificationPreferences,
} = require('../../services/organizationSettings.service');
const {
    withMergedPrefs,
} = require('./helpers');

exports.getNotifications = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { notificationPreferences: true },
        });

        res.json({ success: true, data: withMergedPrefs(user || {}) });
    } catch (error) {
        next(error);
    }
};

exports.updateNotifications = async (req, res, next) => {
    try {
        const incoming = req.body || {};

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { notificationPreferences: true },
        });

        const merged = {
            ...mergeNotificationPreferences(user?.notificationPreferences),
            ...incoming,
        };

        await prisma.user.update({
            where: { id: req.user.id },
            data: { notificationPreferences: merged },
        });

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'NOTIFICATION_PREFERENCES_UPDATED',
            category: 'USER_MANAGEMENT',
            resource: 'settings/notifications',
            resourceId: req.user.id,
            result: 'SUCCESS',
        });

        res.json({ success: true, data: merged });
    } catch (error) {
        next(error);
    }
};
