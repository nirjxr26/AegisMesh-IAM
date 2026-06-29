const path = require('node:path');
const crypto = require('node:crypto');
const prisma = require('../../config/database');
const {
    mergeNotificationPreferences,
    ensureOrganizationSettings,
    DEFAULT_NOTIFICATION_PREFERENCES,
} = require('../../services/organizationSettings.service');
const { parseDeviceInfo } = require('../../services/userSecurity.service');

const AVATAR_DIR = path.join(__dirname, '../../../uploads/avatars');
const BCRYPT_ROUNDS = Number.parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const mfaSetupState = new Map();

function hasConfiguredBackupCodes(user) {
    return Array.isArray(user?.backupCodes) && user.backupCodes.length > 0;
}

function withMergedPrefs(user) {
    return mergeNotificationPreferences(user.notificationPreferences);
}

function fieldError(field, message) {
    return { field, message };
}

function normalizeScopes(scopes) {
    if (!Array.isArray(scopes)) return [];
    return Array.from(new Set(scopes.map((scope) => String(scope).trim()).filter(Boolean)));
}

function getOAuthAppName(provider) {
    const names = {
        google: 'Google',
        github: 'GitHub',
        microsoft: 'Microsoft',
    };

    return names[String(provider || '').toLowerCase()] || provider;
}

function getOAuthScopes(provider) {
    const scopes = {
        google: ['email', 'profile', 'openid'],
        github: ['user:email', 'read:user'],
        microsoft: ['openid', 'profile', 'email'],
    };

    return scopes[String(provider || '').toLowerCase()] || ['profile'];
}

function getOAuthDescription(provider) {
    const descriptions = {
        google: 'Sign in with Google account',
        github: 'Sign in with GitHub account',
        microsoft: 'Sign in with Microsoft account',
    };

    return descriptions[String(provider || '').toLowerCase()] || 'OAuth connection';
}

function getConnectedAppSortTime(app) {
    return new Date(app.lastUsedAt || app.connectedAt || 0).getTime();
}

function generateBackupCodes(count = 8) {
    const codes = [];
    for (let i = 0; i < count; i += 1) {
        codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
}

function safeUserProfile(user) {
    return {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        jobTitle: user.jobTitle,
        department: user.department,
        timezone: user.timezone,
        language: user.language,
        avatarUrl: user.avatarUrl,
        emailVerified: Boolean(user.emailVerified),
        mfaEnabled: Boolean(user.mfaEnabled),
        failedLoginCount: user.failedLoginCount || 0,
        passwordChangedAt: user.passwordChangedAt || null,
        hasBackupCodes: hasConfiguredBackupCodes(user),
        hasPassword: Boolean(user.passwordHash),
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
    };
}

function parseTrustedDevices(value) {
    if (Array.isArray(value)) return value;
    return [];
}

function serializeSession(session, currentSessionId) {
    const device = parseDeviceInfo(session.deviceInfo);

    return {
        id: session.id,
        browser: device.browser,
        os: device.os,
        device: device.device,
        deviceName: device.name,
        ip: session.ipAddress,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        lastActiveAt: session.lastActiveAt,
        isCurrent: session.id === currentSessionId,
    };
}

const assignNumberField = (payload, data, errors, key, min, max) => {
    if (payload[key] === undefined) return;

    const value = Number(payload[key]);

    if (Number.isNaN(value) || value < min || value > max) {
        errors.push(
            fieldError(key, `${key} must be between ${min} and ${max}`)
        );

        return;
    }

    data[key] = value;
};

const handlePasswordExpiryDays = (payload, data, errors) => {
    if (payload.passwordExpiryDays === undefined) return;

    if (
        payload.passwordExpiryDays === null ||
        payload.passwordExpiryDays === ''
    ) {
        data.passwordExpiryDays = null;
        return;
    }

    const value = Number(payload.passwordExpiryDays);

    if (Number.isNaN(value) || value < 1 || value > 365) {
        errors.push(
            fieldError(
                'passwordExpiryDays',
                'passwordExpiryDays must be null or between 1 and 365'
            )
        );

        return;
    }

    data.passwordExpiryDays = value;
};

const assignFields = (payload, data, fields, transformer) => {
    for (const field of fields) {
        if (payload[field] !== undefined) {
            data[field] = transformer(payload[field]);
        }
    }
};

const handleIpAllowlist = (payload, data, errors) => {
    if (payload.ipAllowlist === undefined) return;

    if (!Array.isArray(payload.ipAllowlist)) {
        errors.push(
            fieldError('ipAllowlist', 'ipAllowlist must be an array')
        );

        return;
    }

    const { isValidIpOrCidr } = require('../../services/organizationSettings.service');

    const cleaned = payload.ipAllowlist
        .map((entry) => String(entry).trim())
        .filter(Boolean);

    const invalid = cleaned.filter(
        (entry) => !isValidIpOrCidr(entry)
    );

    if (invalid.length > 0) {
        errors.push(
            fieldError(
                'ipAllowlist',
                `Invalid IP/CIDR values: ${invalid.join(', ')}`
            )
        );

        return;
    }

    data.ipAllowlist = cleaned;
};

async function ensureDefaults(req, res, next) {
    try {
        await ensureOrganizationSettings();

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                notificationPreferences: true,
            },
        });

        if (!user?.notificationPreferences) {
            await prisma.user.update({
                where: { id: req.user.id },
                data: {
                    notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
                    trustedDevices: [],
                },
            });
        }

        return next();
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    AVATAR_DIR,
    BCRYPT_ROUNDS,
    mfaSetupState,
    hasConfiguredBackupCodes,
    withMergedPrefs,
    fieldError,
    normalizeScopes,
    getOAuthAppName,
    getOAuthScopes,
    getOAuthDescription,
    getConnectedAppSortTime,
    generateBackupCodes,
    safeUserProfile,
    parseTrustedDevices,
    serializeSession,
    assignNumberField,
    handlePasswordExpiryDays,
    assignFields,
    handleIpAllowlist,
    ensureDefaults,
};
