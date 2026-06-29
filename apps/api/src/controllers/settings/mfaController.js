const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const prisma = require('../../config/database');
const { createAuditLog } = require('../../utils/auditLog');
const { encryptText } = require('../../utils/crypto');
const {
    mfaSetupState,
    generateBackupCodes,
    fieldError: _fieldError,
} = require('./helpers');

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
