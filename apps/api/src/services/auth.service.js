const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const prisma = require('../config/database');
const tokenService = require('./token.service');
const emailService = require('./email.service');
const mfaService = require('./mfa.service');
const { auditAuth, auditSecurity, auditSession, auditMFA } = require('../utils/auditLog');
const { createError } = require('../utils/errors');
const logger = require('../utils/logger');
const { getOrganizationSettings } = require('./organizationSettings.service');
const { decryptText } = require('../utils/crypto');
const { upsertTrustedDevice } = require('./userSecurity.service');

const BCRYPT_ROUNDS = Number.parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
const MAX_FAILED_ATTEMPTS = Number.parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS, 10) || 5;
const LOCK_DURATION_MINUTES = Number.parseInt(process.env.ACCOUNT_LOCK_DURATION_MINUTES, 10) || 30;
const RESET_EXPIRY_HOURS = Number.parseInt(process.env.PASSWORD_RESET_EXPIRY_HOURS, 10) || 1;

function hasConfiguredBackupCodes(user) {
    return Array.isArray(user?.backupCodes) && user.backupCodes.length > 0;
}

/**
 * Register a new user
 */
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

/**
 * Login a user
 */
async function login({ email, password, totpCode, req }) {
    const orgSettings = await getOrganizationSettings();
    const maxFailedAttempts =
        orgSettings?.maxFailedAttempts || MAX_FAILED_ATTEMPTS;

    const user = await findUserByEmail(email);

    await validateUserAccess(user, req, email);

    const isPasswordValid = await bcrypt.compare(
        password,
        user.passwordHash
    );

    if (!isPasswordValid) {
        await handleFailedPassword({
            user,
            req,
            email,
            maxFailedAttempts,
        });
    }

    if (user.mfaEnabled) {
        await validateMFA({ user, totpCode, req });
    }

    await resetUserLockState(user.id);

    return createLoginResponse({ user, req });
}

/* -------------------------------------------------------------------------- */
/* Helpers */
/* -------------------------------------------------------------------------- */

async function findUserByEmail(email) {
    return prisma.user.findUnique({
        where: { email },
        include: {
            userRoles: {
                include: {
                    role: {
                        select: { name: true },
                    },
                },
            },
        },
    });
}

async function validateUserAccess(user, req, email) {
    if (!user) {
        await auditAuth.loginFailed(
            req,
            email,
            'User not found',
            'AUTH_001'
        );

        throw createError('AUTH_001');
    }

    if (user.status === 'INACTIVE') {
        throw createError('AUTH_008');
    }

    const isLocked =
        user.status === 'LOCKED' ||
        (user.lockedUntil && new Date(user.lockedUntil) > new Date());

    if (isLocked) {
        await auditAuth.loginFailed(
            req,
            email,
            'Account locked',
            'AUTH_002'
        );

        throw createError('AUTH_002', {
            unlockTime: user.lockedUntil,
        });
    }

    const lockExpired =
        user.lockedUntil &&
        new Date(user.lockedUntil) <= new Date();

    if (lockExpired) {
        await resetUserLockState(user.id);
    }

    if (!user.emailVerified) {
        throw createError('AUTH_003');
    }

    if (!user.passwordHash) {
        throw createError('AUTH_001');
    }
}

async function handleFailedPassword({
    user,
    req,
    email,
    maxFailedAttempts,
}) {
    const newFailedCount = user.failedLoginCount + 1;

    const updateData = {
        failedLoginCount: newFailedCount,
    };

    const shouldLock =
        newFailedCount >= maxFailedAttempts;

    if (shouldLock) {
        const lockUntil = new Date();

        lockUntil.setMinutes(
            lockUntil.getMinutes() + LOCK_DURATION_MINUTES
        );

        updateData.lockedUntil = lockUntil;
        updateData.status = 'LOCKED';

        logger.warn(
            `Account locked for user ${user.email}. Unlock at ${lockUntil}`
        );
    }

    await prisma.user.update({
        where: { id: user.id },
        data: updateData,
    });

    await auditAuth.loginFailed(
        req,
        email,
        'Invalid password',
        'AUTH_001'
    );

    if (shouldLock) {
        await auditSecurity.accountLocked(
            req,
            user.id,
            email
        );

        throw createError('AUTH_002', {
            unlockTime: updateData.lockedUntil,
        });
    }

    throw createError('AUTH_001');
}

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

async function resetUserLockState(userId) {
    await prisma.user.update({
        where: { id: userId },
        data: {
            failedLoginCount: 0,
            lockedUntil: null,
            status: 'ACTIVE',
        },
    });
}

