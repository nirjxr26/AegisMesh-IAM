'use strict';

jest.mock('../../src/config/redis', () => require('../helpers/redisMock'));

// Mock prisma before loading the module
jest.mock('../../src/config/database', () => ({
    userRole: { findMany: jest.fn() },
    userGroup: { findMany: jest.fn() },
    groupRole: { findMany: jest.fn() },
}));

const prisma = require('../../src/config/database');
const { checkPermission, getUserPermissions } = require('../../src/services/permission.service');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUserRole(roleName, policies = []) {
    return {
        role: {
            id: `role-${roleName}`,
            name: roleName,
            rolePolicies: policies.map((p) => ({ policy: p })),
        },
    };
}

function makePolicy({ id, name, effect, actions, resources }) {
    return { id, name, effect, actions, resources };
}

function setupMocks({ userRoles = [], userGroups = [], groupRoles = [] } = {}) {
    prisma.userRole.findMany.mockResolvedValue(userRoles);
    prisma.userGroup.findMany.mockResolvedValue(userGroups);
    prisma.groupRole.findMany.mockResolvedValue(groupRoles);
}

afterEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// checkPermission - SuperAdmin bypass
// ---------------------------------------------------------------------------
describe('checkPermission – SuperAdmin bypass', () => {
    it('allows everything for SuperAdmin via direct role', async () => {
        setupMocks({ userRoles: [makeUserRole('SuperAdmin')] });

        const result = await checkPermission('user-1', 'delete', 'users');
        expect(result.allowed).toBe(true);
        expect(result.reason).toBe('SuperAdmin');
    });

    it('allows everything for SuperAdmin via group role', async () => {
        prisma.userRole.findMany.mockResolvedValue([]);
        prisma.userGroup.findMany.mockResolvedValue([
            {
                groupId: 'g1',
                group: {
                    id: 'g1',
                },
            },
        ]);
        prisma.groupRole.findMany.mockResolvedValue([
            {
                groupId: 'g1',
                role: {
                    id: 'r1',
                    name: 'SuperAdmin',
                    rolePolicies: [],
                },
            },
        ]);

        const result = await checkPermission('user-1', 'delete', 'users');
        expect(result.allowed).toBe(true);
        expect(result.reason).toBe('SuperAdmin');
    });
});

// ---------------------------------------------------------------------------
// checkPermission - ALLOW policies
// ---------------------------------------------------------------------------
describe('checkPermission – ALLOW policies', () => {
    it('allows when a matching ALLOW policy exists', async () => {
        const policy = makePolicy({
            id: 'p1',
            name: 'ReadUsers',
            effect: 'ALLOW',
            actions: ['read'],
            resources: ['users'],
        });
        setupMocks({ userRoles: [makeUserRole('Viewer', [policy])] });

        const result = await checkPermission('user-1', 'read', 'users');
        expect(result.allowed).toBe(true);
        expect(result.reason).toBe('Allowed by policy');
    });

    it('denies implicitly when no policy matches', async () => {
        const policy = makePolicy({
            id: 'p1',
            name: 'ReadUsers',
            effect: 'ALLOW',
            actions: ['read'],
            resources: ['users'],
        });
        setupMocks({ userRoles: [makeUserRole('Viewer', [policy])] });

        const result = await checkPermission('user-1', 'delete', 'users');
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('No matching policy');
    });

    it('matches wildcard actions', async () => {
        const policy = makePolicy({
            id: 'p1',
            name: 'AllActions',
            effect: 'ALLOW',
            actions: ['*'],
            resources: ['users'],
        });
        setupMocks({ userRoles: [makeUserRole('Admin', [policy])] });

        const result = await checkPermission('user-1', 'anything', 'users');
        expect(result.allowed).toBe(true);
    });

    it('matches wildcard resources', async () => {
        const policy = makePolicy({
            id: 'p1',
            name: 'AllResources',
            effect: 'ALLOW',
            actions: ['read'],
            resources: ['*'],
        });
        setupMocks({ userRoles: [makeUserRole('Admin', [policy])] });

        const result = await checkPermission('user-1', 'read', 'anything');
        expect(result.allowed).toBe(true);
    });

    it('matches partial wildcard (prefix)', async () => {
        const policy = makePolicy({
            id: 'p1',
            name: 'AuditRead',
            effect: 'ALLOW',
            actions: ['audit:*'],
            resources: ['*'],
        });
        setupMocks({ userRoles: [makeUserRole('Auditor', [policy])] });

        const result = await checkPermission('user-1', 'audit:read', 'logs');
        expect(result.allowed).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// checkPermission - DENY policies
// ---------------------------------------------------------------------------
describe('checkPermission – DENY policies', () => {
    it('DENY overrides a matching ALLOW', async () => {
        const allow = makePolicy({
            id: 'p-allow',
            name: 'AllowAll',
            effect: 'ALLOW',
            actions: ['*'],
            resources: ['*'],
        });
        const deny = makePolicy({
            id: 'p-deny',
            name: 'DenyDelete',
            effect: 'DENY',
            actions: ['delete'],
            resources: ['users'],
        });
        setupMocks({ userRoles: [makeUserRole('Admin', [allow, deny])] });

        const result = await checkPermission('user-1', 'delete', 'users');
        expect(result.allowed).toBe(false);
        expect(result.reason).toMatch(/Explicitly denied/);
    });

    it('DENY is selective - other actions still allowed', async () => {
        const allow = makePolicy({
            id: 'p-allow',
            name: 'AllowAll',
            effect: 'ALLOW',
            actions: ['*'],
            resources: ['*'],
        });
        const deny = makePolicy({
            id: 'p-deny',
            name: 'DenyDelete',
            effect: 'DENY',
            actions: ['delete'],
            resources: ['users'],
        });
        setupMocks({ userRoles: [makeUserRole('Admin', [allow, deny])] });

        const result = await checkPermission('user-1', 'read', 'users');
        expect(result.allowed).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// checkPermission - no roles
// ---------------------------------------------------------------------------
describe('checkPermission – no roles assigned', () => {
    it('returns implicit deny when user has no roles', async () => {
        setupMocks();

        const result = await checkPermission('user-1', 'read', 'users');
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('No matching policy');
    });
});

// ---------------------------------------------------------------------------
// getUserPermissions
// ---------------------------------------------------------------------------
describe('getUserPermissions', () => {
    it('returns an empty array when there are no roles', async () => {
        setupMocks();
        const perms = await getUserPermissions('user-1');
        expect(perms).toEqual([]);
    });

    it('aggregates policies from direct roles', async () => {
        const policy = makePolicy({
            id: 'p1',
            name: 'ReadUsers',
            effect: 'ALLOW',
            actions: ['read'],
            resources: ['users'],
        });
        setupMocks({ userRoles: [makeUserRole('Viewer', [policy])] });

        const perms = await getUserPermissions('user-1');
        expect(perms).toHaveLength(1);
        expect(perms[0].id).toBe('p1');
    });

    it('deduplicates policies shared across multiple roles', async () => {
        const shared = makePolicy({
            id: 'shared',
            name: 'ReadUsers',
            effect: 'ALLOW',
            actions: ['read'],
            resources: ['users'],
        });
        setupMocks({
            userRoles: [makeUserRole('Role1', [shared]), makeUserRole('Role2', [shared])],
        });

        const perms = await getUserPermissions('user-1');
        expect(perms).toHaveLength(1);
    });
});
