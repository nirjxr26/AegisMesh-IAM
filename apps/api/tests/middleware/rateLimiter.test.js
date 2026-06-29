'use strict';

jest.mock('../../src/utils/logger', () => ({
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
}));

jest.mock('../../src/utils/auditLog', () => ({
    auditSecurity: {
        rateLimitExceeded: jest.fn().mockResolvedValue(),
    },
}));

jest.mock('express-rate-limit', () => {
    const fn = (opts) => {
        const mw = (req, res, next) => next();
        mw.options = opts;
        return mw;
    };
    return fn;
});

afterEach(() => {
    jest.clearAllMocks();
    delete process.env.NODE_ENV;

});

describe('rateLimiter config', () => {
    function loadLimiters() {
        jest.resetModules();
        return require('../../src/middleware/rateLimiter');
    }

    it('exports all four limiters', () => {
        const limiters = loadLimiters();
        expect(limiters).toHaveProperty('loginLimiter');
        expect(limiters).toHaveProperty('registerLimiter');
        expect(limiters).toHaveProperty('generalLimiter');
        expect(limiters).toHaveProperty('passwordResetLimiter');
    });

    it('loginLimiter has correct production config', () => {
        process.env.NODE_ENV = 'production';
        const limiters = loadLimiters();
        const opts = limiters.loginLimiter.options;
        expect(opts.windowMs).toBe(15 * 60 * 1000);
        expect(opts.max).toBe(50);
        expect(opts.standardHeaders).toBe(true);
        expect(opts.legacyHeaders).toBe(false);
        expect(opts.message.error.code).toBe('RATE_LIMIT');
    });

    it('loginLimiter has higher limit in non-production', () => {
        process.env.NODE_ENV = 'development';
        const limiters = loadLimiters();
        expect(limiters.loginLimiter.options.max).toBe(1000);
    });

    it('registerLimiter has correct config', () => {
        process.env.NODE_ENV = 'production';
        const limiters = loadLimiters();
        const opts = limiters.registerLimiter.options;
        expect(opts.windowMs).toBe(60 * 60 * 1000);
        expect(opts.max).toBe(20);
        expect(opts.message.error.code).toBe('RATE_LIMIT');
        expect(opts.message.error.message).toContain('registration');
    });

    it('generalLimiter has correct config', () => {
        process.env.NODE_ENV = 'production';
        const limiters = loadLimiters();
        const opts = limiters.generalLimiter.options;
        expect(opts.windowMs).toBe(15 * 60 * 1000);
        expect(opts.max).toBe(1000);
        expect(opts.message.error.message).toContain('Too many requests');
    });

    it('passwordResetLimiter has strict limits', () => {
        process.env.NODE_ENV = 'production';
        const limiters = loadLimiters();
        const opts = limiters.passwordResetLimiter.options;
        expect(opts.windowMs).toBe(60 * 60 * 1000);
        expect(opts.max).toBe(3);
        expect(opts.message.error.message).toContain('password reset');
    });
});

describe('rateLimiter handlers', () => {
    let limiters;

    beforeAll(() => {
        process.env.NODE_ENV = 'production';
        limiters = require('../../src/middleware/rateLimiter');
    });

    it('handler calls logger.warn and auditSecurity on login limit', () => {
        const logger = require('../../src/utils/logger');
        const { auditSecurity } = require('../../src/utils/auditLog');
        const mockReq = { ip: '192.168.1.1' };
        const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        limiters.loginLimiter.options.handler(mockReq, mockRes, jest.fn(), limiters.loginLimiter.options);

        expect(logger.warn).toHaveBeenCalledWith('Rate limit exceeded for login', { ip: '192.168.1.1' });
        expect(auditSecurity.rateLimitExceeded).toHaveBeenCalledWith(mockReq, 'auth/login');
        expect(mockRes.status).toHaveBeenCalledWith(429);
        expect(mockRes.json).toHaveBeenCalledWith(limiters.loginLimiter.options.message);
    });

    it('handler calls logger.warn on register limit', () => {
        const logger = require('../../src/utils/logger');
        const mockReq = { ip: '10.0.0.1' };
        const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        limiters.registerLimiter.options.handler(mockReq, mockRes, jest.fn(), limiters.registerLimiter.options);

        expect(logger.warn).toHaveBeenCalledWith('Rate limit exceeded for register', { ip: '10.0.0.1' });
    });

    it('handler calls logger.warn on password reset limit', () => {
        const logger = require('../../src/utils/logger');
        const mockReq = { ip: '10.0.0.2' };
        const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        limiters.passwordResetLimiter.options.handler(mockReq, mockRes, jest.fn(), limiters.passwordResetLimiter.options);

        expect(logger.warn).toHaveBeenCalledWith('Rate limit exceeded for password reset', { ip: '10.0.0.2' });
    });

    it('handler includes path for generalLimiter', () => {
        const logger = require('../../src/utils/logger');
        const mockReq = { ip: '10.0.0.3', path: '/api/users' };
        const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };

        limiters.generalLimiter.options.handler(mockReq, mockRes, jest.fn(), limiters.generalLimiter.options);

        expect(logger.warn).toHaveBeenCalledWith('Rate limit exceeded', { ip: '10.0.0.3', path: '/api/users' });
    });
});
