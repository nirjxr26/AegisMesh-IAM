const prisma = require('../config/database');
const logger = require('./logger');
const {
    mergeNotificationPreferences,
} = require('../services/organizationSettings.service');

function asObject(value) {
    return value &&
        typeof value === 'object' &&
        !Array.isArray(value)
        ? value
        : {};
}

function formatActorName(actor) {
    const firstName = String(actor?.firstName || '').trim();
    const lastName = String(actor?.lastName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || actor?.email || 'An administrator';
}

function detectBrowser(ua) {
    if (ua.includes('edg')) {
        return 'Edge';
    }

    if (ua.includes('firefox')) {
        return 'Firefox';
    }

    if (ua.includes('safari') && !ua.includes('chrome')) {
        return 'Safari';
    }

    if (ua.includes('chrome')) {
        return 'Chrome';
    }

    return 'a browser';
}

function detectOS(ua) {
    if (ua.includes('windows')) {
        return 'Windows';
    }

    if (ua.includes('mac os')) {
        return 'macOS';
    }

    if (ua.includes('linux')) {
        return 'Linux';
    }

    if (ua.includes('android')) {
        return 'Android';
    }

    if (ua.includes('iphone') || ua.includes('ipad')) {
        return 'iOS';
    }

    return null;
}

function parseDeviceLabel(userAgent) {
    const ua = String(userAgent || '').toLowerCase();

    if (!ua) {
        return 'a new device';
    }

    const browser = detectBrowser(ua);
    const os = detectOS(ua);

    if (!os) {
        return 'a new device';
    }

    return `${browser} on ${os}`;
}

function normalizeMessage(message) {
    return String(message || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 220);
}

async function resolveRoleName(roleId) {
    if (!roleId) {
        return null;
    }

    const role = await prisma.role.findUnique({
        where: { id: roleId },
        select: { name: true },
    });

    return role?.name || null;
}

async function resolvePolicyName(policyId) {
    if (!policyId) {
        return null;
    }

    const policy = await prisma.policy.findUnique({
        where: { id: policyId },
        select: { name: true },
    });

    return policy?.name || null;
}

async function resolveApiTokenName(tokenId) {
    if (!tokenId) {
        return null;
    }

    const token = await prisma.apiToken.findUnique({
        where: { id: tokenId },
        select: { name: true },
    });

    return token?.name || null;
}

async function buildNewLoginNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    const priorLoginWhere = {
        userId: entry.userId,
        action: 'LOGIN',
        createdAt: {
            lte: entry.createdAt,
        },
        NOT: {
            id: entry.id,
        },
    };

    if (entry.userAgent) {
        priorLoginWhere.userAgent = entry.userAgent;
    } else if (entry.ipAddress) {
        priorLoginWhere.ipAddress = entry.ipAddress;
    } else {
        return null;
    }

    const priorLogin = await prisma.auditLog.findFirst({
        where: priorLoginWhere,
        select: { id: true },
    });

    if (priorLogin) {
        return null;
    }

    const location = entry.ipAddress
        ? ` from ${entry.ipAddress}`
        : '';

    return {
        targetUserId: entry.userId,
        preferenceKey: 'newLoginInApp',
        type: 'security',
        severity: 'warning',
        title: 'New device sign-in',
        message: `We noticed a sign-in on ${parseDeviceLabel(
            entry.userAgent
        )}${location}.`,
        link: '/dashboard/security?tab=history',
    };
}

function buildPasswordChangedMessage(otherSessionsRevoked) {
    if (otherSessionsRevoked <= 0) {
        return 'Your password was updated successfully.';
    }

    const sessionLabel =
        otherSessionsRevoked === 1
            ? 'session'
            : 'sessions';

    return `Your password was updated and ${otherSessionsRevoked} other ${sessionLabel} were signed out.`;
}

function buildPasswordChangedNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    const metadata = asObject(entry.metadata);

    const otherSessionsRevoked = Number(
        metadata.otherSessionsRevoked || 0
    );

    return {
        targetUserId: entry.userId,
        preferenceKey: 'passwordChangedInApp',
        type: 'security',
        severity: 'info',
        title: 'Password changed',
        message: buildPasswordChangedMessage(
            otherSessionsRevoked
        ),
        link: '/dashboard/security?tab=password',
    };
}

function buildMfaDisabledNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    return {
        targetUserId: entry.userId,
        preferenceKey: 'mfaDisabledInApp',
        type: 'security',
        severity: 'critical',
        title: 'Two-factor authentication disabled',
        message:
            'Multi-factor authentication was disabled for your account.',
        link: '/dashboard/security?tab=mfa',
    };
}

function buildAccountLockedNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    return {
        targetUserId: entry.userId,
        preferenceKey: 'failedLoginInApp',
        type: 'security',
        severity: 'critical',
        title: 'Account locked',
        message:
            'Your account was locked after repeated failed sign-in attempts.',
        link: '/dashboard/security?tab=history',
    };
}

