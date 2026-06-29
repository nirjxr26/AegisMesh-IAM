const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const prisma = require('../../config/database');
const emailService = require('../email.service');
const { auditAuth } = require('../../utils/auditLog');
const { createError } = require('../../utils/errors');
const logger = require('../../utils/logger');

const BCRYPT_ROUNDS = Number.parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_UPPERCASE = /[A-Z]/;
const PASSWORD_NUMBER = /\d/;
const PASSWORD_SPECIAL = /[^A-Za-z\d\s]/;

function validatePassword(password) {
    const errors = [];
    if (!password || password.length < PASSWORD_MIN_LENGTH) {
        errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    if (!PASSWORD_UPPERCASE.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!PASSWORD_NUMBER.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (!PASSWORD_SPECIAL.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    return errors;
}

async function register({ email, password, firstName, lastName, req }) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw createError('AUTH_009');
    }

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
        const err = createError('VALIDATION_ERROR', { message: passwordErrors.join('. ') });
        err.statusCode = 400;
        throw err;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');
    const hashedVerifyToken = crypto.createHash('sha256').update(emailVerifyToken).digest('hex');

    const user = await prisma.user.create({
        data: { email, passwordHash, firstName, lastName, emailVerifyToken: hashedVerifyToken, emailVerifyTokenCreatedAt: new Date() },
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