async function createLoginResponse({ user, req }) {
    const refreshToken =
        tokenService.generateRefreshToken(user);

    const deviceInfo =
        req?.headers?.['user-agent'];

    const ipAddress =
        req?.ip || req?.socket?.remoteAddress;

    const session = await tokenService.createSession(
        user.id,
        refreshToken,
        deviceInfo,
        ipAddress
    );

    await upsertTrustedDevice(
        user.id,
        deviceInfo,
        ipAddress
    );

    const accessToken =
        tokenService.generateAccessToken(
            user,
            session.id
        );

    await auditAuth.loginSuccess(
        req,
        user.id,
        session.id
    );

    const roleNames = (user.userRoles || [])
        .map((ur) => ur.role?.name)
        .filter(Boolean);

    const role = roleNames.includes('SuperAdmin')
        ? 'SuperAdmin'
        : (roleNames[0] || null);

    const { ...safeUser } = user;
    const hasPassword = Boolean(safeUser.passwordHash);
    const hasBackupCodes = hasConfiguredBackupCodes({
        backupCodes: safeUser.mfaBackupCodes,
        mfaBackupCodes: safeUser.mfaBackupCodes,
    });
    Reflect.deleteProperty(safeUser, 'passwordHash');
    Reflect.deleteProperty(safeUser, 'mfaSecret');
    Reflect.deleteProperty(safeUser, 'mfaBackupCodes');
    Reflect.deleteProperty(safeUser, 'backupCodes');
    Reflect.deleteProperty(safeUser, 'emailVerifyToken');
    Reflect.deleteProperty(safeUser, 'passwordResetToken');
    Reflect.deleteProperty(safeUser, 'passwordResetExpires');
    Reflect.deleteProperty(safeUser, 'userRoles');

    return {
        accessToken,
        refreshToken,
        user: {
            ...safeUser,
            role,
            hasBackupCodes,
            hasPassword,
        },
    };
}
/**
 * Logout
 */
async function logout({ refreshToken, accessToken, userId, req }) {
    let sessionId = req?.user?.sessionId || null;

    if (refreshToken) {
        const session = await tokenService.findSessionByToken(refreshToken);
        sessionId = session?.id || sessionId;
        await tokenService.deleteSession(refreshToken);
    }

    if (accessToken) {
        await tokenService.blacklistToken(accessToken);
    }

    await auditAuth.logout(req, userId, sessionId);

    return { message: 'Logged out successfully' };
}

/**
 * Refresh access token
 */
async function refreshAccessToken({ refreshToken, req }) {
    const payload = tokenService.verifyRefreshToken(refreshToken);
    if (!payload) {
        throw createError('AUTH_006');
    }

    const session = await tokenService.findSessionByToken(refreshToken);
    if (!session) {
        throw createError('AUTH_007');
    }

    if (new Date(session.expiresAt) < new Date()) {
        await tokenService.deleteSession(refreshToken);
        throw createError('AUTH_006');
    }

    const deviceInfo = req?.headers?.['user-agent'];
    const ipAddress = req?.ip || req?.socket?.remoteAddress;

    const rotation = await tokenService.rotateRefreshToken(
        refreshToken,
        session.userId,
        deviceInfo,
        ipAddress
    );

    const newAccessToken = tokenService.generateAccessToken(session.user, rotation.session.id);

    await auditAuth.tokenRefreshed(req, session.userId, rotation.session.id);

    return { accessToken: newAccessToken, refreshToken: rotation.refreshToken };
}

/**
 * Request a password reset
 */
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

/**
 * Reset password with token
 */
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

/**
 * Verify email
 */
async function verifyEmail({ token, req }) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findFirst({ where: { emailVerifyToken: hashedToken } });

    if (!user) {
        throw createError('AUTH_007', { message: 'Invalid verification token' });
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, emailVerifyToken: null },
    });

    await auditAuth.emailVerified(req, user.id);

    return { message: 'Email verified successfully' };
}

/**
 * Get current user profile
 */
async function getProfile(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            emailVerified: true,
            mfaEnabled: true,
            failedLoginCount: true,
            passwordChangedAt: true,
            passwordHash: true,
            backupCodes: true,
            mfaBackupCodes: true,
            createdAt: true,
            updatedAt: true,
            userRoles: {
                include: {
                    role: {
                        select: { name: true },
                    },
                },
            },
        },
    });

    if (!user) {
        throw createError('AUTH_007');
    }

    const roleNames = (user.userRoles || []).map((ur) => ur.role?.name).filter(Boolean);
    const role = roleNames.includes('SuperAdmin') ? 'SuperAdmin' : (roleNames[0] || null);

    const { ...safeUser } = user;
    const hasPassword = Boolean(safeUser.passwordHash);
    const hasBackupCodes = hasConfiguredBackupCodes({ backupCodes: safeUser.mfaBackupCodes, mfaBackupCodes: safeUser.mfaBackupCodes });
    Reflect.deleteProperty(safeUser, 'userRoles');
    Reflect.deleteProperty(safeUser, 'passwordHash');
    Reflect.deleteProperty(safeUser, 'backupCodes');
    Reflect.deleteProperty(safeUser, 'mfaBackupCodes');

    return {
        ...safeUser,
        role,
        hasBackupCodes,
        hasPassword,
    };
}

module.exports = {
    register,
    login,
    logout,
    refreshAccessToken,
    forgotPassword,
    resetPassword,
    verifyEmail,
    getProfile,
};
