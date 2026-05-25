'use strict';

const { errorHandler, notFoundHandler } = require('../../src/middleware/errorHandler');
const { LOOPBACK_IP } = require('../../src/config/constants');
const { AppError } = require('../../src/utils/errors');

// Silence logger during tests
jest.mock('../../src/utils/logger', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
}));

function mockReq(overrides = {}) {
    return { method: 'GET', path: '/test', ip: LOOPBACK_IP, ...overrides };
}

function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe('errorHandler', () => {
    const next = jest.fn();

    afterEach(() => jest.clearAllMocks());

    it('returns the status and body from an operational AppError', () => {
        const err = new AppError('Not found', 404, 'NOT_FOUND', { id: '1' });
        const req = mockReq();
        const res = mockRes();

        errorHandler(err, req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'Not found',
                details: { id: '1' },
            },
        });
    });

    it('omits details key when AppError has no details', () => {
        const err = new AppError('Forbidden', 403, 'RBAC_001');
        const res = mockRes();

        errorHandler(err, mockReq(), res, next);

        const body = res.json.mock.calls[0][0];
        expect(body.error.details).toBeUndefined();
    });

    it('handles Prisma P2002 (unique constraint) with 409', () => {
        const err = Object.assign(new Error('Unique'), { code: 'P2002', meta: { target: ['email'] } });
        const res = mockRes();

        errorHandler(err, mockReq(), res, next);

        expect(res.status).toHaveBeenCalledWith(409);
        const body = res.json.mock.calls[0][0];
        expect(body.error.code).toBe('CONFLICT');
        expect(body.error.details).toEqual({ target: ['email'] });
    });

    it('handles Prisma P2025 (record not found) with 404', () => {
        const err = Object.assign(new Error('Not found'), { code: 'P2025' });
        const res = mockRes();

        errorHandler(err, mockReq(), res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        const body = res.json.mock.calls[0][0];
        expect(body.error.code).toBe('NOT_FOUND');
    });

    it('handles JsonWebTokenError with 401', () => {
        const err = Object.assign(new Error('jwt malformed'), { name: 'JsonWebTokenError' });
        const res = mockRes();

        errorHandler(err, mockReq(), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json.mock.calls[0][0].error.code).toBe('AUTH_007');
    });

    it('handles TokenExpiredError with 401', () => {
        const err = Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' });
        const res = mockRes();

        errorHandler(err, mockReq(), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json.mock.calls[0][0].error.code).toBe('AUTH_006');
    });

    it('falls back to 500 for unexpected errors in development', () => {
        const original = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const err = new Error('Boom');
        const res = mockRes();

        errorHandler(err, mockReq(), res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        const body = res.json.mock.calls[0][0];
        expect(body.error.code).toBe('INTERNAL_ERROR');
        expect(body.error.message).toBe('Boom');

        process.env.NODE_ENV = original;
    });

    it('hides message in production for unexpected errors', () => {
        const original = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const err = new Error('Secret internal detail');
        const res = mockRes();

        errorHandler(err, mockReq(), res, next);

        const body = res.json.mock.calls[0][0];
        expect(body.error.message).toBe('An unexpected error occurred');
        expect(body.error.message).not.toContain('Secret');

        process.env.NODE_ENV = original;
    });

    it('uses err.statusCode when it is set for non-operational errors', () => {
        const err = Object.assign(new Error('Custom'), { statusCode: 422 });
        const res = mockRes();

        errorHandler(err, mockReq(), res, next);

        expect(res.status).toHaveBeenCalledWith(422);
    });
});

describe('notFoundHandler', () => {
    it('returns 404 with route info', () => {
        const req = mockReq({ method: 'POST', path: '/unknown' });
        const res = mockRes();

        notFoundHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        const body = res.json.mock.calls[0][0];
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('NOT_FOUND');
        expect(body.error.message).toContain('POST');
        expect(body.error.message).toContain('/unknown');
    });
});
