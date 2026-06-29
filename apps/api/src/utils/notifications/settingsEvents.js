const prisma = require('../../config/database');

function asObject(value) {
    return value &&
        typeof value === 'object' &&
        !Array.isArray(value)
        ? value
        : {};
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

function formatActorName(actor) {
    const firstName = String(actor?.firstName || '').trim();
    const lastName = String(actor?.lastName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || actor?.email || 'An administrator';
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

module.exports = {
    buildSessionRevokedNotification,
    buildAllOtherSessionsRevokedNotification,
    buildAllSessionsRevokedNotification,
    buildDataExportedNotification,
    buildApiKeyCreatedNotification,
    buildApiKeyRevokedNotification,
    buildConnectedAppRevokedNotification,
    buildTrustedDeviceRevokedNotification,
    buildAllTrustedDevicesRevokedNotification,
};
