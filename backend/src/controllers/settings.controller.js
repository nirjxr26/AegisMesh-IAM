const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const prisma = require('../config/database');
const tokenService = require('../services/token.service');
const {
    ALLOWED_LANGUAGES,
    DEFAULT_NOTIFICATION_PREFERENCES,
    ensureOrganizationSettings,
    getOrganizationSettings,
    isValidIpOrCidr,
    isValidTimezone,
    mergeNotificationPreferences,
    passwordPolicyErrors,
} = require('../services/organizationSettings.service');
const { createAuditLog } = require('../utils/auditLog');
const { encryptText } = require('../utils/crypto');
const { parseDeviceInfo } = require('../services/userSecurity.service');

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

exports.getProfile = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                firstName: true,
                lastName: true,
                email: true,
                jobTitle: true,
                department: true,
                timezone: true,
                language: true,
                avatarUrl: true,
                emailVerified: true,
                mfaEnabled: true,
                failedLoginCount: true,
                passwordChangedAt: true,
                passwordHash: true,
                backupCodes: true,
                mfaBackupCodes: true,
                createdAt: true,
                sessions: {
                    select: { createdAt: true },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });

        if (!user) {
            return res.status(404).json({ success: false, error: { code: 'USER_001', message: 'User not found' } });
        }

        const lastLoginAt = user.sessions?.[0]?.createdAt || null;
        res.json({ success: true, data: safeUserProfile({ ...user, lastLoginAt }) });
    } catch (error) {
        next(error);
    }
};

exports.updateProfile = async (req, res, next) => {
    try {
        const { firstName, lastName, jobTitle, department, timezone, language } = req.body || {};
        const errors = [];

        if (!firstName || String(firstName).trim().length === 0) {
            errors.push(fieldError('firstName', 'First name is required'));
        }
        if (!lastName || String(lastName).trim().length === 0) {
            errors.push(fieldError('lastName', 'Last name is required'));
        }
        if (String(firstName || '').length > 50) {
            errors.push(fieldError('firstName', 'First name must be at most 50 characters'));
        }
        if (String(lastName || '').length > 50) {
            errors.push(fieldError('lastName', 'Last name must be at most 50 characters'));
        }

        if (timezone && !isValidTimezone(timezone)) {
            errors.push(fieldError('timezone', 'Timezone must be a valid IANA timezone'));
        }

        if (language && !ALLOWED_LANGUAGES.includes(language)) {
            errors.push(fieldError('language', 'Language is not supported'));
        }

        if (errors.length > 0) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors } });
        }

        const updated = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                firstName: String(firstName).trim(),
                lastName: String(lastName).trim(),
                jobTitle: jobTitle ? String(jobTitle).trim() : null,
                department: department ? String(department).trim() : null,
                timezone: timezone || 'UTC',
                language: language || 'en',
            },
            select: {
                firstName: true,
                lastName: true,
                email: true,
                jobTitle: true,
                department: true,
                timezone: true,
                language: true,
                avatarUrl: true,
                emailVerified: true,
                mfaEnabled: true,
                failedLoginCount: true,
                passwordChangedAt: true,
                passwordHash: true,
                backupCodes: true,
                mfaBackupCodes: true,
                createdAt: true,
                sessions: {
                    select: { createdAt: true },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'PROFILE_UPDATED',
            category: 'USER_MANAGEMENT',
            resource: 'settings/profile',
            resourceId: req.user.id,
            result: 'SUCCESS',
            metadata: {
                fields: ['firstName', 'lastName', 'jobTitle', 'department', 'timezone', 'language'],
            },
        });

        const lastLoginAt = updated.sessions?.[0]?.createdAt || null;
        res.json({ success: true, data: safeUserProfile({ ...updated, lastLoginAt }) });
    } catch (error) {
        next(error);
    }
};

