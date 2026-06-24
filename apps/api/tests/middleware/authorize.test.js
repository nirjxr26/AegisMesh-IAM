'use strict';

jest.mock('../../src/utils/logger', () => ({
    debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

jest.mock('../../src/services/permission.service', () => ({
    checkPermission: jest.fn(),
}));

jest.mock('../../src/utils/auditLog', () => ({
    auditPermission: {
        checked: jest.fn().mockResolvedValue(undefined),
        denied: jest.fn().mockResolvedValue(undefined),
    },
}));

const permissionService = require('../../src/services/permission.service');
const authorize = require('../../src/middleware/authorize');
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

function mockReq(userId = 'user-1') {
    return { user: { id: userId }, method: 'GET', path: '/test', ip: LOOPBACK_IP };
}

afterEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('authorize middleware', () => {
    it('calls next() when permission is allowed', async () => {
        permissionService.checkPermission.mockResolvedValue({ allowed: true, reason: 'Allowed by policy' });

        const req = mockReq();
        const next = jest.fn();

        await authorize('read', 'users')(req, mockRes(), next);

        expect(permissionService.checkPermission).toHaveBeenCalledWith('user-1', 'read', 'users');
        expect(next).toHaveBeenCalledWith(/* no args */);
    });

    it('returns 403 when permission is denied', async () => {
        permissionService.checkPermission.mockResolvedValue({ allowed: false, reason: 'No matching policy' });

        const req = mockReq();
        const res = mockRes();

        await authorize('delete', 'users')(req, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(403);
        const body = res.json.mock.calls[0][0];
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('RBAC_001');
        expect(body.error.required).toEqual({ action: 'delete', resource: 'users' });
    });

    it('calls next(error) when req.user is missing', async () => {
        const req = { user: null, method: 'GET', path: '/test', ip: LOOPBACK_IP };
        const next = jest.fn();

        await authorize('read', 'users')(req, mockRes(), next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 'AUTH_001' }));
    });

    it('calls next(error) when req.user has no id', async () => {
        const req = { user: {}, method: 'GET', path: '/test', ip: LOOPBACK_IP };
        const next = jest.fn();

        await authorize('read', 'users')(req, mockRes(), next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 'AUTH_001' }));
    });

    it('calls next(error) when permissionService throws', async () => {
        permissionService.checkPermission.mockRejectedValue(new Error('DB error'));

        const next = jest.fn();
        await authorize('read', 'users')(mockReq(), mockRes(), next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});
