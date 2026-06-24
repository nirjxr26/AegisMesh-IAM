const mfaService = require('../services/mfa.service');
const prisma = require('../config/database');
const bcrypt = require('bcryptjs');
const { auditMFA } = require('../utils/auditLog');
const { createError } = require('../utils/errors');
const { decryptText, encryptText } = require('../utils/crypto');

/**
 * POST /api/auth/mfa/setup
 */
async function setupMFA(req, res, next) {
    try {
        const user = req.user;
        const secret = mfaService.generateSecret();
        const qrCodeUrl = await mfaService.generateQRCode(user.email, secret);

        await prisma.user.update({
            where: { id: user.id },
            data: { mfaSecret: secret },
        });

        await auditMFA.setupInitiated(req, user.id);

        res.json({ success: true, data: { secret, qrCodeUrl } });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/auth/mfa/verify-setup
 */
async function verifySetup(req, res, next) {
    try {
        const { totpCode } = req.body;
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });

        if (!user.mfaSecret) {
            return res.status(400).json({
                success: false,
                error: { code: 'MFA_NOT_SETUP', message: 'MFA setup not initiated' },
            });
        }

        const isValid = mfaService.verifyTOTP(totpCode, user.mfaSecret);
        if (!isValid) {
            throw createError('AUTH_005');
        }

        const backupCodes = mfaService.generateBackupCodes();
        const hashedBackupCodes = await Promise.all(
            backupCodes.map((code) => bcrypt.hash(code, 8))
        );

        await prisma.user.update({
            where: { id: user.id },
            data: {
                mfaEnabled: true,
                mfaType: 'totp',
                mfaSecret: encryptText(user.mfaSecret),
                backupCodes: hashedBackupCodes,
                mfaBackupCodes: JSON.stringify(backupCodes),
            },
        });

        await auditMFA.enabled(req, user.id);

        res.json({ success: true, data: { message: 'MFA enabled successfully', backupCodes } });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/auth/mfa/disable
 */
async function disableMFA(req, res, next) {
    try {
        const { totpCode, password } = req.body;
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });

        if (!user.mfaEnabled) {
            return res.status(400).json({
                success: false,
                error: { code: 'MFA_NOT_ENABLED', message: 'MFA is not enabled' },
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw createError('AUTH_001');
        }

        const decryptedSecret = decryptText(user.mfaSecret) || user.mfaSecret;
        const isValidTotp = mfaService.verifyTOTP(totpCode, decryptedSecret);
        if (!isValidTotp) {
            throw createError('AUTH_005');
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                mfaEnabled: false,
                mfaType: null,
                mfaSecret: null,
                backupCodes: [],
                mfaBackupCodes: null,
            },
        });

        await auditMFA.disabled(req, user.id);

        res.json({ success: true, data: { message: 'MFA disabled successfully' } });
    } catch (error) {
        next(error);
    }
}

module.exports = { setupMFA, verifySetup, disableMFA };
