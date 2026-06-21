const express = require('express');
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const mfaController = require('../controllers/mfa.controller');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const { loginLimiter, registerLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const schemas = require('../config/validationSchemas');
const tokenService = require('../services/token.service');
const { auditAuth } = require('../utils/auditLog');
const { getOrganizationSettings } = require('../services/organizationSettings.service');
const { encryptText } = require('../utils/crypto');
const logger = require('../utils/logger');

const router = express.Router();

function isSecureRequest(req) {
    if (process.env.COOKIE_SECURE === 'true') {
        return true;
    }

    if (process.env.COOKIE_SECURE === 'false') {
        return false;
    }

    return req.secure || req.headers['x-forwarded-proto'] === 'https';
}

function getCookieOptions(req) {
    const secure = isSecureRequest(req);

    return {
        access: {
            httpOnly: true,
            secure,
            sameSite: secure ? 'none' : 'lax',
            maxAge: 15 * 60 * 1000,
        },
        refresh: {
            httpOnly: true,
            secure,
            sameSite: secure ? 'none' : 'lax',
            path: '/api/auth/refresh-token',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        },
    };
}

function setAuthCookies(req, res, accessToken, refreshToken) {
    const options = getCookieOptions(req);

    res.cookie('accessToken', encryptText(accessToken), {
        ...options.access,
    });

    res.cookie('refreshToken', encryptText(refreshToken), {
        ...options.refresh,
    });
}

function handleOAuthCallback(providerName, auditProviderName) {
    return async (req, res) => {
        try {
            const user = req.user;
            const refreshToken = tokenService.generateRefreshToken(user);

            const session = await tokenService.createSession(
                user.id,
                refreshToken,
                req.headers['user-agent'],
                req.ip
            );

            const accessToken = tokenService.generateAccessToken(user, session.id);
            await auditAuth.oauthLogin(req, user.id, auditProviderName, session.id);

            setAuthCookies(req, res, accessToken, refreshToken);
            return res.redirect(`${getFrontendUrl()}/oauth/callback`);
        } catch (error) {
            logger.warn(`${providerName} OAuth callback failed`, { message: error.message });
            return res.redirect(getOAuthFailureUrl());
        }
    };
}

function getFrontendUrl() {
    return process.env.FRONTEND_URL || 'http://localhost:3000';
}

function getOAuthFailureUrl() {
    return `${getFrontendUrl()}/login?error=oauth_failed`;
}

async function enforceOAuthAllowed(req, res, next) {
    try {
        const settings = await getOrganizationSettings();
        if (!settings.allowOAuthLogin) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'OAUTH_DISABLED',
                    message: 'OAuth login is disabled by organization policy',
                },
            });
        }
        return next();
    } catch (error) {
        return next(error);
    }
}

// ═══════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════

// Register
router.post(
    '/register',
    registerLimiter,
    validate(schemas.register),
    authController.register
);

// Login
router.post(
    '/login',
    loginLimiter,
    validate(schemas.login),
    authController.login
);

// Logout (protected)
router.post(
    '/logout',
    authenticate,
    authController.logout
);

// Refresh token
router.post(
    '/refresh-token',
    validate(schemas.refreshToken),
    authController.refreshToken
);

// Forgot password
router.post(
    '/forgot-password',
    passwordResetLimiter,
    validate(schemas.forgotPassword),
    authController.forgotPassword
);

// Reset password
router.post(
    '/reset-password',
    validate(schemas.resetPassword),
    authController.resetPassword
);

// Verify email
router.post(
    '/verify-email',
    validate(schemas.verifyEmail),
    authController.verifyEmail
);

// Get current user profile (protected)
router.get(
    '/me',
    authenticate,
    authController.getProfile
);

// Get sessions (protected)
router.get(
    '/sessions',
    authenticate,
    authController.getSessions
);

// Revoke session (protected)
router.delete(
    '/sessions/:sessionId',
    authenticate,
    authController.revokeSession
);

// ═══════════════════════════════════════
// MFA ROUTES
// ═══════════════════════════════════════

// Setup MFA (protected)
router.post(
    '/mfa/setup',
    authenticate,
    mfaController.setupMFA
);

// Verify MFA setup (protected)
router.post(
    '/mfa/verify-setup',
    authenticate,
    validate(schemas.mfaVerifySetup),
    mfaController.verifySetup
);

// Disable MFA (protected)
router.post(
    '/mfa/disable',
    authenticate,
    validate(schemas.mfaDisable),
    mfaController.disableMFA
);

// ═══════════════════════════════════════
// OAUTH ROUTES
// ═══════════════════════════════════════

// Google OAuth
router.get(
    '/oauth/google',
    enforceOAuthAllowed,
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
    '/oauth/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: getOAuthFailureUrl(),
    }),
    handleOAuthCallback('Google', 'google')
);

// GitHub OAuth
router.get(
    '/oauth/github',
    enforceOAuthAllowed,
    passport.authenticate('github', { scope: ['user:email'] })
);

router.get(
    '/oauth/github/callback',
    passport.authenticate('github', {
        session: false,
        failureRedirect: getOAuthFailureUrl(),
    }),
    handleOAuthCallback('GitHub', 'github')
);

module.exports = router;