exports.uploadAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Avatar file is required' } });
        }

        await fs.promises.mkdir(path.join(AVATAR_DIR, req.user.id), { recursive: true });

        const ext = path.extname(req.file.originalname || '').toLowerCase() || '.png';
        const fileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
        const userDir = path.join(AVATAR_DIR, req.user.id);
        const filePath = path.join(userDir, fileName);

        await fs.promises.writeFile(filePath, req.file.buffer);

        const avatarUrl = `/uploads/avatars/${req.user.id}/${fileName}`;

        await prisma.user.update({
            where: { id: req.user.id },
            data: { avatarUrl },
        });

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'PROFILE_AVATAR_UPDATED',
            category: 'USER_MANAGEMENT',
            resource: 'settings/profile/avatar',
            resourceId: req.user.id,
            result: 'SUCCESS',
        });

        res.json({ success: true, data: { avatarUrl } });
    } catch (error) {
        next(error);
    }
};

exports.deleteAvatar = async (req, res, next) => {
    try {
        await prisma.user.update({
            where: { id: req.user.id },
            data: { avatarUrl: null },
        });

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'PROFILE_AVATAR_REMOVED',
            category: 'USER_MANAGEMENT',
            resource: 'settings/profile/avatar',
            resourceId: req.user.id,
            result: 'SUCCESS',
        });

        res.json({ success: true, data: { avatarUrl: null } });
    } catch (error) {
        next(error);
    }
};

exports.changePassword = async (req, res, next) => {
    try {
        const { newPassword, confirmPassword } = req.body || {};

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user?.passwordHash) {
            return res.status(404).json({ success: false, error: { code: 'USER_001', message: 'User not found' } });
        }

        const errors = [];

        if (!newPassword || String(newPassword).length === 0) {
            errors.push(fieldError('newPassword', 'New password is required'));
        }

        const matchesExistingPassword = newPassword
            ? await bcrypt.compare(String(newPassword || ''), user.passwordHash)
            : false;

        if (matchesExistingPassword) {
            errors.push(fieldError('newPassword', 'New password must be different from current password'));
        }

        if (String(newPassword || '') !== String(confirmPassword || '')) {
            errors.push(fieldError('confirmPassword', 'Confirm password must match new password'));
        }

        const orgSettings = await getOrganizationSettings();
        const policyIssues = passwordPolicyErrors(String(newPassword || ''), orgSettings);
        for (const issue of policyIssues) {
            errors.push(fieldError('newPassword', issue));
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Validation failed',
                    details: errors,
                },
            });
        }

        const newHash = await bcrypt.hash(String(newPassword), BCRYPT_ROUNDS);

        await prisma.user.update({
            where: { id: req.user.id },
            data: {
                passwordHash: newHash,
                passwordChangedAt: new Date(),
            },
        });

        const revokedCount = await tokenService.revokeAllOtherSessions(req.user.id, req.user.sessionId || null);

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'PASSWORD_CHANGED',
            category: 'SECURITY',
            resource: 'settings/security/password',
            resourceId: req.user.id,
            result: 'SUCCESS',
            metadata: {
                otherSessionsRevoked: revokedCount,
            },
        });

        res.json({ success: true, data: { message: 'Password updated successfully' } });
    } catch (error) {
        next(error);
    }
};

