const authService = require('../services/auth.service');
const tokenService = require('../services/token.service');
const prisma = require('../config/database');
const logger = require('../utils/logger');
const { encryptText, decryptText } = require('../utils/crypto');

function getCookieOptions(req) {
    const isProd = process.env.NODE_ENV === 'production';
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https' || isProd;

    return {
        accessToken: {
            httpOnly: true,
            secure: isSecure,
            sameSite: isSecure ? 'strict' : 'lax',
            maxAge: 15 * 60 * 1000,
        },
        refreshToken: {
            httpOnly: true,
            secure: isSecure,
            sameSite: isSecure ? 'strict' : 'lax',
            path: '/api/auth/refresh-token',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        },
    };
}

/**
 * POST /api/auth/register
 */
async function register(req, res, next) {
    try {
        const { email, password, firstName, lastName } = req.body;
        const result = await authService.register({ email, password, firstName, lastName, req });
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
    try {
        const { email, password, totpCode } = req.body;
        const result = await authService.login({ email, password, totpCode, req });
        const cookieOptions = getCookieOptions(req);

        res.cookie('accessToken', encryptText(result.accessToken), cookieOptions.accessToken);
        res.cookie('refreshToken', encryptText(result.refreshToken), cookieOptions.refreshToken);

        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/auth/logout
 */
async function logout(req, res, next) {
    try {
        const rawRefreshToken = req.body.refreshToken || req.cookies?.refreshToken;
        const refreshToken = rawRefreshToken ? (decryptText(rawRefreshToken) || rawRefreshToken) : null;
        const result = await authService.logout({
            refreshToken,
            userId: req.user.id,
            req,
        });

        res.clearCookie('accessToken');
        res.clearCookie('refreshToken', { path: '/api/auth/refresh-token' });

        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/auth/refresh-token
 */
async function refreshToken(req, res, next) {
    try {
        const rawToken = req.body.refreshToken || req.cookies?.refreshToken;
        const token = rawToken ? (decryptText(rawToken) || rawToken) : null;
        if (!token) {
            return res.status(400).json({
                success: false,
                error: { code: 'AUTH_007', message: 'Refresh token required' },
            });
        }

        const result = await authService.refreshAccessToken({ refreshToken: token, req });
        const cookieOptions = getCookieOptions(req);

        res.cookie('accessToken', encryptText(result.accessToken), cookieOptions.accessToken);
        res.cookie('refreshToken', encryptText(result.refreshToken), cookieOptions.refreshToken);

        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/auth/forgot-password
 */
async function forgotPassword(req, res, next) {
    try {
        const { email } = req.body;
        const result = await authService.forgotPassword({ email, req });
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/auth/reset-password
 */
async function resetPassword(req, res, next) {
    try {
        const { token, newPassword } = req.body;
        const result = await authService.resetPassword({ token, newPassword, req });
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/auth/verify-email
 */
async function verifyEmail(req, res, next) {
    try {
        const { token } = req.body;
        const result = await authService.verifyEmail({ token, req });
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/auth/me
 */
async function getProfile(req, res, next) {
    try {
        const user = await authService.getProfile(req.user.id);
        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/auth/sessions
 */
async function getSessions(req, res, next) {
    try {
        const sessions = await tokenService.getUserSessions(req.user.id);
        res.json({ success: true, data: sessions });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /api/auth/sessions/:sessionId
 */
async function revokeSession(req, res, next) {
    try {
        const session = await prisma.session.findUnique({
            where: { id: req.params.sessionId },
        });

        if (!session || session.userId !== req.user.id) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Session not found' },
            });
        }

        await tokenService.revokeSession(req.params.sessionId, {
            actorUserId: req.user.id,
            req,
        });

        res.json({ success: true, data: { message: 'Session revoked' } });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    register,
    login,
    logout,
    refreshToken,
    forgotPassword,
    resetPassword,
    verifyEmail,
    getProfile,
    getSessions,
    revokeSession,
};
