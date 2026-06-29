const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const prisma = require('../../config/database');
const emailService = require('../email.service');
const { auditAuth } = require('../../utils/auditLog');
const { createError } = require('../../utils/errors');
const logger = require('../../utils/logger');

const BCRYPT_ROUNDS = Number.parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;

async function register({ email, password, firstName, lastName, req }) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw createError('AUTH_009');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');
    const hashedVerifyToken = crypto.createHash('sha256').update(emailVerifyToken).digest('hex');

    const user = await prisma.user.create({
        data: { email, passwordHash, firstName, lastName, emailVerifyToken: hashedVerifyToken },
    });

    try {
        const result = await emailService.sendVerificationEmail(email, emailVerifyToken);
        logger.info('Verification email sent', { email, previewUrl: result.previewUrl });
    } catch (error) {
        logger.error('Failed to send verification email', { error: error.message, email });
    }

    await auditAuth.registered(req, user.id);

    return { userId: user.id, message: 'Verification email sent' };
}

module.exports = { register };
