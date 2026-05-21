const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/database');
const logger = require('../utils/logger');
const { auditSession } = require('../utils/auditLog');
const { getOrganizationSettings } = require('./organizationSettings.service');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

async function getSessionTimeoutMinutes() {
    try {
        const settings = await getOrganizationSettings();
        if (settings?.sessionTimeoutMinutes && settings.sessionTimeoutMinutes > 0) {
            return settings.sessionTimeoutMinutes;
        }
    } catch {
        // Fall back to default when org settings are unavailable.
    }

    return 7 * 24 * 60; // 7 days
}

/**
 * Generate an access token
 */
function generateAccessToken(user, sessionId = null) {
    return jwt.sign(
        {
            sub: user.id,
            email: user.email,
            type: 'access',
            ...(sessionId ? { sessionId } : {}),
        },
        ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRY }
    );
}

/**
 * Generate a refresh token
 */
function generateRefreshToken(user) {
    return jwt.sign(
        {
            sub: user.id,
            type: 'refresh',
            jti: uuidv4(),
        },
        REFRESH_SECRET,
        { expiresIn: REFRESH_EXPIRY }
    );
}

/**
 * Verify an access token
 */
function verifyAccessToken(token) {
    try {
        return jwt.verify(token, ACCESS_SECRET);
    } catch (_error) {
        return null;
    }
}

/**
 * Verify a refresh token
 */
function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, REFRESH_SECRET);
    } catch (_error) {
        return null;
    }
}

/**
 * Create a session in the database
 */
async function createSession(userId, refreshToken, deviceInfo, ipAddress) {
    const timeoutMinutes = await getSessionTimeoutMinutes();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + timeoutMinutes);

    const session = await prisma.session.create({
        data: {
            userId,
            refreshToken,
            deviceInfo,
            ipAddress,
            expiresAt,
            lastActiveAt: new Date(),
        },
    });

    logger.debug('Session created', { sessionId: session.id, userId });
    return session;
}

/**
 * Find a session by refresh token
 */
async function findSessionByToken(refreshToken) {
    return prisma.session.findUnique({
        where: { refreshToken },
        include: { user: true },
    });
}

/**
 * Delete a session
 */
async function deleteSession(refreshToken) {
    try {
        await prisma.session.delete({
            where: { refreshToken },
        });
        return true;
    } catch {
        return false;
    }
}

async function revokeSession(sessionId, { actorUserId = null, req = null } = {}) {
    const session = await prisma.session.findUnique({
        where: { id: sessionId },
    });

    if (!session) {
        return null;
    }

    await prisma.session.delete({
        where: { id: sessionId },
    });

    await auditSession.revoked(req, actorUserId || session.userId, sessionId);
    return session;
}

/**
 * Delete all sessions for a user
 */
async function deleteAllUserSessions(userId) {
    const result = await prisma.session.deleteMany({
        where: { userId },
    });
    logger.info(`Deleted ${result.count} sessions for user ${userId}`);
    return result.count;
}

/**
 * Get all sessions for a user
 */
async function getUserSessions(userId) {
    return prisma.session.findMany({
        where: { userId },
        select: {
            id: true,
            deviceInfo: true,
            ipAddress: true,
            createdAt: true,
            expiresAt: true,
            lastActiveAt: true,
        },
        orderBy: { createdAt: 'desc' },
    });
}

async function revokeAllOtherSessions(userId, currentSessionId) {
    const where = currentSessionId
        ? { userId, id: { not: currentSessionId } }
        : { userId };

    const result = await prisma.session.deleteMany({ where });
    return result.count;
}

async function touchSession(sessionId) {
    if (!sessionId) return;

    await prisma.session.updateMany({
        where: { id: sessionId },
        data: { lastActiveAt: new Date() },
    });
}

/**
 * Rotate refresh token - delete old, create new
 */
async function rotateRefreshToken(oldRefreshToken, userId, deviceInfo, ipAddress) {
    await deleteSession(oldRefreshToken);

    const user = { id: userId };
    const newRefreshToken = generateRefreshToken(user);
    const session = await createSession(userId, newRefreshToken, deviceInfo, ipAddress);

    return { refreshToken: newRefreshToken, session };
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    createSession,
    findSessionByToken,
    deleteSession,
    revokeSession,
    deleteAllUserSessions,
    getUserSessions,
    revokeAllOtherSessions,
    touchSession,
    rotateRefreshToken,
};