exports.getMfaSetup = async (req, res, next) => {
    try {
        const secret = authenticator.generateSecret();
        const otpAuth = authenticator.keyuri(req.user.email, 'IAM Console', secret);
        const qrCodeUrl = await QRCode.toDataURL(otpAuth);
        const backupCodes = generateBackupCodes(8);

        const stateToken = crypto.randomUUID();
        mfaSetupState.set(stateToken, {
            userId: req.user.id,
            secret,
            backupCodes,
            createdAt: Date.now(),
        });

        res.json({
            success: true,
            data: {
                stateToken,
                secret,
                qrCodeUrl,
                backupCodes,
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.verifyMfa = async (req, res, next) => {
    try {
        const { token, secret, stateToken } = req.body || {};

        let effectiveSecret = secret;
        let backupCodes = generateBackupCodes(8);

        if (stateToken && mfaSetupState.has(stateToken)) {
            const state = mfaSetupState.get(stateToken);
            if (state.userId === req.user.id && Date.now() - state.createdAt <= 10 * 60 * 1000) {
                effectiveSecret = state.secret;
                backupCodes = state.backupCodes;
                mfaSetupState.delete(stateToken);
            }
        }

        if (!effectiveSecret) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Secret is required' } });
        }

        const isValid = authenticator.verify({ token: String(token || ''), secret: effectiveSecret });
        if (!isValid) {
            return res.status(400).json({ success: false, error: { code: 'AUTH_005', message: 'Invalid MFA token' } });
        }

        const hashedCodes = await Promise.all(backupCodes.map((code) => bcrypt.hash(code, 8)));

        await prisma.user.update({
            where: { id: req.user.id },
            data: {
                mfaEnabled: true,
                mfaType: 'totp',
                mfaSecret: encryptText(effectiveSecret),
                backupCodes: hashedCodes,
                mfaBackupCodes: null,
            },
        });

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'MFA_ENABLED',
            category: 'MFA',
            resource: 'settings/security/mfa',
            resourceId: req.user.id,
            result: 'SUCCESS',
        });

        res.json({ success: true, data: { success: true, backupCodes } });
    } catch (error) {
        next(error);
    }
};

exports.disableMfa = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, mfaEnabled: true },
        });

        if (!user) {
            return res.status(404).json({ success: false, error: { code: 'USER_001', message: 'User not found' } });
        }

        if (!user.mfaEnabled) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'MFA is not enabled' } });
        }

        await prisma.user.update({
            where: { id: req.user.id },
            data: {
                mfaEnabled: false,
                mfaType: null,
                mfaSecret: null,
                backupCodes: [],
                mfaBackupCodes: null,
            },
        });

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'MFA_DISABLED',
            category: 'MFA',
            resource: 'settings/security/mfa',
            resourceId: req.user.id,
            result: 'SUCCESS',
        });

        res.json({ success: true, data: { message: 'MFA disabled' } });
    } catch (error) {
        next(error);
    }
};

exports.regenerateBackupCodes = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, mfaEnabled: true },
        });

        if (!user) {
            return res.status(404).json({ success: false, error: { code: 'USER_001', message: 'User not found' } });
        }

        if (!user.mfaEnabled) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Enable MFA before generating backup codes' } });
        }

        const backupCodes = generateBackupCodes(8);
        const hashedCodes = await Promise.all(backupCodes.map((code) => bcrypt.hash(code, 8)));

        await prisma.user.update({
            where: { id: req.user.id },
            data: {
                backupCodes: hashedCodes,
                mfaBackupCodes: null,
            },
        });

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'BACKUP_CODES_REGENERATED',
            category: 'MFA',
            resource: 'settings/security/mfa/backup-codes',
            resourceId: req.user.id,
            result: 'SUCCESS',
        });

        res.json({ success: true, data: { backupCodes } });
    } catch (error) {
        next(error);
    }
};

exports.getLoginHistory = async (req, res, next) => {
    try {
        const logs = await prisma.auditLog.findMany({
            where: {
                userId: req.user.id,
                action: { in: ['LOGIN', 'LOGIN_FAILED'] },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                createdAt: true,
                ipAddress: true,
                userAgent: true,
                result: true,
                action: true,
            },
        });

        res.json({
            success: true,
            data: logs.map((log) => ({
                id: log.id,
                timestamp: log.createdAt,
                ip: log.ipAddress,
                userAgent: log.userAgent,
                result: log.result,
                action: log.action,
            })),
        });
    } catch (error) {
        next(error);
    }
};

exports.getTrustedDevices = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { trustedDevices: true },
        });

        res.json({ success: true, data: parseTrustedDevices(user?.trustedDevices) });
    } catch (error) {
        next(error);
    }
};

exports.revokeTrustedDevice = async (req, res, next) => {
    try {
        const deviceId = req.params.deviceId;

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { trustedDevices: true },
        });

        const devices = parseTrustedDevices(user?.trustedDevices);
        const nextDevices = devices.filter((device) => device.id !== deviceId);

        await prisma.user.update({
            where: { id: req.user.id },
            data: { trustedDevices: nextDevices },
        });

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'TRUSTED_DEVICE_REVOKED',
            category: 'SECURITY',
            resource: 'settings/security/trusted-devices',
            resourceId: deviceId,
            result: 'SUCCESS',
        });

        res.json({ success: true, data: nextDevices });
    } catch (error) {
        next(error);
    }
};

