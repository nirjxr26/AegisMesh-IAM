const prisma = require('../../config/database');

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

module.exports = {
    buildNewLoginNotification,
    buildPasswordChangedNotification,
    buildMfaDisabledNotification,
    buildAccountLockedNotification,
    buildUserStatusChangedNotification,
    buildUserCreatedNotification,
};
