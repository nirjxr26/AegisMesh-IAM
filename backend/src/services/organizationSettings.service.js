const crypto = require('node:crypto');
const net = require('node:net');

const prisma = require('../config/database');
const redis = require('../config/redis');
const logger = require('../utils/logger');
const { LOOPBACK_IP, LOOPBACK_V6, IPV4_MAPPED_PREFIX } = require('../config/constants');

const DEFAULT_NOTIFICATION_PREFERENCES = {
    newLoginEmail: true,
    newLoginInApp: true,
    passwordChangedEmail: true,
    passwordChangedInApp: true,
    mfaDisabledEmail: true,
    mfaDisabledInApp: true,
    userCreatedEmail: true,
    userCreatedInApp: true,
    roleAssignedEmail: true,
    roleAssignedInApp: true,
    policyChangedEmail: true,
    policyChangedInApp: true,
    failedLoginEmail: true,
    failedLoginInApp: true,
    sessionRevokedEmail: true,
    sessionRevokedInApp: true,
    accessChangedEmail: true,
    accessChangedInApp: true,
    auditExportEmail: true,
    auditExportInApp: true,
};

const ALLOWED_LANGUAGES = [
    'en',
    'es',
    'fr',
    'de',
    'ja',
    'zh',
];

/* -------------------------------------------------------------------------- */
/* Organization Settings */
/* -------------------------------------------------------------------------- */

function buildDefaultOrganizationSettings() {
    return {
        orgName: process.env.ORG_NAME || 'Acme IAM',
        accountId: `org_${crypto.randomBytes(6).toString('hex')}`,
        plan: process.env.ORG_PLAN || 'free',
        region: process.env.ORG_REGION || 'us-east-1',

        minPasswordLength: 8,
        requireUppercase: true,
        requireNumber: true,
        requireSymbol: true,

        passwordExpiryDays: null,
        maxFailedAttempts: 5,
        sessionTimeoutMinutes: 480,

        requireMfaForAll: false,
        allowOAuthLogin: true,

        ipAllowlist: [],
    };
}

async function ensureOrganizationSettings() {
    let settings =
        await prisma.organizationSettings.findFirst();

    if (settings) {
        return settings;
    }

    return prisma.organizationSettings.create({
        data: buildDefaultOrganizationSettings(),
    });
}

async function getOrganizationSettings() {
    const cacheKey = 'org:settings';
    
    // 1. Try Redis first
    if (redis.status === 'ready') {
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.createdAt) parsed.createdAt = new Date(parsed.createdAt);
                if (parsed.updatedAt) parsed.updatedAt = new Date(parsed.updatedAt);
                return parsed;
            }
        } catch (err) {
            logger.error('Redis error fetching org settings cache', { error: err.message });
        }
    }

    // 2. Fetch/Ensure from DB
    const settings = await ensureOrganizationSettings();

    // 3. Cache it in Redis
    if (redis.status === 'ready') {
        try {
            await redis.setex(cacheKey, 86400, JSON.stringify(settings));
        } catch (err) {
            logger.error('Redis error caching org settings', { error: err.message });
        }
    }

    return settings;
}

async function clearOrganizationSettingsCache() {
    if (redis.status === 'ready') {
        try {
            await redis.del('org:settings');
        } catch (err) {
            logger.error('Redis error clearing org settings cache', { error: err.message });
        }
    }
}

/* -------------------------------------------------------------------------- */
/* Password Policy */
/* -------------------------------------------------------------------------- */

function passwordPolicyErrors(password, settings) {
    const errors = [];

    if (!password || typeof password !== 'string') {
        return ['Password is required'];
    }

    validatePasswordLength(password, settings, errors);
    validateUppercase(password, settings, errors);
    validateNumber(password, settings, errors);
    validateSymbol(password, settings, errors);

    return errors;
}

function validatePasswordLength(
    password,
    settings,
    errors
) {
    if (password.length >= settings.minPasswordLength) {
        return;
    }

    errors.push(
        `Password must be at least ${settings.minPasswordLength} characters`
    );
}

function validateUppercase(
    password,
    settings,
    errors
) {
    if (
        !settings.requireUppercase ||
        /[A-Z]/.test(password)
    ) {
        return;
    }

    errors.push(
        'Password must contain at least one uppercase letter'
    );
}

function validateNumber(
    password,
    settings,
    errors
) {
    if (
        !settings.requireNumber ||
        /\d/.test(password)
    ) {
        return;
    }

    errors.push(
        'Password must contain at least one number'
    );
}

