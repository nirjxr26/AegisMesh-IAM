const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const prisma = require('../../config/database');
const emailService = require('../email.service');
const tokenService = require('../token.service');
const { auditAuth, auditSession } = require('../../utils/auditLog');
const { createError } = require('../../utils/errors');
const logger = require('../../utils/logger');

const BCRYPT_ROUNDS = Number.parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
const RESET_EXPIRY_HOURS = Number.parseInt(process.env.PASSWORD_RESET_EXPIRY_HOURS, 10) || 1;

async function forgotPassword({ email, req }) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        return { message: 'If an account exists with that email, a reset link has been sent' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + RESET_EXPIRY_HOURS);

    await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: hashedToken, passwordResetExpires: expires },
    });

    try {
        await emailService.sendPasswordResetEmail(email, resetToken);
    } catch (error) {
        logger.error('Failed to send password reset email', { error: error.message });
    }

    await auditAuth.passwordResetRequested(req, email);

    return { message: 'If an account exists with that email, a reset link has been sent' };
}

async function resetPassword({ token, newPassword, req }) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
        where: { passwordResetToken: hashedToken, passwordResetExpires: { gt: new Date() } },
    });

    if (!user) {
        throw createError('AUTH_010');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordHash,
            passwordResetToken: null,
            passwordResetExpires: null,
            passwordChangedAt: new Date(),
            failedLoginCount: 0,
            lockedUntil: null,
            status: 'ACTIVE',
        },
    });

    await tokenService.deleteAllUserSessions(user.id);
    await auditAuth.passwordReset(req, user.id);
    await auditSession.allRevoked(req, user.id, 'Password reset');

    return { message: 'Password reset successful' };
}

async function verifyEmail({ token, req }) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findFirst({ where: { emailVerifyToken: hashedToken } });

    if (!user) {
        throw createError('AUTH_007', { message: 'Invalid verification token' });
    }

    const TOKEN_EXPIRY_HOURS = 24;
    if (user.emailVerifyTokenCreatedAt) {
        const elapsed = Date.now() - new Date(user.emailVerifyTokenCreatedAt).getTime();
        if (elapsed > TOKEN_EXPIRY_HOURS * 60 * 60 * 1000) {
            throw createError('AUTH_010', { message: 'Verification token has expired. Please request a new one.' });
        }
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, emailVerifyToken: null, emailVerifyTokenCreatedAt: null },
    });

    await auditAuth.emailVerified(req, user.id);

    return { message: 'Email verified successfully' };
}

module.exports = { forgotPassword, resetPassword, verifyEmail };