function buildUserStatusChangedNotification(entry) {
    const metadata = asObject(entry.metadata);

    const newStatus =
        metadata.newStatus || metadata.to || null;

    const targetUserId = entry.resourceId || null;

    if (!targetUserId || newStatus !== 'LOCKED') {
        return null;
    }

    return {
        targetUserId,
        preferenceKey: 'failedLoginInApp',
        type: 'security',
        severity: 'critical',
        title: 'Account locked',
        message: `${formatActorName(
            entry.user
        )} locked your account.`,
        link: '/dashboard/security?tab=history',
    };
}

function buildUserCreatedNotification(entry) {
    const targetUserId = entry.resourceId || null;

    if (!targetUserId) {
        return null;
    }

    return {
        targetUserId,
        preferenceKey: 'userCreatedInApp',
        type: 'account',
        severity: 'info',
        title: 'Account created',
        message: `${formatActorName(
            entry.user
        )} created your IAM account.`,
        link: '/settings/profile',
    };
}

function buildRoleAssignedMessage(roleName, actorName) {
    if (!roleName) {
        return `${actorName} assigned a new role to your account.`;
    }

    return `${actorName} assigned you the ${roleName} role.`;
}

async function buildRoleAssignedNotification(entry) {
    const metadata = asObject(entry.metadata);

    const targetUserId =
        metadata.assignedTo ||
        entry.resourceId ||
        null;

    if (!targetUserId) {
        return null;
    }

    const roleName = await resolveRoleName(
        metadata.roleId
    );

    const actorName = formatActorName(entry.user);

    return {
        targetUserId,
        preferenceKey: 'roleAssignedInApp',
        type: 'role',
        severity: 'info',
        title: 'Role assigned',
        message: buildRoleAssignedMessage(
            roleName,
            actorName
        ),
        link: '/dashboard',
        metadata: {
            roleId: metadata.roleId || null,
            roleName,
        },
    };
}

const POLICY_ACTION_VERBS = {
    POLICY_CREATED: 'created',
    POLICY_UPDATED: 'updated',
    POLICY_DELETED: 'deleted',
    POLICY_ATTACHED: 'attached to a role',
    POLICY_DETACHED: 'detached from a role',
};

function buildPolicyMessage(policyName, verb) {
    if (!policyName) {
        return `A policy was ${verb}.`;
    }

    return `Policy ${policyName} was ${verb}.`;
}

async function buildPolicyChangedNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    const metadata = asObject(entry.metadata);

    const policyId =
        metadata.policyId ||
        entry.resourceId ||
        null;

    const policyName =
        metadata.policyName ||
        await resolvePolicyName(policyId);

    const verb =
        POLICY_ACTION_VERBS[entry.action] ||
        'updated';

    return {
        targetUserId: entry.userId,
        preferenceKey: 'policyChangedInApp',
        type: 'system',
        severity: 'info',
        title: 'Policy updated',
        message: buildPolicyMessage(
            policyName,
            verb
        ),
        link: '/dashboard/policies',
        metadata: {
            policyId,
            policyName,
        },
    };
}

function buildSessionRevokedNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    return {
        targetUserId: entry.userId,
        preferenceKey: 'sessionRevokedInApp',
        type: 'security',
        severity: 'warning',
        title: 'Session revoked',
        message:
            'An active session was revoked from your account.',
        link: '/settings/sessions',
    };
}

function buildOtherSessionsMessage(revokedCount) {
    if (revokedCount <= 0) {
        return 'Other active sessions were signed out from your account.';
    }

    const sessionLabel =
        revokedCount === 1
            ? 'session'
            : 'sessions';

    return `${revokedCount} other ${sessionLabel} were signed out from your account.`;
}

function buildAllOtherSessionsRevokedNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    const metadata = asObject(entry.metadata);

    const revokedCount = Number(
        metadata.revokedCount || 0
    );

    return {
        targetUserId: entry.userId,
        preferenceKey: 'sessionRevokedInApp',
        type: 'security',
        severity: 'warning',
        title: 'Other sessions signed out',
        message: buildOtherSessionsMessage(
            revokedCount
        ),
        link: '/settings/sessions',
    };
}

function buildAllSessionsMessage(
    isAdminAction,
    actorName
) {
    if (!isAdminAction) {
        return 'All of your active sessions were signed out.';
    }

    return `${actorName} signed out all of your active sessions.`;
}

function buildAllSessionsRevokedNotification(entry) {
    const metadata = asObject(entry.metadata);

    const targetUserId = metadata.revokedBy
        ? entry.resourceId || null
        : entry.userId;

    if (!targetUserId) {
        return null;
    }

    const isAdminAction =
        Boolean(metadata.revokedBy) &&
        targetUserId !== entry.userId;

    return {
        targetUserId,
        preferenceKey: 'sessionRevokedInApp',
        type: 'security',
        severity: 'warning',
        title: 'All sessions signed out',
        message: buildAllSessionsMessage(
            isAdminAction,
            formatActorName(entry.user)
        ),
        link: '/settings/sessions',
    };
}