exports.revokeAllTrustedDevices = async (req, res, next) => {
    try {
        await prisma.user.update({
            where: { id: req.user.id },
            data: { trustedDevices: [] },
        });

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'ALL_TRUSTED_DEVICES_REVOKED',
            category: 'SECURITY',
            resource: 'settings/security/trusted-devices',
            resourceId: req.user.id,
            result: 'SUCCESS',
        });

        res.json({ success: true, data: [] });
    } catch (error) {
        next(error);
    }
};

exports.getSessions = async (req, res, next) => {
    try {
        const sessions = await tokenService.getUserSessions(req.user.id);
        const currentSessionId = req.user.sessionId || null;

        res.json({
            success: true,
            data: sessions.map((session) => serializeSession(session, currentSessionId)),
        });
    } catch (error) {
        next(error);
    }
};

exports.revokeSession = async (req, res, next) => {
    try {
        const { sessionId } = req.params;

        if (req.user.sessionId && sessionId === req.user.sessionId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Cannot revoke your current session. Use Sign Out instead.',
                },
            });
        }

        const session = await prisma.session.findUnique({ where: { id: sessionId } });
        if (!session || session.userId !== req.user.id) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } });
        }

        await tokenService.revokeSession(sessionId, { actorUserId: req.user.id, req });

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'SESSION_REVOKED',
            category: 'SESSION_MANAGEMENT',
            resource: 'settings/sessions',
            resourceId: sessionId,
            result: 'SUCCESS',
        });

        res.json({ success: true, data: { message: 'Session revoked' } });
    } catch (error) {
        next(error);
    }
};

exports.revokeAllOtherSessions = async (req, res, next) => {
    try {
        const revoked = await tokenService.revokeAllOtherSessions(req.user.id, req.user.sessionId || null);

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'ALL_OTHER_SESSIONS_REVOKED',
            category: 'SESSION_MANAGEMENT',
            resource: 'settings/sessions',
            resourceId: req.user.id,
            result: 'SUCCESS',
            metadata: { revokedCount: revoked },
        });

        res.json({ success: true, data: { revoked } });
    } catch (error) {
        next(error);
    }
};

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

exports.getOrganization = async (req, res, next) => {
    try {
        const settings = await ensureOrganizationSettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        next(error);
    }
};

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

exports.updateOrganization = async (req, res, next) => {
    try {
        const payload = req.body || {};
        const current = await ensureOrganizationSettings();

        const data = {};
        const errors = [];

        assignNumberField(
            payload,
            data,
            errors,
            'minPasswordLength',
            6,
            32
        );

        assignNumberField(
            payload,
            data,
            errors,
            'maxFailedAttempts',
            1,
            20
        );

        assignNumberField(
            payload,
            data,
            errors,
            'sessionTimeoutMinutes',
            15,
            10080
        );

        handlePasswordExpiryDays(payload, data, errors);

        assignFields(
            payload,
            data,
            [
                'requireUppercase',
                'requireNumber',
                'requireSymbol',
                'requireMfaForAll',
                'allowOAuthLogin',
            ],
            Boolean
        );

        assignFields(
            payload,
            data,
            ['orgName', 'plan', 'region'],
            String
        );

        handleIpAllowlist(payload, data, errors);

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Validation failed',
                    details: errors,
                },
            });
        }

        const updated = await prisma.organizationSettings.update({
            where: { id: current.id },
            data,
        });

        const diff = {};

        Object.keys(data).forEach((key) => {
            diff[key] = {
                from: current[key],
                to: updated[key],
            };
        });

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'ORG_SETTINGS_UPDATED',
            category: 'SYSTEM',
            resource: 'settings/organization',
            resourceId: updated.id,
            result: 'SUCCESS',
            metadata: { diff },
        });

        res.json({
            success: true,
            data: updated,
        });
    } catch (error) {
        next(error);
    }
};