function validateSymbol(
    password,
    settings,
    errors
) {
    if (
        !settings.requireSymbol ||
        /[^A-Za-z\d\s]/.test(password)
    ) {
        return;
    }

    errors.push(
        'Password must contain at least one special character'
    );
}

async function validatePasswordAgainstPolicy(password) {
    const settings = await getOrganizationSettings();

    return passwordPolicyErrors(password, settings);
}

/* -------------------------------------------------------------------------- */
/* IP Utilities */
/* -------------------------------------------------------------------------- */

function normalizeIp(ipAddress) {
    if (!ipAddress) {
        return '';
    }

    if (ipAddress === LOOPBACK_V6) {
        return LOOPBACK_IP;
    }

    if (ipAddress.startsWith(IPV4_MAPPED_PREFIX)) {
        return ipAddress.replace(IPV4_MAPPED_PREFIX, '');
    }

    return ipAddress;
}

function isValidIpOrCidr(value) {
    if (!value || typeof value !== 'string') {
        return false;
    }

    const trimmed = value.trim();

    if (!trimmed) {
        return false;
    }

    if (net.isIP(trimmed)) {
        return true;
    }

    return isValidCidr(trimmed);
}

function isValidCidr(value) {
    const parts = String(value).split('/');

    // Must be exactly two parts: base and prefix
    if (parts.length !== 2) {
        return false;
    }

    const [base, prefix] = parts;

    const ipType = net.isIP(base);
    const prefixNumber = Number(prefix);

    if (!ipType || Number.isNaN(prefixNumber)) {
        return false;
    }

    if (ipType === 4) {
        return prefixNumber >= 0 && prefixNumber <= 32;
    }

    return prefixNumber >= 0 && prefixNumber <= 128;
}

function matchesAllowlist(
    ipAddress,
    allowlist = []
) {
    if (!Array.isArray(allowlist) || allowlist.length === 0) {
        return true;
    }

    const normalizedIp = normalizeIp(ipAddress);

    const ipType = net.isIP(normalizedIp);

    if (!ipType) {
        return false;
    }

    return allowlist.some((entry) =>
        matchesAllowlistRule(
            normalizedIp,
            ipType,
            entry
        )
    );
}

function matchesAllowlistRule(
    normalizedIp,
    ipType,
    entry
) {
    const rule = String(entry || '').trim();

    if (!rule) {
        return false;
    }

    const normalizedRule = normalizeIp(rule);

    if (
        net.isIP(normalizedRule) &&
        normalizedRule === normalizedIp
    ) {
        return true;
    }

    return matchesCidrRule(
        normalizedIp,
        ipType,
        rule
    );
}

function matchesCidrRule(
    normalizedIp,
    ipType,
    rule
) {
    const [base, prefix] = rule.split('/');

    if (!base || prefix === undefined) {
        return false;
    }

    const normalizedBase = normalizeIp(base);

    const baseType = net.isIP(normalizedBase);

    if (
        !baseType ||
        baseType !== ipType ||
        Number.isNaN(Number(prefix))
    ) {
        return false;
    }

    try {
        const blockList = new net.BlockList();

        blockList.addSubnet(
            normalizedBase,
            Number(prefix),
            ipType === 4 ? 'ipv4' : 'ipv6'
        );

        return blockList.check(
            normalizedIp,
            ipType === 4 ? 'ipv4' : 'ipv6'
        );
    } catch {
        return false;
    }
}

/* -------------------------------------------------------------------------- */
/* Misc Utilities */
/* -------------------------------------------------------------------------- */

function isValidTimezone(timezone) {
    try {
        Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
        });

        return true;
    } catch {
        return false;
    }
}

function mergeNotificationPreferences(
    currentPrefs
) {
    return {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...currentPrefs,
    };
}

/* -------------------------------------------------------------------------- */
/* Exports */
/* -------------------------------------------------------------------------- */

module.exports = {
    ALLOWED_LANGUAGES,
    DEFAULT_NOTIFICATION_PREFERENCES,

    ensureOrganizationSettings,
    getOrganizationSettings,
    clearOrganizationSettingsCache,

    isValidIpOrCidr,
    isValidTimezone,
    matchesAllowlist,
    mergeNotificationPreferences,
    normalizeIp,

    passwordPolicyErrors,
    validatePasswordAgainstPolicy,
};