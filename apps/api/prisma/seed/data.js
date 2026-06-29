const { v4: uuidv4 } = require('uuid');
const { IP_POOL } = require('../seed.config');

const now = new Date();

const USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Firefox/125.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Safari/604.1',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36 Chrome/124.0.0.0',
];

const COUNTRY_CITY = [
    { country: 'United States', city: 'Austin' },
    { country: 'United Kingdom', city: 'London' },
    { country: 'India', city: 'Bengaluru' },
    { country: 'Germany', city: 'Berlin' },
    { country: 'France', city: 'Paris' },
    { country: 'Japan', city: 'Tokyo' },
    { country: 'Nigeria', city: 'Lagos' },
    { country: 'Brazil', city: 'Sao Paulo' },
];

const hoursAgo = (h) => new Date(now.getTime() - h * 60 * 60 * 1000);
const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
const hoursFrom = (iso, h) => new Date(new Date(iso).getTime() + h * 60 * 60 * 1000);
const toIso = (date) => date.toISOString();

const roleSeeds = [
    {
        id: uuidv4(),
        name: 'SuperAdmin',
        description: 'Full unrestricted access to all IAM resources',
        type: 'system',
        createdAt: toIso(daysAgo(350)),
        updatedAt: toIso(daysAgo(12)),
    },
    {
        id: uuidv4(),
        name: 'ReadOnlyAccess',
        description: 'View-only access across all IAM resources',
        type: 'system',
        createdAt: toIso(daysAgo(330)),
        updatedAt: toIso(daysAgo(9)),
    },
    {
        id: uuidv4(),
        name: 'IAMUserAdmin',
        description: 'Manage users and groups, no policy access',
        type: 'system',
        createdAt: toIso(daysAgo(320)),
        updatedAt: toIso(daysAgo(11)),
    },
    {
        id: uuidv4(),
        name: 'SecurityAuditor',
        description: 'Read audit logs and security reports',
        type: 'system',
        createdAt: toIso(daysAgo(300)),
        updatedAt: toIso(daysAgo(8)),
    },
    {
        id: uuidv4(),
        name: 'DevOpsEngineer',
        description: 'Manage sessions, view roles, limited user access',
        type: 'custom',
        createdAt: toIso(daysAgo(250)),
        updatedAt: toIso(daysAgo(6)),
    },
    {
        id: uuidv4(),
        name: 'PolicyManager',
        description: 'Create and attach policies, no user management',
        type: 'custom',
        createdAt: toIso(daysAgo(210)),
        updatedAt: toIso(daysAgo(5)),
    },
    {
        id: uuidv4(),
        name: 'GroupManager',
        description: 'Manage groups and group memberships only',
        type: 'custom',
        createdAt: toIso(daysAgo(190)),
        updatedAt: toIso(daysAgo(4)),
    },
    {
        id: uuidv4(),
        name: 'BillingViewer',
        description: 'View billing and usage data only',
        type: 'custom',
        createdAt: toIso(daysAgo(175)),
        updatedAt: toIso(daysAgo(3)),
    },
];

const roleIdByName = Object.fromEntries(roleSeeds.map((r) => [r.name, r.id]));

const userProfiles = [
    ['Admin', 'User'],
    ['Priya', 'Nambiar'],
    ['Carlos', 'Mendoza'],
    ['Aisha', 'Okonkwo'],
    ['Liu', 'Wei'],
    ['Sophie', 'Beaumont'],
    ['Rajan', 'Iyer'],
    ['Fatima', 'Al-Rashid'],
    ['Marcus', 'Chen'],
    ['Elena', 'Vasquez'],
    ['Tobias', 'Schneider'],
    ['Yuki', 'Tanaka'],
    ['Amara', 'Diallo'],
    ['Owen', 'Fitzgerald'],
    ['Nadia', 'Kowalski'],
    ['Samuel', 'Osei'],
    ['Isabella', 'Romano'],
    ['Arjun', 'Patel'],
    ['Claire', 'Dubois'],
    ['Kwame', 'Asante'],
    ['Lena', 'Hoffmann'],
    ['Diego', 'Herrera'],
    ['Zara', 'Ahmed'],
    ['Nathan', 'Brooks'],
    ['Mei', 'Huang'],
];