function buildDataExportMessage(auditLogs) {
    if (auditLogs <= 0) {
        return 'A data export was generated for your organization.';
    }

    return `A data export was generated with ${auditLogs} audit log entries.`;
}

function buildDataExportedNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    const metadata = asObject(entry.metadata);

    const auditLogs = Number(
        metadata.auditLogs || 0
    );

    return {
        targetUserId: entry.userId,
        preferenceKey: 'auditExportInApp',
        type: 'system',
        severity: 'warning',
        title: 'Audit export completed',
        message: buildDataExportMessage(auditLogs),
        link: '/settings/organization',
    };
}

function buildApiTokenCreatedMessage(tokenName) {
    if (!tokenName) {
        return 'A new API token was created for your account.';
    }

    return `A new API token named ${tokenName} was created.`;
}

async function buildApiKeyCreatedNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    const tokenName = await resolveApiTokenName(
        entry.resourceId || null
    );

    return {
        targetUserId: entry.userId,
        preferenceKey: 'accessChangedInApp',
        type: 'access',
        severity: 'warning',
        title: 'API token created',
        message: buildApiTokenCreatedMessage(
            tokenName
        ),
        link: '/settings/api-keys',
        metadata: {
            tokenName,
        },
    };
}

function buildApiTokenRevokedMessage(tokenName) {
    if (!tokenName) {
        return 'An API token was revoked from your account.';
    }

    return `API token ${tokenName} was revoked.`;
}

async function buildApiKeyRevokedNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    const tokenName = await resolveApiTokenName(
        entry.resourceId || null
    );

    return {
        targetUserId: entry.userId,
        preferenceKey: 'accessChangedInApp',
        type: 'access',
        severity: 'info',
        title: 'API token revoked',
        message: buildApiTokenRevokedMessage(
            tokenName
        ),
        link: '/settings/api-keys',
        metadata: {
            tokenName,
        },
    };
}

function buildConnectedAppRevokedNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    const metadata = asObject(entry.metadata);

    const appName =
        metadata.appName ||
        'a connected app';

    return {
        targetUserId: entry.userId,
        preferenceKey: 'accessChangedInApp',
        type: 'access',
        severity: 'warning',
        title: 'Connected app access revoked',
        message: `Access for ${appName} was revoked.`,
        link: '/dashboard/security?tab=connected-apps',
        metadata: {
            appName,
        },
    };
}

function buildTrustedDeviceRevokedNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    return {
        targetUserId: entry.userId,
        preferenceKey: 'accessChangedInApp',
        type: 'access',
        severity: 'warning',
        title: 'Trusted device removed',
        message:
            'A trusted device was removed from your account.',
        link: '/dashboard/security?tab=devices',
    };
}

function buildAllTrustedDevicesRevokedNotification(
    entry
) {
    if (!entry.userId) {
        return null;
    }

    return {
        targetUserId: entry.userId,
        preferenceKey: 'accessChangedInApp',
        type: 'access',
        severity: 'warning',
        title: 'Trusted devices cleared',
        message:
            'All trusted devices were removed from your account.',
        link: '/dashboard/security?tab=devices',
    };
}

const NOTIFICATION_BUILDERS = {
    LOGIN: buildNewLoginNotification,
    PASSWORD_CHANGED: buildPasswordChangedNotification,
    MFA_DISABLED: buildMfaDisabledNotification,
    ACCOUNT_LOCKED: buildAccountLockedNotification,
    USER_STATUS_CHANGED:
        buildUserStatusChangedNotification,
    USER_CREATED: buildUserCreatedNotification,
    ROLE_ASSIGNED: buildRoleAssignedNotification,
    POLICY_CREATED: buildPolicyChangedNotification,
    POLICY_UPDATED: buildPolicyChangedNotification,
    POLICY_DELETED: buildPolicyChangedNotification,
    POLICY_ATTACHED: buildPolicyChangedNotification,
    POLICY_DETACHED: buildPolicyChangedNotification,
    SESSION_REVOKED: buildSessionRevokedNotification,
    ALL_OTHER_SESSIONS_REVOKED:
        buildAllOtherSessionsRevokedNotification,
    ALL_SESSIONS_REVOKED:
        buildAllSessionsRevokedNotification,
    DATA_EXPORTED: buildDataExportedNotification,
    API_KEY_CREATED: buildApiKeyCreatedNotification,
    API_KEY_REVOKED: buildApiKeyRevokedNotification,
    CONNECTED_APP_REVOKED:
        buildConnectedAppRevokedNotification,
    TRUSTED_DEVICE_REVOKED:
        buildTrustedDeviceRevokedNotification,
    ALL_TRUSTED_DEVICES_REVOKED:
        buildAllTrustedDevicesRevokedNotification,
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