const bcrypt = require('bcryptjs');
const prisma = require('../../config/database');
const tokenService = require('../token.service');
const { auditAuth, auditSecurity } = require('../../utils/auditLog');
const { createError } = require('../../utils/errors');
const logger = require('../../utils/logger');
const { getOrganizationSettings } = require('../organizationSettings.service');
const { upsertTrustedDevice } = require('../userSecurity.service');
const { validateMFA } = require('./mfaService');
const { hasConfiguredBackupCodes } = require('./profileService');

const MAX_FAILED_ATTEMPTS = Number.parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS, 10) || 5;
const LOCK_DURATION_MINUTES = Number.parseInt(process.env.ACCOUNT_LOCK_DURATION_MINUTES, 10) || 30;

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

    const {
        passwordHash,
        mfaSecret: _mfaSecret,
        mfaBackupCodes,
        backupCodes,
        emailVerifyToken: _emailVerifyToken,
        passwordResetToken: _passwordResetToken,
        passwordResetExpires: _passwordResetExpires,
        userRoles: _userRoles,
        ...safeUser
    } = user;

    return {
        accessToken,
        refreshToken,
        user: {
            ...safeUser,
            role,
            hasBackupCodes:
                hasConfiguredBackupCodes({
                    backupCodes,
                    mfaBackupCodes,
                }),
            hasPassword: Boolean(passwordHash),
        },
    };
}

module.exports = { login };