const roleDistribution = [
    roleIdByName.SuperAdmin,
    roleIdByName.SuperAdmin,
    roleIdByName.SuperAdmin,
    roleIdByName.SuperAdmin,
    roleIdByName.SuperAdmin,
    roleIdByName.SuperAdmin,
    roleIdByName.SuperAdmin,
    roleIdByName.SuperAdmin,
    roleIdByName.ReadOnlyAccess,
    roleIdByName.ReadOnlyAccess,
    roleIdByName.ReadOnlyAccess,
    roleIdByName.ReadOnlyAccess,
    roleIdByName.ReadOnlyAccess,
    roleIdByName.ReadOnlyAccess,
    roleIdByName.ReadOnlyAccess,
    roleIdByName.ReadOnlyAccess,
    roleIdByName.ReadOnlyAccess,
    roleIdByName.ReadOnlyAccess,
    roleIdByName.DevOpsEngineer,
    roleIdByName.DevOpsEngineer,
    roleIdByName.DevOpsEngineer,
    roleIdByName.DevOpsEngineer,
    null,
    null,
    null,
];

const actionPlan = [
    { action: 'LOGIN', category: 'Authentication', results: ['success', 'success', 'success', 'success', 'success', 'success', 'success', 'failure'] },
    { action: 'LOGOUT', category: 'Authentication', results: ['success', 'success', 'success', 'success', 'success'] },
    { action: 'LOGIN_FAILED', category: 'Authentication', results: ['failure', 'failure', 'failure', 'failure'] },
    { action: 'USER_CREATED', category: 'UserMgmt', results: ['success', 'success', 'success', 'success'] },
    { action: 'USER_UPDATED', category: 'UserMgmt', results: ['success', 'success', 'success'] },
    { action: 'USER_DELETED', category: 'UserMgmt', results: ['success', 'success'] },
    { action: 'ROLE_ASSIGNED', category: 'RoleMgmt', results: ['success', 'success', 'success', 'success'] },
    { action: 'POLICY_ATTACHED', category: 'PolicyMgmt', results: ['success', 'success', 'success'] },
    { action: 'POLICY_DETACHED', category: 'PolicyMgmt', results: ['success', 'success'] },
    { action: 'GROUP_CREATED', category: 'GroupMgmt', results: ['success', 'success'] },
    { action: 'GROUP_MEMBER_ADDED', category: 'GroupMgmt', results: ['success', 'success', 'success', 'success'] },
    { action: 'PERMISSION_CHECKED', category: 'Authorization', results: ['success', 'success', 'success', 'success', 'success', 'denied'] },
    { action: 'SESSION_REVOKED', category: 'SessionMgmt', results: ['success', 'success'] },
    { action: 'MFA_ENABLED', category: 'System', results: ['success'] },
];

const toPrismaUserStatus = (status) => {
    if (status === 'active') return 'ACTIVE';
    if (status === 'locked') return 'LOCKED';
    return 'INACTIVE';
};

const toPrismaAuditCategory = (category) => {
    const map = {
        Authentication: 'AUTHENTICATION',
        Authorization: 'AUTHORIZATION',
        UserMgmt: 'USER_MANAGEMENT',
        RoleMgmt: 'ROLE_MANAGEMENT',
        PolicyMgmt: 'POLICY_MANAGEMENT',
        GroupMgmt: 'GROUP_MANAGEMENT',
        SessionMgmt: 'SESSION_MANAGEMENT',
        System: 'SYSTEM',
    };
    return map[category] || 'SYSTEM';
};

const toPrismaAuditResult = (result) => {
    if (result === 'success') return 'SUCCESS';
    if (result === 'failure') return 'FAILURE';
    if (result === 'denied') return 'BLOCKED';
    return 'ERROR';
};

const toPrismaPolicyEffect = (effect) => (effect.toUpperCase() === 'ALLOW' ? 'ALLOW' : 'DENY');

module.exports = {
    uuidv4,
    IP_POOL,
    now,
    USER_AGENTS,
    COUNTRY_CITY,
    hoursAgo,
    daysAgo,
    hoursFrom,
    toIso,
    roleSeeds,
    roleIdByName,
    userProfiles,
    roleDistribution,
    actionPlan,
    toPrismaUserStatus,
    toPrismaAuditCategory,
    toPrismaAuditResult,
    toPrismaPolicyEffect,
};
