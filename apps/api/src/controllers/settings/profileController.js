const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const prisma = require('../../config/database');
const { createAuditLog } = require('../../utils/auditLog');
const {
    AVATAR_DIR,
    ALLOWED_LANGUAGES,
    isValidTimezone,
} = require('../../services/organizationSettings.service');
const {
    fieldError,
    safeUserProfile,
} = require('./helpers');

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
