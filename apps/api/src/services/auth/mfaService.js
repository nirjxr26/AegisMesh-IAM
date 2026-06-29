const bcrypt = require('bcryptjs');
const prisma = require('../../config/database');
const mfaService = require('../mfa.service');
const { decryptText } = require('../../utils/crypto');
const { auditAuth, auditMFA } = require('../../utils/auditLog');
const { createError } = require('../../utils/errors');

async function validateMFA({ user, totpCode, req }) {
    if (!totpCode) {
        throw createError('AUTH_004');
    }

    const normalizedCode = String(totpCode).toUpperCase();

    const backupCodeValid = await validateHashedBackupCode({
        user,
        normalizedCode,
        req,
    });

    if (backupCodeValid) {
        return;
    }

    const decryptedSecret = decryptText(user.mfaSecret) || user.mfaSecret;

    const isValid = mfaService.verifyTOTP(totpCode, decryptedSecret);

    if (!isValid) {
        await auditAuth.loginMFAFailed(req, user.id);
        throw createError('AUTH_005');
    }
}

async function validateHashedBackupCode({
    user,
    normalizedCode,
    req,
}) {
    if (!Array.isArray(user.backupCodes) || user.backupCodes.length === 0) {
        return false;
    }

    const remainingHashes = [];
    let matched = false;

    for (const hash of user.backupCodes) {
        const isMatch = !matched && (await bcrypt.compare(normalizedCode, hash));

        if (isMatch) {
            matched = true;
            continue;
        }

        remainingHashes.push(hash);
    }

    if (!matched) {
        return false;
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { backupCodes: remainingHashes },
    });

    await auditMFA.backupCodeUsed(req, user.id);

    return true;
}

module.exports = { validateMFA, validateHashedBackupCode };
