const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const { auditSecurity } = require('../utils/auditLog');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 50 : 1000,
    message: {
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Too many login attempts. Please try again in 15 minutes.' },
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn('Rate limit exceeded for login', { ip: req.ip });
        auditSecurity.rateLimitExceeded(req, 'auth/login').catch(() => { });
        res.status(429).json(options.message);
    },
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 20 : 1000,
    message: {
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Too many registration attempts. Please try again later.' },
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn('Rate limit exceeded for register', { ip: req.ip });
        auditSecurity.rateLimitExceeded(req, 'auth/register').catch(() => { });
        res.status(429).json(options.message);
    },
});

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 1000 : 5000,
    message: {
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Too many requests. Please try again later.' },
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
        auditSecurity.rateLimitExceeded(req, req.path).catch(() => { });
        res.status(429).json(options.message);
    },
});

const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 3 : 1000,
    message: {
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Too many password reset attempts. Please try again later.' },
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn('Rate limit exceeded for password reset', { ip: req.ip });
        auditSecurity.rateLimitExceeded(req, 'auth/forgot-password').catch(() => { });
        res.status(429).json(options.message);
    },
});

const mfaSetupLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 10 : 1000,
    message: {
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Too many MFA attempts. Please try again later.' },
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn('Rate limit exceeded for MFA operations', { ip: req.ip });
        auditSecurity.rateLimitExceeded(req, 'auth/mfa').catch(() => { });
        res.status(429).json(options.message);
    },
});

const tokenRefreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 30 : 1000,
    message: {
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Too many token refresh attempts. Please try again later.' },
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn('Rate limit exceeded for token refresh', { ip: req.ip });
        auditSecurity.rateLimitExceeded(req, 'auth/refresh-token').catch(() => { });
        res.status(429).json(options.message);
    },
});

const sessionRevokeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 20 : 1000,
    message: {
        success: false,
        error: { code: 'RATE_LIMIT', message: 'Too many session revocation attempts. Please try again later.' },
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn('Rate limit exceeded for session revocation', { ip: req.ip });
        auditSecurity.rateLimitExceeded(req, 'auth/sessions').catch(() => { });
        res.status(429).json(options.message);
    },
});

module.exports = { loginLimiter, registerLimiter, generalLimiter, passwordResetLimiter, mfaSetupLimiter, tokenRefreshLimiter, sessionRevokeLimiter };
