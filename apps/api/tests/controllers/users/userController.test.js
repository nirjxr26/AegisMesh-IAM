'use strict';

jest.mock('../../../src/config/database', () => ({
    user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    role: {
        count: jest.fn(),
    },
    session: {
        deleteMany: jest.fn(),
    },
    oAuthAccount: {
        deleteMany: jest.fn(),
    },
    userRole: {
        deleteMany: jest.fn(),
    },
    userGroup: {
        deleteMany: jest.fn(),
    },
    auditLog: {
        deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
}));

jest.mock('../../../src/utils/auditLog', () => ({
    audit: { created: jest.fn(), deleted: jest.fn() },
    auditUser: {
        created: jest.fn(),
        statusChanged: jest.fn(),
        emailVerified: jest.fn(),
        deleted: jest.fn(),
    },
}));

jest.mock('../../../src/utils/logger', () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
}));

const userController = require('../../../src/controllers/users');
const prisma = require('../../../src/config/database');

const BASE_DATE = new Date('2024-06-01T00:00:00Z');

const MOCK_USER = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    passwordHash: '$2a$12$hashed',
    mfaSecret: null,
    mfaBackupCodes: null,
    passwordResetToken: null,
    emailVerifyToken: null,
    status: 'ACTIVE',
    mfaEnabled: false,
    emailVerified: true,
    failedLoginCount: 0,
    lockedUntil: null,
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    userRoles: [{ role: { id: 'role-1', name: 'User' } }],
    userGroups: [],
    oauthAccounts: [],
    sessions: [],
    _count: { sessions: 0 },
};

function mockReq(overrides = {}) {
    return {
        query: {},
        params: {},
        body: {},
        user: { id: 'admin-1' },
        ip: '127.0.0.1',
        headers: { 'user-agent': 'Jest' },
        ...overrides,
    };
}

function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

const next = jest.fn();

describe('getUsers', () => {
    afterEach(() => jest.clearAllMocks());

    it('returns paginated users list with summary', async () => {
        const users = [
            {
                ...MOCK_USER,
                userRoles: [{ role: { id: 'role-1', name: 'User' } }],
                oauthAccounts: [{ provider: 'google' }],
                sessions: [{ createdAt: new Date('2024-06-15') }],
                _count: { sessions: 2 },
            },
        ];
        prisma.user.findMany.mockResolvedValue(users);
        prisma.user.count.mockResolvedValue(1);

        const req = mockReq({ query: { page: '1', limit: '20' } });
        const res = mockRes();

        await userController.getUsers(req, res, next);

        expect(res.json).toHaveBeenCalled();
        const body = res.json.mock.calls[0][0];
        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(1);
        expect(body.data[0].passwordHash).toBeUndefined();
        expect(body.data[0].roles).toEqual([{ id: 'role-1', name: 'User' }]);
        expect(body.data[0].oauthProviders).toEqual(['google']);
        expect(body.data[0].lastLoginAt).toBeTruthy();
        expect(body.pagination.page).toBe(1);
        expect(body.pagination.totalPages).toBe(1);
        expect(body.summary.total).toBe(1);
    });

    it('applies search, status, mfaEnabled, and roleId filters', async () => {
        prisma.user.findMany.mockResolvedValue([]);
        prisma.user.count.mockResolvedValue(0);

        const req = mockReq({
            query: { search: 'john', status: 'ACTIVE', mfaEnabled: 'true', roleId: 'role-2', page: '1', limit: '10' },
        });
        const res = mockRes();

        await userController.getUsers(req, res, next);

        expect(prisma.user.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    OR: expect.any(Array),
                    status: 'ACTIVE',
                    mfaEnabled: true,
                    userRoles: { some: { roleId: 'role-2' } },
                }),
            })
        );
    });

    it('excludes mfaEnabled filter when empty string', async () => {
        prisma.user.findMany.mockResolvedValue([]);
        prisma.user.count.mockResolvedValue(0);

        const req = mockReq({ query: { mfaEnabled: '', page: '1', limit: '10' } });
        const res = mockRes();

        await userController.getUsers(req, res, next);

        const callArgs = prisma.user.findMany.mock.calls[0][0];
        expect(callArgs.where.mfaEnabled).toBeUndefined();
    });

    it('passes errors to next', async () => {
        const error = new Error('DB failure');
        prisma.user.findMany.mockRejectedValue(error);
        const res = mockRes();

        await userController.getUsers(mockReq(), res, next);

        expect(next).toHaveBeenCalledWith(error);
    });
});

