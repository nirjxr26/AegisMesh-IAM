const tokenService = require('../services/token.service');
const prisma = require('../config/database');
const redis = require('../config/redis');
const logger = require('../utils/logger');
const { createError } = require('../utils/errors');
const { authenticateApiKeyToken } = require('./apiKeyAuth');
const { enforceOrgPolicyForRequest } = require('./orgPolicy');
const { decryptText } = require('../utils/crypto');
const { getRiskScore } = require('../utils/riskEngine');

function derivePrimaryRole(user) {
    const roleNames = (user.userRoles || []).map((ur) => ur.role?.name).filter(Boolean);
    if (roleNames.includes('SuperAdmin')) return 'SuperAdmin';
    return roleNames[0] || null;
}

/**
 * Authentication middleware
 * Extracts and verifies JWT from Authorization header or cookies
 */
async function extractToken(req) {
    // 1. Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // 2. Check cookies
    if (req.cookies?.accessToken) {
        const rawCookieToken = req.cookies.accessToken;

        return (
            decryptText(rawCookieToken) ||
            rawCookieToken
        );
    }

    return null;
}

async function authenticateApiRequest(req, token) {
    const apiUser = await authenticateApiKeyToken(
        req,
        token
    );

    if (apiUser?.scopeError) {
        return {
            error: {
                status: 403,
                code: 'RBAC_001',
                message:
                    'API key scope does not allow this operation',
            },
        };
    }

    if (!apiUser) {
        throw createError('AUTH_007');
    }

    if (apiUser.status !== 'ACTIVE') {
        throw createError('AUTH_008');
    }

    await enforceOrgPolicyForRequest(req, apiUser);

    return { user: apiUser };
}

async function redisGet(key) {
    if (redis.status !== 'ready') return null;
    try { return await redis.get(key); } catch (err) {
        logger.error('Redis error getting key', { key, error: err.message });
        return null;
    }
}

async function redisSetex(key, ttl, value) {
    if (redis.status !== 'ready') return;
    try { await redis.setex(key, ttl, value); } catch (err) {
        logger.error('Redis error setting key', { key, error: err.message });
    }
}

async function getProfileVersion() {
    const val = await redisGet('user:profile:version');
    return val || '1';
}

async function getUserFromCache(userId, profileVersion) {
    const cacheKey = `user:profile:${userId}:${profileVersion}`;
    const cachedUser = await redisGet(cacheKey);
    if (cachedUser) {
        try {
            const user = JSON.parse(cachedUser);
            user.createdAt = new Date(user.createdAt);
            user.updatedAt = new Date(user.updatedAt);
            return user;
        } catch { return null; }
    }
    return null;
}

async function cacheUser(userId, profileVersion, user) {
    const cacheKey = `user:profile:${userId}:${profileVersion}`;
    await redisSetex(cacheKey, 300, JSON.stringify(user));
}

async function fetchUserFromDb(userId) {
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
            createdAt: true,
            updatedAt: true,
            userRoles: {
                include: {
                    role: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
    });

    if (!user) {
        throw createError('AUTH_007');
    }
    return user;
}

async function isSessionCached(sessionId) {
    const result = await redisGet(`session:valid:${sessionId}`);
    return result === '1';
}

async function cacheSessionValidity(sessionId) {
    await redisSetex(`session:valid:${sessionId}`, 60, '1');
}

async function validateAndRefreshSession(sessionId, userId) {
    const isSessionValid = await isSessionCached(sessionId);
    if (isSessionValid) return;

    const sessionUpdate = await prisma.session.updateMany({
        where: {
            id: sessionId,
            userId: userId,
        },
        data: {
            lastActiveAt: new Date(),
        },
    });

    // If the session no longer exists (revoked), the access token is also invalid
    if (sessionUpdate.count === 0) {
        throw createError('AUTH_006', { message: 'Session has been revoked' });
    }

    await cacheSessionValidity(sessionId);
}

async function authenticateJwtRequest(req, token) {
    const payload =
        tokenService.verifyAccessToken(token);

    if (!payload) {
        throw createError('AUTH_006');
    }

    // Check if token is blacklisted
    if (payload.jti) {
        const isBlacklisted = await tokenService.isTokenBlacklisted(payload.jti);
        if (isBlacklisted) {
            throw createError('AUTH_006', { message: 'Token has been revoked' });
        }
    }

    const profileVersion = await getProfileVersion();
    let user = await getUserFromCache(payload.sub, profileVersion);

    // Fetch from DB on cache miss
    if (!user) {
        user = await fetchUserFromDb(payload.sub);
        await cacheUser(payload.sub, profileVersion, user);
    }

    if (user.status !== 'ACTIVE') {
        throw createError('AUTH_008');
    }

    const sessionId =
        payload.sessionId || null;

    if (sessionId) {
        await validateAndRefreshSession(sessionId, user.id);
    }

    const authUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        emailVerified: user.emailVerified,
        mfaEnabled: user.mfaEnabled,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        role: derivePrimaryRole(user),
        sessionId,
        authType: 'jwt',
    };

    // ML-Powered Risk Assessment
    const riskAssessment = await getRiskScore({
        userId: authUser.id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        action: 'AUTHENTICATION_VERIFY',
        path: req.path
    });

    if (riskAssessment.is_anomaly) {
        authUser.isAnomalous = true;
        authUser.riskScore = riskAssessment.risk_score;
    }

    await enforceOrgPolicyForRequest(
        req,
        authUser
    );

    return { user: authUser };
}

function handleAuthError(res, error) {
    if (error.errorCode) {
        return res.status(error.statusCode).json({
            success: false,
            error: {
                code: error.errorCode,
                message: error.message,
            },
        });
    }

    return res.status(401).json({
        success: false,
        error: {
            code: 'AUTH_007',
            message: 'Token invalid',
        },
    });
}

async function authenticate(req, res, next) {
    try {
        const token = await extractToken(req);

        if (!token) {
            throw createError('AUTH_007');
        }

        const result = token.startsWith('iam_')
            ? await authenticateApiRequest(
                  req,
                  token
              )
            : await authenticateJwtRequest(
                  req,
                  token
              );

        if (result?.error) {
            return res.status(result.error.status).json({
                success: false,
                error: {
                    code: result.error.code,
                    message: result.error.message,
                },
            });
        }

        req.user = result.user;

        // If high risk anomaly detected, require step-up authentication for ANY subsequent action
        if (req.user.isAnomalous && !req.path.includes('/reauth')) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'AUTH_012',
                    message: 'Security anomaly detected. Re-authentication required.',
                    riskScore: req.user.riskScore
                }
            });
        }

        return next();
    } catch (error) {
        return handleAuthError(res, error);
    }
}
module.exports = { authenticate };

