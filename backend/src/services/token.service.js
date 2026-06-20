const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/database');
const redis = require('../config/redis');
const logger = require('../utils/logger');
const { auditSession } = require('../utils/auditLog');
const { getOrganizationSettings } = require('./organizationSettings.service');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || (process.env.NODE_ENV === 'test' ? 'test-access-secret' : null);
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (process.env.NODE_ENV === 'test' ? 'test-refresh-secret' : null);

if (!ACCESS_SECRET || !REFRESH_SECRET) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT secrets must be provided in production environment');
    }
    logger.warn('⚠️ Using unstable JWT secrets. Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in .env');
}

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
            jti: uuidv4(),
            ...(sessionId ? { sessionId } : {}),
        },
        ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRY }
    );
}

/**
 * Blacklist an access token
 */
async function blacklistToken(token) {
    try {
        const decoded = jwt.decode(token);
        if (!decoded?.jti || !decoded?.exp) {
            return false;
        }

        // Add to database
        await prisma.revokedToken.upsert({
            where: { jti: decoded.jti },
            update: {},
            create: {
                jti: decoded.jti,
                expiresAt: new Date(decoded.exp * 1000),
            },
        });

        // Also add to Redis with TTL
        const remainingTtl = Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
        if (remainingTtl > 0 && redis.status === 'ready') {
            await redis.setex(`token:blacklist:${decoded.jti}`, remainingTtl, '1');
        }

        logger.info(`Token blacklisted: ${decoded.jti}`);
        return true;
    } catch (error) {
        logger.error('Error blacklisting token', { error: error.message });
        return false;
    }
}

/**
 * Check if a token is blacklisted
 */
async function isTokenBlacklisted(jti) {
    if (!jti) return false;

    // 1. Check Redis first
    if (redis.status === 'ready') {
        try {
            const isCached = await redis.exists(`token:blacklist:${jti}`);
            if (isCached) {
                return true;
            }
        } catch (err) {
            logger.error('Redis error checking blacklisted token, falling back to DB', { error: err.message });
        }
    }

    // 2. Fallback to DB
    const revokedToken = await prisma.revokedToken.findUnique({
        where: { jti },
    });

    const exists = !!revokedToken;

    // 3. If found in DB but not in Redis, write to Redis to heal the cache
    if (exists && redis.status === 'ready') {
        try {
            const remainingTtl = Math.max(0, Math.floor((new Date(revokedToken.expiresAt).getTime() - Date.now()) / 1000));
            if (remainingTtl > 0) {
                await redis.setex(`token:blacklist:${jti}`, remainingTtl, '1');
            }
        } catch (err) {
            logger.error('Redis error writing to blacklist cache', { error: err.message });
        }
    }

    return exists;
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
    } catch (error) {
        logger.debug('Access token verification failed', { message: error.message });
        return null;
    }
}

/**
 * Verify a refresh token
 */
function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, REFRESH_SECRET);
    } catch (error) {
        logger.debug('Refresh token verification failed', { message: error.message });
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
        const session = await prisma.session.findUnique({
            where: { refreshToken },
            select: { id: true }
        });
        if (session && redis.status === 'ready') {
            await redis.del(`session:valid:${session.id}`);
        }
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

    if (redis.status === 'ready') {
        await redis.del(`session:valid:${sessionId}`);
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
    try {
        const sessions = await prisma.session.findMany({
            where: { userId },
            select: { id: true }
        });
        if (sessions.length > 0 && redis.status === 'ready') {
            const keys = sessions.map(s => `session:valid:${s.id}`);
            await redis.del(...keys);
        }
    } catch (err) {
        logger.error('Redis error invalidating sessions on deleteAllUserSessions', { error: err.message });
    }

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

    try {
        const sessions = await prisma.session.findMany({
            where,
            select: { id: true }
        });
        if (sessions.length > 0 && redis.status === 'ready') {
            const keys = sessions.map(s => `session:valid:${s.id}`);
            await redis.del(...keys);
        }
    } catch (err) {
        logger.error('Redis error invalidating sessions on revokeAllOtherSessions', { error: err.message });
    }

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

/**
 * Clean up expired revoked tokens
 */
async function cleanupRevokedTokens() {
    try {
        const result = await prisma.revokedToken.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
        logger.info(`Cleaned up ${result.count} expired revoked tokens`);
        return result.count;
    } catch (error) {
        logger.error('Error cleaning up revoked tokens', { error: error.message });
        return 0;
    }
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
    blacklistToken,
    isTokenBlacklisted,
    cleanupRevokedTokens,
};