exports.exportOrganizationData = async (req, res, next) => {
    try {
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

        const [users, roles, policies, groups, auditLogs] = await Promise.all([
            prisma.user.findMany({
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    status: true,
                    emailVerified: true,
                    mfaEnabled: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            prisma.role.findMany({ include: { rolePolicies: true, userRoles: true } }),
            prisma.policy.findMany(),
            prisma.group.findMany({ include: { groupRoles: true, userGroups: true } }),
            prisma.auditLog.findMany({ where: { createdAt: { gte: ninetyDaysAgo } }, orderBy: { createdAt: 'desc' } }),
        ]);

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'DATA_EXPORTED',
            category: 'DATA_ACCESS',
            resource: 'settings/organization/export',
            resourceId: req.user.id,
            result: 'SUCCESS',
            metadata: {
                users: users.length,
                roles: roles.length,
                policies: policies.length,
                groups: groups.length,
                auditLogs: auditLogs.length,
            },
        });

        const payload = {
            generatedAt: new Date().toISOString(),
            users,
            roles,
            policies,
            groups,
            auditLogs,
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="iam-export-${Date.now()}.json"`);
        res.status(200).send(JSON.stringify(payload, null, 2));
    } catch (error) {
        next(error);
    }
};

exports.resetOrganizationPolicies = async (req, res, next) => {
    try {
        const current = await ensureOrganizationSettings();
        const defaults = {
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

        const updated = await prisma.organizationSettings.update({
            where: { id: current.id },
            data: defaults,
        });

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'ORG_POLICIES_RESET',
            category: 'SYSTEM',
            resource: 'settings/organization/policies',
            resourceId: updated.id,
            result: 'SUCCESS',
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

exports.getApiKeys = async (req, res, next) => {
    try {
        const tokens = await prisma.apiToken.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                tokenPrefix: true,
                scopes: true,
                createdAt: true,
                expiresAt: true,
                lastUsedAt: true,
                isActive: true,
                revokedAt: true,
            },
        });

        res.json({ success: true, data: tokens });
    } catch (error) {
        next(error);
    }
};

exports.getConnectedApps = async (req, res, next) => {
    try {
        const [oauthApps, apiTokens] = await Promise.all([
            prisma.oAuthAccount.findMany({
                where: { userId: req.user.id },
                select: {
                    id: true,
                    provider: true,
                    providerId: true,
                },
            }),
            prisma.apiToken.findMany({
                where: {
                    userId: req.user.id,
                    isActive: true,
                },
                select: {
                    id: true,
                    name: true,
                    tokenPrefix: true,
                    scopes: true,
                    createdAt: true,
                    lastUsedAt: true,
                    expiresAt: true,
                },
            }),
        ]);

        const oauthResources = Array.from(new Set(oauthApps.map((app) => `auth/oauth/${app.provider}`)));
        const oauthLogEntries = oauthResources.length > 0
            ? await prisma.auditLog.findMany({
                where: {
                    userId: req.user.id,
                    action: 'OAUTH_LOGIN',
                    resource: { in: oauthResources },
                },
                orderBy: { createdAt: 'desc' },
                select: {
                    resource: true,
                    createdAt: true,
                },
            })
            : [];

        const oauthActivityMap = oauthLogEntries.reduce((map, entry) => {
            const list = map.get(entry.resource) || [];
            list.push(entry.createdAt);
            map.set(entry.resource, list);
            return map;
        }, new Map());

        const oauthFormatted = oauthApps.map((app) => {
            const resourceKey = `auth/oauth/${app.provider}`;
            const providerLogs = oauthActivityMap.get(resourceKey) || [];
            const lastUsedAt = providerLogs[0] || null;
            const connectedAt = providerLogs[providerLogs.length - 1] || null;

            return {
                id: app.id,
                type: 'oauth',
                name: getOAuthAppName(app.provider),
                provider: app.provider,
                icon: app.provider,
                scopes: getOAuthScopes(app.provider),
                connectedAt,
                lastUsedAt,
                riskLevel: 'low',
                description: getOAuthDescription(app.provider),
            };
        });

        const tokensFormatted = apiTokens.map((token) => ({
            id: token.id,
            type: 'api_token',
            name: token.name,
            provider: 'api_key',
            icon: 'key',
            scopes: token.scopes,
            connectedAt: token.createdAt,
            lastUsedAt: token.lastUsedAt,
            expiresAt: token.expiresAt,
            tokenPrefix: token.tokenPrefix,
            riskLevel: token.scopes.some((scope) => {
                const normalized = String(scope || '');
                return normalized.startsWith('write:') || normalized.startsWith('delete:');
            }) ? 'medium' : 'low',
            description: `API key with ${token.scopes.length} permissions`,
        }));

        const apps = [...oauthFormatted, ...tokensFormatted].sort((left, right) => {
            return getConnectedAppSortTime(right) - getConnectedAppSortTime(left);
        });

        res.json({
            success: true,
            data: apps,
            summary: {
                total: apps.length,
                oauth: oauthFormatted.length,
                apiTokens: tokensFormatted.length,
                highRisk: apps.filter((app) => app.riskLevel === 'high').length,
                mediumRisk: apps.filter((app) => app.riskLevel === 'medium').length,
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.revokeConnectedApp = async (req, res, next) => {
    try {
        const { appId } = req.params;

        const [oauthApp, apiToken] = await Promise.all([
            prisma.oAuthAccount.findFirst({
                where: {
                    id: appId,
                    userId: req.user.id,
                },
            }),
            prisma.apiToken.findFirst({
                where: {
                    id: appId,
                    userId: req.user.id,
                },
            }),
        ]);

        if (!oauthApp && !apiToken) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Connected app not found',
                },
            });
        }

        let appType = 'oauth';
        let appName = getOAuthAppName(oauthApp?.provider);

        if (oauthApp) {
            await prisma.oAuthAccount.delete({
                where: { id: appId },
            });
        } else {
            appType = 'api_token';
            appName = apiToken.name;

            await prisma.apiToken.update({
                where: { id: appId },
                data: {
                    isActive: false,
                    revokedAt: new Date(),
                },
            });
        }

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'CONNECTED_APP_REVOKED',
            category: 'SECURITY',
            resource: 'settings/connected-apps',
            resourceId: appId,
            result: 'SUCCESS',
            metadata: {
                appId,
                appType,
                appName,
            },
        });

        res.json({
            success: true,
            message: 'Access revoked',
        });
    } catch (error) {
        next(error);
    }
};

exports.createApiKey = async (req, res, next) => {
    try {
        const { name, scopes, expiresIn } = req.body || {};

        if (!name || String(name).trim().length === 0) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Token name is required' } });
        }

        const parsedScopes = normalizeScopes(scopes);
        if (parsedScopes.length === 0) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'At least one scope is required' } });
        }

        const rawToken = `iam_${crypto.randomBytes(20).toString('hex')}`;
        const tokenHash = await bcrypt.hash(rawToken, 10);
        const tokenPrefix = rawToken.slice(0, 12);

        let expiresAt = null;
        if (expiresIn !== null && expiresIn !== undefined && expiresIn !== '') {
            const days = Number(expiresIn);
            if (Number.isNaN(days) || days < 1 || days > 3650) {
                return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'expiresIn must be null or between 1 and 3650 days' } });
            }
            expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        }

        const token = await prisma.apiToken.create({
            data: {
                userId: req.user.id,
                name: String(name).trim(),
                tokenHash,
                tokenPrefix,
                scopes: parsedScopes,
                expiresAt,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                tokenPrefix: true,
                scopes: true,
                createdAt: true,
                expiresAt: true,
                lastUsedAt: true,
                isActive: true,
            },
        });

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'API_KEY_CREATED',
            category: 'SECURITY',
            resource: 'settings/api-keys',
            resourceId: token.id,
            result: 'SUCCESS',
            metadata: { scopes: parsedScopes },
        });

        res.status(201).json({ success: true, data: { token: rawToken, ...token } });
    } catch (error) {
        next(error);
    }
};

exports.revokeApiKey = async (req, res, next) => {
    try {
        const tokenId = req.params.tokenId;

        const token = await prisma.apiToken.findUnique({ where: { id: tokenId } });
        if (!token || token.userId !== req.user.id) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'API key not found' } });
        }

        const updated = await prisma.apiToken.update({
            where: { id: tokenId },
            data: {
                isActive: false,
                revokedAt: new Date(),
            },
            select: {
                id: true,
                name: true,
                tokenPrefix: true,
                scopes: true,
                createdAt: true,
                expiresAt: true,
                lastUsedAt: true,
                isActive: true,
                revokedAt: true,
            },
        });

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'API_KEY_REVOKED',
            category: 'SECURITY',
            resource: 'settings/api-keys',
            resourceId: tokenId,
            result: 'SUCCESS',
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};

exports.ensureDefaults = async (req, res, next) => {
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
};
