'use strict';

jest.mock('../../src/utils/logger', () => ({
    debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

jest.mock('../../src/config/database', () => ({
    user: { findUnique: jest.fn() },
    session: { updateMany: jest.fn() },
}));

jest.mock('../../src/services/token.service', () => ({
    verifyAccessToken: jest.fn(),
}));

jest.mock('../../src/middleware/apiKeyAuth', () => ({
    authenticateApiKeyToken: jest.fn(),
}));

jest.mock('../../src/middleware/orgPolicy', () => ({
    enforceOrgPolicyForRequest: jest.fn().mockResolvedValue({}),
}));

const prisma = require('../../src/config/database');
const tokenService = require('../../src/services/token.service');
const { authenticateApiKeyToken } = require('../../src/middleware/apiKeyAuth');
const { authenticate } = require('../../src/middleware/authenticate');
const { LOOPBACK_IP } = require('../../src/config/constants');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

function mockReq(overrides = {}) {
    return {
        headers: {},
        cookies: {},
        path: '/api/something',
        query: {},
        ip: LOOPBACK_IP,
        socket: {},
        ...overrides,
    };
}

const ACTIVE_USER = {
    id: 'user-1',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Smith',
    status: 'ACTIVE',
    emailVerified: true,
    mfaEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    userRoles: [{ role: { name: 'Admin' } }],
};

afterEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('authenticate middleware', () => {
    it('returns 401 when no token is provided', async () => {
        const res = mockRes();
        await authenticate(mockReq(), res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('reads the Bearer token from the Authorization header', async () => {
        tokenService.verifyAccessToken.mockReturnValue({ sub: 'user-1', sessionId: null });
        prisma.user.findUnique.mockResolvedValue(ACTIVE_USER);

        const req = mockReq({ headers: { authorization: 'Bearer valid-token' } });
        const next = jest.fn();
        const res = mockRes();

        await authenticate(req, res, next);

        expect(tokenService.verifyAccessToken).toHaveBeenCalledWith('valid-token');
        expect(next).toHaveBeenCalled();
    });

    it('falls back to cookie when no Authorization header is present', async () => {
        tokenService.verifyAccessToken.mockReturnValue({ sub: 'user-1', sessionId: null });
        prisma.user.findUnique.mockResolvedValue(ACTIVE_USER);

        const req = mockReq({ cookies: { accessToken: 'cookie-token' } });
        const next = jest.fn();

        await authenticate(req, mockRes(), next);

        expect(tokenService.verifyAccessToken).toHaveBeenCalledWith('cookie-token');
        expect(next).toHaveBeenCalled();
    });

    it('returns 401 when the token fails verification', async () => {
        tokenService.verifyAccessToken.mockReturnValue(null);

        const req = mockReq({ headers: { authorization: 'Bearer bad-token' } });
        const res = mockRes();

        await authenticate(req, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 401 when the user is not found in the database', async () => {
        tokenService.verifyAccessToken.mockReturnValue({ sub: 'ghost', sessionId: null });
        prisma.user.findUnique.mockResolvedValue(null);

        const req = mockReq({ headers: { authorization: 'Bearer ok-token' } });
        const res = mockRes();

        await authenticate(req, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 403 when the user status is INACTIVE', async () => {
        tokenService.verifyAccessToken.mockReturnValue({ sub: 'user-1', sessionId: null });
        prisma.user.findUnique.mockResolvedValue({ ...ACTIVE_USER, status: 'INACTIVE' });

        const req = mockReq({ headers: { authorization: 'Bearer ok-token' } });
        const res = mockRes();

        await authenticate(req, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(403);
    });

    it('sets req.user with the correct shape after successful auth', async () => {
        tokenService.verifyAccessToken.mockReturnValue({ sub: 'user-1', sessionId: 'sess-1' });
        prisma.user.findUnique.mockResolvedValue(ACTIVE_USER);
        prisma.session.updateMany.mockResolvedValue({});

        const req = mockReq({ headers: { authorization: 'Bearer valid-token' } });
        const next = jest.fn();

        await authenticate(req, mockRes(), next);

        expect(req.user).toMatchObject({
            id: 'user-1',
            email: 'alice@example.com',
            status: 'ACTIVE',
            role: 'Admin',
            sessionId: 'sess-1',
            authType: 'jwt',
        });
    });

    it('promotes SuperAdmin role when user has it', async () => {
        const superAdminUser = {
            ...ACTIVE_USER,
            userRoles: [{ role: { name: 'Admin' } }, { role: { name: 'SuperAdmin' } }],
        };
        tokenService.verifyAccessToken.mockReturnValue({ sub: 'user-1', sessionId: null });
        prisma.user.findUnique.mockResolvedValue(superAdminUser);

        const req = mockReq({ headers: { authorization: 'Bearer valid-token' } });
        const next = jest.fn();

        await authenticate(req, mockRes(), next);

        expect(req.user.role).toBe('SuperAdmin');
    });

    it('handles API key tokens (iam_ prefix)', async () => {
        const apiUser = { ...ACTIVE_USER, authType: 'apiKey' };
        authenticateApiKeyToken.mockResolvedValue(apiUser);

        const IAM_PREFIX = 'iam_';
        const IAM_KEY = 'mykey12345';
        const req = mockReq({ headers: { authorization: 'Bearer ' + IAM_PREFIX + IAM_KEY } });
        const next = jest.fn();

        await authenticate(req, mockRes(), next);

        expect(authenticateApiKeyToken).toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
        expect(req.user.authType).toBe('apiKey');
    });

    it('returns 403 when an API key has a scope error', async () => {
        authenticateApiKeyToken.mockResolvedValue({ scopeError: true });

        const IAM_PREFIX = 'iam_';
        const IAM_KEY = 'mykey12345';
        const req = mockReq({ headers: { authorization: 'Bearer ' + IAM_PREFIX + IAM_KEY } });
        const res = mockRes();

        await authenticate(req, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(403);
        const body = res.json.mock.calls[0][0];
        expect(body.error.code).toBe('RBAC_001');
    });

    it('returns 401 when API key is not found', async () => {
        authenticateApiKeyToken.mockResolvedValue(null);

        const IAM_PREFIX = 'iam_';
        const IAM_KEY = 'mykey12345';
        const req = mockReq({ headers: { authorization: 'Bearer ' + IAM_PREFIX + IAM_KEY } });
        const res = mockRes();

        await authenticate(req, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('allows token via query string on /stream path', async () => {
        tokenService.verifyAccessToken.mockReturnValue({ sub: 'user-1', sessionId: null });
        prisma.user.findUnique.mockResolvedValue(ACTIVE_USER);

        const req = mockReq({ path: '/stream', query: { token: 'stream-token' } });
        const next = jest.fn();

        await authenticate(req, mockRes(), next);

        expect(tokenService.verifyAccessToken).toHaveBeenCalledWith('stream-token');
        expect(next).toHaveBeenCalled();
    });
});
