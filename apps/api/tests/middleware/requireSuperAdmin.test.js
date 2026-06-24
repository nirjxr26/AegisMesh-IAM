'use strict';

jest.mock('../../src/config/database', () => ({
    userRole: { count: jest.fn() },
}));

const prisma = require('../../src/config/database');
const requireSuperAdmin = require('../../src/middleware/requireSuperAdmin');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

afterEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('requireSuperAdmin middleware', () => {
    it('returns 401 when req.user is absent', async () => {
        const req = { user: null };
        const res = mockRes();

        await requireSuperAdmin(req, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(401);
        const body = res.json.mock.calls[0][0];
        expect(body.error.code).toBe('AUTH_007');
    });

    it('calls next() immediately when req.user.role is already SuperAdmin', async () => {
        const req = { user: { id: 'u1', role: 'SuperAdmin' } };
        const next = jest.fn();

        await requireSuperAdmin(req, mockRes(), next);

        expect(next).toHaveBeenCalled();
        expect(prisma.userRole.count).not.toHaveBeenCalled();
    });

    it('calls next() and sets role to SuperAdmin when DB confirms the role', async () => {
        prisma.userRole.count.mockResolvedValue(1);

        const req = { user: { id: 'u1', role: 'Admin' } };
        const next = jest.fn();

        await requireSuperAdmin(req, mockRes(), next);

        expect(prisma.userRole.count).toHaveBeenCalledWith({
            where: { userId: 'u1', role: { name: 'SuperAdmin' } },
        });
        expect(req.user.role).toBe('SuperAdmin');
        expect(next).toHaveBeenCalled();
    });

    it('returns 403 when the DB reports no SuperAdmin role', async () => {
        prisma.userRole.count.mockResolvedValue(0);

        const req = { user: { id: 'u1', role: 'Viewer' } };
        const res = mockRes();

        await requireSuperAdmin(req, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(403);
        const body = res.json.mock.calls[0][0];
        expect(body.error.code).toBe('RBAC_001');
    });

    it('calls next(error) when a database error is thrown', async () => {
        prisma.userRole.count.mockRejectedValue(new Error('DB down'));

        const req = { user: { id: 'u1', role: 'Admin' } };
        const next = jest.fn();

        await requireSuperAdmin(req, mockRes(), next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});
