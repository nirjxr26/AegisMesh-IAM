const prisma = require('../../config/database');
const logger = require('../logger');
const {
    mergeNotificationPreferences,
} = require('../../services/organizationSettings.service');

const authBuilders = require('./authEvents');
const rbacBuilders = require('./rbacEvents');
const settingsBuilders = require('./settingsEvents');

function asObject(value) {
    return value &&
        typeof value === 'object' &&
        !Array.isArray(value)
        ? value
        : {};
}

function normalizeMessage(message) {
    return String(message || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 220);
}

const NOTIFICATION_BUILDERS = {
    LOGIN: authBuilders.buildNewLoginNotification,
    PASSWORD_CHANGED: authBuilders.buildPasswordChangedNotification,
    MFA_DISABLED: authBuilders.buildMfaDisabledNotification,
    ACCOUNT_LOCKED: authBuilders.buildAccountLockedNotification,
    USER_STATUS_CHANGED:
        authBuilders.buildUserStatusChangedNotification,
    USER_CREATED: authBuilders.buildUserCreatedNotification,
    ROLE_ASSIGNED: rbacBuilders.buildRoleAssignedNotification,
    POLICY_CREATED: rbacBuilders.buildPolicyChangedNotification,
    POLICY_UPDATED: rbacBuilders.buildPolicyChangedNotification,
    POLICY_DELETED: rbacBuilders.buildPolicyChangedNotification,
    POLICY_ATTACHED: rbacBuilders.buildPolicyChangedNotification,
    POLICY_DETACHED: rbacBuilders.buildPolicyChangedNotification,
    SESSION_REVOKED: settingsBuilders.buildSessionRevokedNotification,
    ALL_OTHER_SESSIONS_REVOKED:
        settingsBuilders.buildAllOtherSessionsRevokedNotification,
    ALL_SESSIONS_REVOKED:
        settingsBuilders.buildAllSessionsRevokedNotification,
    DATA_EXPORTED: settingsBuilders.buildDataExportedNotification,
    API_KEY_CREATED: settingsBuilders.buildApiKeyCreatedNotification,
    API_KEY_REVOKED: settingsBuilders.buildApiKeyRevokedNotification,
    CONNECTED_APP_REVOKED:
        settingsBuilders.buildConnectedAppRevokedNotification,
    TRUSTED_DEVICE_REVOKED:
        settingsBuilders.buildTrustedDeviceRevokedNotification,
    ALL_TRUSTED_DEVICES_REVOKED:
        settingsBuilders.buildAllTrustedDevicesRevokedNotification,
};

async function createNotificationFromAudit(entry) {
    if (!entry?.action) {
        return null;
    }

    const builder =
        NOTIFICATION_BUILDERS[entry.action];

    if (!builder) {
        return null;
    }

    try {
        const notification = await builder(entry);

        if (
            !notification?.targetUserId ||
            !notification.preferenceKey
        ) {
            return null;
        }

        const targetUser =
            await prisma.user.findUnique({
                where: {
                    id: notification.targetUserId,
                },
                select: {
                    notificationPreferences: true,
                },
            });

        if (!targetUser) {
            return null;
        }

        const preferences =
            mergeNotificationPreferences(
                targetUser.notificationPreferences
            );

        if (
            !preferences[
                notification.preferenceKey
            ]
        ) {
            return null;
        }

        return prisma.notificationLog.create({
            data: {
                userId:
                    notification.targetUserId,

                type:
                    notification.type ||
                    'system',

                title: String(
                    notification.title ||
                    'Activity update'
                )
                    .trim()
                    .slice(0, 120),

                message: normalizeMessage(
                    notification.message ||
                        'An important account event occurred.'
                ),

                link:
                    notification.link || null,

                metadata: {
                    ...asObject(
                        notification.metadata
                    ),

                    auditId: entry.id,

                    action: entry.action,

                    severity:
                        notification.severity ||
                        'info',
                },
            },
        });
    } catch (error) {
        logger.warn(
            'Notification creation skipped',
            {
                action: entry.action,
                auditId: entry.id,
                error: error.message,
            }
        );

        return null;
    }
}

module.exports = {
    createNotificationFromAudit,
};