describe('getUserById', () => {
    afterEach(() => jest.clearAllMocks());

    it('returns user by id with sanitized data', async () => {
        const user = {
            ...MOCK_USER,
            userRoles: [{ role: { id: 'role-1', name: 'Admin' } }],
            userGroups: [{ group: { id: 'group-1', name: 'Devs' } }],
            oauthAccounts: [{ provider: 'github' }],
            sessions: [{ createdAt: new Date('2024-06-10') }],
            _count: { sessions: 3 },
        };
        prisma.user.findUnique.mockResolvedValue(user);

        const req = mockReq({ params: { id: 'user-1' } });
        const res = mockRes();

        await userController.getUserById(req, res, next);

        const body = res.json.mock.calls[0][0];
        expect(body.success).toBe(true);
        expect(body.data.id).toBe('user-1');
        expect(body.data.passwordHash).toBeUndefined();
        expect(body.data.mfaSecret).toBeUndefined();
        expect(body.data.roles).toEqual([{ id: 'role-1', name: 'Admin' }]);
        expect(body.data.groups).toEqual([{ id: 'group-1', name: 'Devs' }]);
        expect(body.data.oauthProviders).toEqual(['github']);
        expect(body.data.sessionCount).toBe(3);
        expect(body.data.lastLoginAt).toBeTruthy();
    });

    it('returns 404 when user not found', async () => {
        prisma.user.findUnique.mockResolvedValue(null);

        const req = mockReq({ params: { id: 'missing' } });
        const res = mockRes();

        await userController.getUserById(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json.mock.calls[0][0].error.code).toBe('USER_001');
    });

    it('passes errors to next', async () => {
        prisma.user.findUnique.mockRejectedValue(new Error('DB error'));
        const res = mockRes();

        await userController.getUserById(mockReq({ params: { id: 'user-1' } }), res, next);

        expect(next).toHaveBeenCalled();
    });
});

describe('createUser', () => {
    afterEach(() => jest.clearAllMocks());

    it('creates a user with roles and returns 201', async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        prisma.$transaction.mockImplementation(async (cb) => {
            const tx = {
                user: {
                    create: jest.fn().mockResolvedValue(MOCK_USER),
                    findUnique: jest.fn(),
                },
                userRole: {
                    createMany: jest.fn().mockResolvedValue({ count: 2 }),
                },
            };
            return cb(tx);
        });

        const req = mockReq({
            body: { email: 'new@example.com', firstName: 'New', lastName: 'User', password: 'P@ss1234', roleIds: ['role-1', 'role-2'] },
        });
        const res = mockRes();

        await userController.createUser(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json.mock.calls[0][0].success).toBe(true);
        expect(res.json.mock.calls[0][0].data.passwordHash).toBeUndefined();
    });

    it('returns 409 when email already in use', async () => {
        prisma.user.findUnique.mockResolvedValue(MOCK_USER);

        const req = mockReq({
            body: { email: 'test@example.com', firstName: 'Test', password: 'P@ss1234' },
        });
        const res = mockRes();

        await userController.createUser(req, res, next);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json.mock.calls[0][0].error.code).toBe('USER_006');
    });

    it('passes errors to next', async () => {
        prisma.user.findUnique.mockRejectedValue(new Error('DB error'));
        const res = mockRes();

        await userController.createUser(mockReq({ body: { email: 'test@example.com' } }), res, next);

        expect(next).toHaveBeenCalled();
    });
});

describe('updateUser', () => {
    afterEach(() => jest.clearAllMocks());

    it('updates user fields and roles', async () => {
        prisma.user.findUnique.mockResolvedValue(MOCK_USER);
        prisma.role.count.mockResolvedValue(1);
        prisma.$transaction.mockImplementation(async (_cb) => {
            return { ...MOCK_USER, firstName: 'Updated', userRoles: MOCK_USER.userRoles };
        });

        const req = mockReq({
            params: { id: 'user-1' },
            body: { firstName: 'Updated', roleIds: ['role-1'] },
        });
        const res = mockRes();

        await userController.updateUser(req, res, next);

        expect(res.json.mock.calls[0][0].success).toBe(true);
        expect(res.json.mock.calls[0][0].data.passwordHash).toBeUndefined();
    });

    it('returns 404 when user not found', async () => {
        prisma.user.findUnique.mockResolvedValue(null);

        const req = mockReq({ params: { id: 'missing' }, body: { firstName: 'X' } });
        const res = mockRes();

        await userController.updateUser(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('prevents self-status change to non-ACTIVE', async () => {
        prisma.user.findUnique.mockResolvedValue(MOCK_USER);

        const req = mockReq({
            params: { id: 'admin-1' },
            body: { status: 'INACTIVE' },
            user: { id: 'admin-1' },
        });
        const res = mockRes();

        await userController.updateUser(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].error.code).toBe('USER_008');
    });

    it('passes errors to next', async () => {
        prisma.user.findUnique.mockRejectedValue(new Error('DB error'));
        const res = mockRes();

        await userController.updateUser(mockReq({ params: { id: 'user-1' } }), res, next);

        expect(next).toHaveBeenCalled();
    });
});

describe('updateUserStatus', () => {
    afterEach(() => jest.clearAllMocks());

    it('updates status to LOCKED', async () => {
        const user = { ...MOCK_USER, userRoles: [{ role: { name: 'User' } }] };
        prisma.user.findUnique.mockResolvedValue(user);
        prisma.user.update.mockResolvedValue({ ...user, status: 'LOCKED' });
        prisma.session.deleteMany.mockResolvedValue({ count: 2 });

        const req = mockReq({ params: { id: 'user-1' }, body: { status: 'LOCKED' } });
        const res = mockRes();

        await userController.updateUserStatus(req, res, next);

        expect(res.json.mock.calls[0][0].success).toBe(true);
        expect(res.json.mock.calls[0][0].data.passwordHash).toBeUndefined();
    });

    it('returns 400 for invalid status value', async () => {
        const req = mockReq({ params: { id: 'user-1' }, body: { status: 'BOGUS' } });
        const res = mockRes();

        await userController.updateUserStatus(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].error.code).toBe('USER_007');
    });

    it('prevents self-status change', async () => {
        const req = mockReq({ params: { id: 'admin-1' }, body: { status: 'INACTIVE' }, user: { id: 'admin-1' } });
        const res = mockRes();

        await userController.updateUserStatus(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].error.code).toBe('USER_008');
    });

    it('prevents locking the last SuperAdmin', async () => {
        const user = { ...MOCK_USER, userRoles: [{ role: { name: 'SuperAdmin' } }] };
        prisma.user.findUnique.mockResolvedValue(user);
        prisma.user.count.mockResolvedValue(1);

        const req = mockReq({ params: { id: 'user-1' }, body: { status: 'LOCKED' } });
        const res = mockRes();

        await userController.updateUserStatus(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].error.code).toBe('USER_003');
    });

    it('passes errors to next', async () => {
        prisma.user.findUnique.mockRejectedValue(new Error('DB error'));

        await userController.updateUserStatus(mockReq({ params: { id: 'user-1' }, body: { status: 'ACTIVE' } }), mockRes(), next);

        expect(next).toHaveBeenCalled();
    });
});

