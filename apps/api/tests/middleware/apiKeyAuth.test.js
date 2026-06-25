'use strict';

jest.mock('../../src/config/database', () => ({
    apiToken: {
        findMany: jest.fn(),
        update: jest.fn(),
    },
}));

// Mock bcrypt so tests don't do real hashing
jest.mock('bcryptjs', () => ({
    compare: jest.fn(),
}));

const bcrypt = require('bcryptjs');
const prisma = require('../../src/config/database');
const { getRequiredScope, authenticateApiKeyToken } = require('../../src/middleware/apiKeyAuth');

// ---------------------------------------------------------------------------
// getRequiredScope
// ---------------------------------------------------------------------------
describe('getRequiredScope', () => {
    const cases = [
        ['GET',    '/api/users',           'read:users'],
        ['POST',   '/api/users',           'write:users'],
        ['DELETE', '/api/users/123',       'write:users'],
        ['GET',    '/api/roles',           'read:roles'],
        ['PUT',    '/api/roles/abc',       'write:roles'],
        ['GET',    '/api/policies',        'read:policies'],
        ['PATCH',  '/api/policies/xyz',    'write:policies'],
        ['POST',   '/api/groups',          'write:groups'],
        ['DELETE', '/api/groups/g1',       'write:groups'],
        ['GET',    '/api/audit-logs',      'read:audit'],
        ['GET',    '/api/audit-logs/123',  'read:audit'],
        ['GET',    '/api/unknown',         null],
        ['POST',   '/api/settings',        null],
    ];

    it.each(cases)('%s %s → %s', (method, path, expected) => {
        expect(getRequiredScope(method, path)).toBe(expected);
    });
});

// ---------------------------------------------------------------------------
// authenticateApiKeyToken
// ---------------------------------------------------------------------------
describe('authenticateApiKeyToken', () => {
    afterEach(() => jest.clearAllMocks());

    const MOCK_USER = {
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

    function makeToken(overrides = {}) {
        return {
            id: 'token-1',
            tokenPrefix: 'iam_test12',
            tokenHash: 'hashed',
            isActive: true,
            revokedAt: null,
            expiresAt: null,
            scopes: ['read:users', 'write:users'],
            lastUsedAt: null,
            user: MOCK_USER,
            ...overrides,
        };
    }

    const validRawToken = 'iam_test1234567890';
    const mockReq = { method: 'GET', originalUrl: '/api/users', path: '/api/users' };

    it('returns null for a token that does not start with iam_', async () => {
        const result = await authenticateApiKeyToken(mockReq, 'jwt.tok.en');
        expect(result).toBeNull();
        expect(prisma.apiToken.findMany).not.toHaveBeenCalled();
    });

    it('returns null for a very short token', async () => {
        const result = await authenticateApiKeyToken(mockReq, 'iam_x');
        expect(result).toBeNull();
    });

    it('returns null when no candidate tokens are found in DB', async () => {
        prisma.apiToken.findMany.mockResolvedValue([]);
        const result = await authenticateApiKeyToken(mockReq, validRawToken);
        expect(result).toBeNull();
    });

    it('returns null when bcrypt comparison fails for all candidates', async () => {
        prisma.apiToken.findMany.mockResolvedValue([makeToken()]);
        bcrypt.compare.mockResolvedValue(false);

        const result = await authenticateApiKeyToken(mockReq, validRawToken);
        expect(result).toBeNull();
    });

    it('returns null and marks the token inactive when it has expired', async () => {
        const expired = makeToken({ expiresAt: new Date(Date.now() - 1000) });
        prisma.apiToken.findMany.mockResolvedValue([expired]);
        bcrypt.compare.mockResolvedValue(true);
        prisma.apiToken.update.mockResolvedValue({});

        const result = await authenticateApiKeyToken(mockReq, validRawToken);
        expect(result).toBeNull();
        expect(prisma.apiToken.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'token-1' },
                data: expect.objectContaining({ isActive: false }),
            })
        );
    });

    it('returns scopeError when the required scope is missing', async () => {
        // Token only has 'read:audit', but request needs 'read:users'
        const token = makeToken({ scopes: ['read:audit'] });
        prisma.apiToken.findMany.mockResolvedValue([token]);
        bcrypt.compare.mockResolvedValue(true);

        const result = await authenticateApiKeyToken(mockReq, validRawToken);
        expect(result).toEqual({ scopeError: true });
    });

    it('returns the user object when the token is valid and in-scope', async () => {
        prisma.apiToken.findMany.mockResolvedValue([makeToken()]);
        bcrypt.compare.mockResolvedValue(true);
        prisma.apiToken.update.mockResolvedValue({});

        const result = await authenticateApiKeyToken(mockReq, validRawToken);
        expect(result).not.toBeNull();
        expect(result.id).toBe('user-1');
        expect(result.authType).toBe('apiKey');
        expect(result.apiTokenScopes).toEqual(['read:users', 'write:users']);
    });

    it('allows wildcard scope (*) to satisfy any requirement', async () => {
        const token = makeToken({ scopes: ['*'] });
        prisma.apiToken.findMany.mockResolvedValue([token]);
        bcrypt.compare.mockResolvedValue(true);
        prisma.apiToken.update.mockResolvedValue({});

        const result = await authenticateApiKeyToken(mockReq, validRawToken);
        expect(result).not.toBeNull();
        expect(result.id).toBe('user-1');
    });

    it('returns null when the matched token has no associated user', async () => {
        const token = makeToken({ user: null });
        prisma.apiToken.findMany.mockResolvedValue([token]);
        bcrypt.compare.mockResolvedValue(true);
        prisma.apiToken.update.mockResolvedValue({});

        const result = await authenticateApiKeyToken(mockReq, validRawToken);
        expect(result).toBeNull();
    });

    it('derives SuperAdmin role when user has that role', async () => {
        const superUser = {
            ...MOCK_USER,
            userRoles: [{ role: { name: 'SuperAdmin' } }],
        };
        prisma.apiToken.findMany.mockResolvedValue([makeToken({ user: superUser })]);
        bcrypt.compare.mockResolvedValue(true);
        prisma.apiToken.update.mockResolvedValue({});

        const result = await authenticateApiKeyToken(mockReq, validRawToken);
        expect(result.role).toBe('SuperAdmin');
    });
});
