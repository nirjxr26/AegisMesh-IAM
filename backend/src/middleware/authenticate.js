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

    // 2. Check query parameter (often used for SSE/EventSource)
    // However, do NOT use query param tokens for the live audit feed (/stream)
    // to prevent logging/exposing sensitive tokens in URL logs unless explicitly required.
    if (req.query?.token && !req.path.startsWith('/stream')) {
        return req.query.token;
    }

    // 3. Check cookies
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

    let user = null;
    let profileVersion = '1';

    if (redis.status === 'ready') {
        try {
            profileVersion = (await redis.get('user:profile:version')) || '1';
        } catch (err) {
            logger.error('Redis error getting user profile version', { error: err.message });
        }
    }

    const cacheKey = `user:profile:${payload.sub}:${profileVersion}`;

    // 1. Attempt to fetch user from Redis cache
    if (redis.status === 'ready') {
        try {
            const cachedUser = await redis.get(cacheKey);
            if (cachedUser) {
                user = JSON.parse(cachedUser);
                user.createdAt = new Date(user.createdAt);
                user.updatedAt = new Date(user.updatedAt);
            }
        } catch (err) {
            logger.error('Redis error fetching user profile cache', { error: err.message });
        }
    }

    // 2. Fetch from DB on cache miss
    if (!user) {
        user = await prisma.user.findUnique({
            where: { id: payload.sub },
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

        // Cache the retrieved user profile for 5 minutes (300 seconds)
        if (redis.status === 'ready') {
            try {
                await redis.setex(cacheKey, 300, JSON.stringify(user));
            } catch (err) {
                logger.error('Redis error writing user profile cache', { error: err.message });
            }
        }
    }

    if (user.status !== 'ACTIVE') {
        throw createError('AUTH_008');
    }

    const sessionId =
        payload.sessionId || null;

    if (sessionId) {
        const sessionCacheKey = `session:valid:${sessionId}`;
        let isSessionValid = false;

        // Check if session validity is cached in Redis
        if (redis.status === 'ready') {
            try {
                const cachedSession = await redis.get(sessionCacheKey);
                if (cachedSession === '1') {
                    isSessionValid = true;
                }
            } catch (err) {
                logger.error('Redis error checking session cache', { error: err.message });
            }
        }

        if (!isSessionValid) {
            const sessionUpdate = await prisma.session.updateMany({
                where: {
                    id: sessionId,
                    userId: user.id,
                },
                data: {
                    lastActiveAt: new Date(),
                },
            });

            // If the session no longer exists (revoked), the access token is also invalid
            if (sessionUpdate.count === 0) {
                throw createError('AUTH_006', { message: 'Session has been revoked' });
            }

            // Cache session validity for 60 seconds
            if (redis.status === 'ready') {
                try {
                    await redis.setex(sessionCacheKey, 60, '1');
                } catch (err) {
                    logger.error('Redis error setting session cache', { error: err.message });
                }
            }
        }
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
        // In a real scenario, we might force re-auth here or set a flag for downstream middleware
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