describe('verifyUserEmail', () => {
    afterEach(() => jest.clearAllMocks());

    it('verifies email and sets status to ACTIVE if INACTIVE', async () => {
        const inactiveUser = { ...MOCK_USER, emailVerified: false, status: 'INACTIVE' };
        prisma.user.findUnique.mockResolvedValue(inactiveUser);
        prisma.user.update.mockResolvedValue({ ...inactiveUser, emailVerified: true, status: 'ACTIVE' });

        const req = mockReq({ params: { id: 'user-1' } });
        const res = mockRes();

        await userController.verifyUserEmail(req, res, next);

        expect(res.json.mock.calls[0][0].success).toBe(true);
        expect(prisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ emailVerified: true, emailVerifyToken: null }),
            })
        );
    });

    it('returns 404 when user not found', async () => {
        prisma.user.findUnique.mockResolvedValue(null);

        const req = mockReq({ params: { id: 'missing' } });
        const res = mockRes();

        await userController.verifyUserEmail(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json.mock.calls[0][0].error.code).toBe('USER_001');
    });

    it('returns 400 when email already verified', async () => {
        prisma.user.findUnique.mockResolvedValue(MOCK_USER);

        const req = mockReq({ params: { id: 'user-1' } });
        const res = mockRes();

        await userController.verifyUserEmail(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].error.code).toBe('USER_005');
    });

    it('passes errors to next', async () => {
        prisma.user.findUnique.mockRejectedValue(new Error('DB error'));

        await userController.verifyUserEmail(mockReq({ params: { id: 'user-1' } }), mockRes(), next);

        expect(next).toHaveBeenCalled();
    });
});

describe('deleteUser', () => {
    afterEach(() => jest.clearAllMocks());

    it('deletes user and related records', async () => {
        const user = { ...MOCK_USER, userRoles: [{ role: { name: 'User' } }] };
        prisma.user.findUnique.mockResolvedValue(user);
        prisma.$transaction.mockResolvedValue(['ok', 'ok', 'ok', 'ok', 'ok', 'ok']);

        const req = mockReq({ params: { id: 'user-2' } });
        const res = mockRes();

        await userController.deleteUser(req, res, next);

        expect(res.json.mock.calls[0][0].success).toBe(true);
        expect(res.json.mock.calls[0][0].data.deletedId).toBe('user-2');
    });

    it('prevents self-deletion', async () => {
        const req = mockReq({ params: { id: 'admin-1' }, user: { id: 'admin-1' } });
        const res = mockRes();

        await userController.deleteUser(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].error.code).toBe('USER_002');
    });

    it('returns 404 when user not found', async () => {
        prisma.user.findUnique.mockResolvedValue(null);

        const req = mockReq({ params: { id: 'missing' } });
        const res = mockRes();

        await userController.deleteUser(req, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('prevents deleting the last SuperAdmin', async () => {
        const user = { ...MOCK_USER, userRoles: [{ role: { name: 'SuperAdmin' } }] };
        prisma.user.findUnique.mockResolvedValue(user);
        prisma.user.count.mockResolvedValue(1);

        const req = mockReq({ params: { id: 'user-2' } });
        const res = mockRes();

        await userController.deleteUser(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].error.code).toBe('USER_004');
    });

    it('passes errors to next', async () => {
        prisma.user.findUnique.mockRejectedValue(new Error('DB error'));

        await userController.deleteUser(mockReq({ params: { id: 'user-2' } }), mockRes(), next);

        expect(next).toHaveBeenCalled();
    });
});
