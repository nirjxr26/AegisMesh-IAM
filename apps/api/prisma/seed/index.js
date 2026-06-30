const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { randomInt } = require('node:crypto');
const prisma = require('../../src/config/database');
const { IP_POOL } = require('../seed.config');
const { USER_AGENTS, COUNTRY_CITY, now, hoursAgo, daysAgo, hoursFrom, toIso } = require('../seed.common');

const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD || 'Seed-Demo-Pass-2024-Dev'; // NOSONAR

function toPrismaUserStatus(status) {
    if (status === 'active') return 'ACTIVE';
    if (status === 'locked') return 'LOCKED';
    return 'INACTIVE';
}

function toPrismaAuditCategory(category) {
    const map = { Authentication: 'AUTHENTICATION', Authorization: 'AUTHORIZATION', UserMgmt: 'USER_MANAGEMENT', RoleMgmt: 'ROLE_MANAGEMENT', PolicyMgmt: 'POLICY_MANAGEMENT', GroupMgmt: 'GROUP_MANAGEMENT', SessionMgmt: 'SESSION_MANAGEMENT', System: 'SYSTEM' };
    return map[category] || 'SYSTEM';
}

function toPrismaAuditResult(result) {
    if (result === 'success') return 'SUCCESS';
    if (result === 'failure') return 'FAILURE';
    if (result === 'denied') return 'BLOCKED';
    return 'ERROR';
}

const toPrismaPolicyEffect = (effect) => (effect.toUpperCase() === 'ALLOW' ? 'ALLOW' : 'DENY');

const roleSeeds = [
    { id: uuidv4(), name: 'SuperAdmin', description: 'Full unrestricted access to all IAM resources', type: 'system', createdAt: toIso(daysAgo(350)), updatedAt: toIso(daysAgo(12)) },
    { id: uuidv4(), name: 'ReadOnlyAccess', description: 'View-only access across all IAM resources', type: 'system', createdAt: toIso(daysAgo(330)), updatedAt: toIso(daysAgo(9)) },
    { id: uuidv4(), name: 'IAMUserAdmin', description: 'Manage users and groups, no policy access', type: 'system', createdAt: toIso(daysAgo(320)), updatedAt: toIso(daysAgo(11)) },
    { id: uuidv4(), name: 'SecurityAuditor', description: 'Read audit logs and security reports', type: 'system', createdAt: toIso(daysAgo(300)), updatedAt: toIso(daysAgo(8)) },
    { id: uuidv4(), name: 'DevOpsEngineer', description: 'Manage sessions, view roles, limited user access', type: 'custom', createdAt: toIso(daysAgo(250)), updatedAt: toIso(daysAgo(6)) },
    { id: uuidv4(), name: 'PolicyManager', description: 'Create and attach policies, no user management', type: 'custom', createdAt: toIso(daysAgo(210)), updatedAt: toIso(daysAgo(5)) },
    { id: uuidv4(), name: 'GroupManager', description: 'Manage groups and group memberships only', type: 'custom', createdAt: toIso(daysAgo(190)), updatedAt: toIso(daysAgo(4)) },
    { id: uuidv4(), name: 'BillingViewer', description: 'View billing and usage data only', type: 'custom', createdAt: toIso(daysAgo(175)), updatedAt: toIso(daysAgo(3)) },
];

const roleIdByName = Object.fromEntries(roleSeeds.map((r) => [r.name, r.id]));

const policies = [
    { id: uuidv4(), name: 'AdministratorAccess', description: 'Full administrative control across IAM services and resources', effect: 'Allow', actions: ['*:*'], resources: ['*'], type: 'aws_managed', attachedToRoles: [roleIdByName.SuperAdmin], createdAt: toIso(daysAgo(330)), updatedAt: toIso(daysAgo(7)) },
    { id: uuidv4(), name: 'ReadOnlyAccess', description: 'Read-only visibility into IAM resources and configurations', effect: 'Allow', actions: ['*:Describe*', '*:List*', '*:Get*'], resources: ['*'], type: 'aws_managed', attachedToRoles: [roleIdByName.ReadOnlyAccess, roleIdByName.SecurityAuditor, roleIdByName.BillingViewer], createdAt: toIso(daysAgo(325)), updatedAt: toIso(daysAgo(6)) },
    { id: uuidv4(), name: 'IAMFullAccess', description: 'Complete IAM administration actions', effect: 'Allow', actions: ['iam:*'], resources: ['arn:aws:iam::*:*'], type: 'aws_managed', attachedToRoles: [roleIdByName.SuperAdmin, roleIdByName.IAMUserAdmin], createdAt: toIso(daysAgo(312)), updatedAt: toIso(daysAgo(5)) },
    { id: uuidv4(), name: 'IAMReadOnlyAccess', description: 'Read-only IAM API access', effect: 'Allow', actions: ['iam:Get*', 'iam:List*'], resources: ['arn:aws:iam::*:*'], type: 'aws_managed', attachedToRoles: [roleIdByName.ReadOnlyAccess, roleIdByName.SecurityAuditor], createdAt: toIso(daysAgo(305)), updatedAt: toIso(daysAgo(5)) },
    { id: uuidv4(), name: 'UserManagement', description: 'Create, update and remove IAM users', effect: 'Allow', actions: ['iam:CreateUser', 'iam:DeleteUser', 'iam:UpdateUser', 'iam:ListUsers'], resources: ['arn:aws:iam::*:user/*'], type: 'aws_managed', attachedToRoles: [roleIdByName.IAMUserAdmin, roleIdByName.SuperAdmin], createdAt: toIso(daysAgo(287)), updatedAt: toIso(daysAgo(4)) },
    { id: uuidv4(), name: 'RoleManagement', description: 'Create and manage IAM roles and role relationships', effect: 'Allow', actions: ['iam:CreateRole', 'iam:DeleteRole', 'iam:AttachRolePolicy', 'iam:ListRoles'], resources: ['arn:aws:iam::*:role/*'], type: 'aws_managed', attachedToRoles: [roleIdByName.IAMUserAdmin, roleIdByName.SuperAdmin], createdAt: toIso(daysAgo(275)), updatedAt: toIso(daysAgo(4)) },
    { id: uuidv4(), name: 'PolicyManagement', description: 'Create, update and attach custom IAM policies', effect: 'Allow', actions: ['iam:CreatePolicy', 'iam:DeletePolicy', 'iam:AttachUserPolicy', 'iam:ListPolicies'], resources: ['arn:aws:iam::*:policy/*'], type: 'custom', attachedToRoles: [roleIdByName.PolicyManager, roleIdByName.SuperAdmin], createdAt: toIso(daysAgo(240)), updatedAt: toIso(daysAgo(3)) },
    { id: uuidv4(), name: 'GroupManagement', description: 'Create and maintain IAM groups and memberships', effect: 'Allow', actions: ['iam:CreateGroup', 'iam:DeleteGroup', 'iam:AddUserToGroup', 'iam:ListGroups'], resources: ['arn:aws:iam::*:group/*'], type: 'custom', attachedToRoles: [roleIdByName.GroupManager, roleIdByName.IAMUserAdmin], createdAt: toIso(daysAgo(225)), updatedAt: toIso(daysAgo(3)) },
    { id: uuidv4(), name: 'AuditLogAccess', description: 'Read security and activity logs', effect: 'Allow', actions: ['logs:GetLogEvents', 'logs:FilterLogEvents', 'logs:DescribeLogGroups'], resources: ['arn:aws:logs:*:*:log-group:*'], type: 'custom', attachedToRoles: [roleIdByName.SecurityAuditor, roleIdByName.SuperAdmin], createdAt: toIso(daysAgo(210)), updatedAt: toIso(daysAgo(2)) },
    { id: uuidv4(), name: 'SessionManagement', description: 'Create, view and revoke active sessions', effect: 'Allow', actions: ['iam:CreateSession', 'iam:DeleteSession', 'iam:ListSessions'], resources: ['arn:aws:iam::*:session/*'], type: 'custom', attachedToRoles: [roleIdByName.DevOpsEngineer, roleIdByName.SuperAdmin], createdAt: toIso(daysAgo(195)), updatedAt: toIso(daysAgo(2)) },
    { id: uuidv4(), name: 'DenyRootAccess', description: 'Blocks any root-account level IAM operation', effect: 'Deny', actions: ['iam:*Root*'], resources: ['*'], type: 'custom', attachedToRoles: [roleIdByName.SuperAdmin, roleIdByName.IAMUserAdmin, roleIdByName.DevOpsEngineer], createdAt: toIso(daysAgo(182)), updatedAt: toIso(daysAgo(2)) },
    { id: uuidv4(), name: 'DenyPolicyDeletion', description: 'Prevents destructive policy detach/delete actions', effect: 'Deny', actions: ['iam:DeletePolicy', 'iam:DetachRolePolicy'], resources: ['arn:aws:iam::*:policy/*'], type: 'custom', attachedToRoles: [roleIdByName.SecurityAuditor, roleIdByName.GroupManager, roleIdByName.BillingViewer], createdAt: toIso(daysAgo(171)), updatedAt: toIso(daysAgo(1)) },
];

const groups = [
    { id: uuidv4(), name: 'Engineering', description: 'Core engineering team with dev access', memberIds: [] },
    { id: uuidv4(), name: 'Security Team', description: 'Internal security and compliance', memberIds: [] },
    { id: uuidv4(), name: 'Platform Admins', description: 'Full platform administrators', memberIds: [] },
    { id: uuidv4(), name: 'Product Team', description: 'Product managers with read access', memberIds: [] },
    { id: uuidv4(), name: 'Policy Reviewers', description: 'Responsible for policy lifecycle', memberIds: [] },
    { id: uuidv4(), name: 'Billing', description: 'Finance team with billing visibility', memberIds: [] },
];

const userProfiles = [
    ['Admin', 'User'], ['Priya', 'Nambiar'], ['Carlos', 'Mendoza'], ['Aisha', 'Okonkwo'],
    ['Liu', 'Wei'], ['Sophie', 'Beaumont'], ['Rajan', 'Iyer'], ['Fatima', 'Al-Rashid'],
    ['Marcus', 'Chen'], ['Elena', 'Vasquez'], ['Tobias', 'Schneider'], ['Yuki', 'Tanaka'],
    ['Amara', 'Diallo'], ['Owen', 'Fitzgerald'], ['Nadia', 'Kowalski'], ['Samuel', 'Osei'],
    ['Isabella', 'Romano'], ['Arjun', 'Patel'], ['Claire', 'Dubois'], ['Kwame', 'Asante'],
    ['Lena', 'Hoffmann'], ['Diego', 'Herrera'], ['Zara', 'Ahmed'], ['Nathan', 'Brooks'], ['Mei', 'Huang'],
];

const roleDistribution = [
    roleIdByName.SuperAdmin, roleIdByName.SuperAdmin, roleIdByName.SuperAdmin,
    roleIdByName.SuperAdmin, roleIdByName.SuperAdmin, roleIdByName.SuperAdmin,
    roleIdByName.SuperAdmin, roleIdByName.SuperAdmin, roleIdByName.ReadOnlyAccess,
    roleIdByName.ReadOnlyAccess, roleIdByName.ReadOnlyAccess, roleIdByName.ReadOnlyAccess,
    roleIdByName.ReadOnlyAccess, roleIdByName.ReadOnlyAccess, roleIdByName.ReadOnlyAccess,
    roleIdByName.ReadOnlyAccess, roleIdByName.ReadOnlyAccess, roleIdByName.ReadOnlyAccess,
    roleIdByName.DevOpsEngineer, roleIdByName.DevOpsEngineer, roleIdByName.DevOpsEngineer,
    roleIdByName.DevOpsEngineer, null, null, null,
];

const users = userProfiles.map(([firstName, lastName], idx) => {
    const emailLocal = idx === 0 ? 'admin' : `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]/g, '').replace(/\.{2,}/g, '.');
    let status;
    if (idx < 18) status = 'active';
    else if (idx < 22) status = 'locked';
    else status = 'pending';
    const emailVerified = idx < 20;
    const mfaEnabled = idx === 0 ? false : idx < 15;
    let mfaType = null;
    if (mfaEnabled) mfaType = idx % 4 === 0 ? 'sms' : 'totp';
    let lastLoginAt = null;
    if (idx < 10) lastLoginAt = toIso(hoursAgo([1, 2, 3, 5, 7, 9, 12, 15, 18, 22][idx]));
    else if (idx < 18) lastLoginAt = toIso(daysAgo([2, 2.5, 3, 3.5, 4, 5, 6, 6.75][idx - 10]));
    else if (idx < 22) lastLoginAt = toIso(daysAgo([10, 15, 21, 28][idx - 18]));
    const createdAt = toIso(daysAgo(360 - idx * 12));
    const updatedAt = toIso(hoursFrom(createdAt, 48 + idx * 6));
    return {
        id: uuidv4(), firstName, lastName, email: `${emailLocal}@northbridge.io`,
        passwordHash: '<bcrypt hash placeholder>', status, emailVerified,
        mfaEnabled, mfaType, roleId: roleDistribution[idx], lastLoginAt, createdAt, updatedAt,
        loginAttempts: status === 'locked' ? 3 : idx % 3,
        ipAddress: IP_POOL[idx % IP_POOL.length],
    };
});

const groupMembers = [
    [[4, 5, 6, 7, 18, 19, 20, 21], [roleIdByName.DevOpsEngineer]],
    [[0, 1, 8, 9], [roleIdByName.SecurityAuditor, roleIdByName.ReadOnlyAccess]],
    [[2, 3, 10], [roleIdByName.SuperAdmin]],
    [[11, 12, 13, 14, 15], [roleIdByName.ReadOnlyAccess]],
    [[16, 17, 22], [roleIdByName.PolicyManager]],
    [[23, 24], [roleIdByName.BillingViewer]],
];
groupMembers.forEach(([memberIndices, roleIds], i) => {
    groups[i].memberIds = memberIndices.map((idx) => users[idx].id);
    groups[i].attachedRoleIds = roleIds;
});

const sessions = Array.from({ length: 8 }, (_, idx) => {
    const createdAt = toIso(hoursAgo((idx % 8) + 1));
    const expiresAt = toIso(hoursFrom(createdAt, 12 + (idx % 13)));
    const lastActiveAt = toIso(hoursFrom(createdAt, (idx % 2) * 0.3 + 0.2));
    const browserVariants = ['Chrome 124', 'Firefox 125', 'Safari 17', 'Chrome 124'];
    const osVariants = ['macOS 14', 'Windows 11', 'iOS 17', 'Ubuntu 22'];
    const deviceVariants = ['desktop', 'desktop', 'mobile', 'desktop'];
    return {
        id: uuidv4(), userId: users[idx].id, userEmail: users[idx].email,
        ipAddress: IP_POOL[idx % IP_POOL.length],
        userAgent: USER_AGENTS[idx % USER_AGENTS.length],
        browser: browserVariants[idx % browserVariants.length],
        os: osVariants[idx % osVariants.length],
        device: deviceVariants[idx % deviceVariants.length],
        isCurrent: idx === 0, createdAt, expiresAt, lastActiveAt,
    };
});

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

const auditLogs = [];
let auditIdx = 0;
for (const entry of actionPlan) {
    for (let i = 0; i < entry.results.length; i += 1) {
        const actor = users[(auditIdx + i) % users.length];
        const role = roleSeeds[(auditIdx + i) % roleSeeds.length];
        const policy = policies[(auditIdx + i) % policies.length];
        const group = groups[(auditIdx + i) % groups.length];
        const session = sessions[(auditIdx + i) % sessions.length];
        const region = COUNTRY_CITY[(auditIdx + i) % COUNTRY_CITY.length];
        let targetType = null;
        let targetId = null;
        let resource = '/api/system/health';
        if (entry.action.startsWith('USER_')) { targetType = 'user'; targetId = users[(auditIdx + i + 3) % users.length].id; resource = `/api/users/${targetId}`; }
        else if (entry.action.startsWith('ROLE_')) { targetType = 'role'; targetId = role.id; resource = `/api/roles/${targetId}`; }
        else if (entry.action.startsWith('POLICY_')) { targetType = 'policy'; targetId = policy.id; resource = `/api/policies/${targetId}`; }
        else if (entry.action.startsWith('GROUP_')) { targetType = 'group'; targetId = group.id; resource = `/api/groups/${targetId}`; }
        else if (entry.action.startsWith('SESSION_')) { targetType = 'session'; targetId = session.id; resource = `/api/sessions/${targetId}`; }
        else if (entry.action === 'PERMISSION_CHECKED') { targetType = 'policy'; targetId = policy.id; resource = `arn:aws:iam::987654321098:policy/${policy.name}`; }
        auditLogs.push({
            id: uuidv4(), action: entry.action, category: entry.category,
            actorId: actor.id, actorEmail: actor.email, targetId, targetType, resource,
            result: entry.results[i],
            ipAddress: IP_POOL[(auditIdx + i) % IP_POOL.length],
            userAgent: USER_AGENTS[(auditIdx + i) % USER_AGENTS.length],
            metadata: { traceId: uuidv4(), requestPath: resource, actorRole: role.name, correlationKey: `evt-${(auditIdx + i + 1).toString().padStart(3, '0')}` },
            createdAt: toIso(hoursAgo(((auditIdx * 3 + i * 2) % (10 * 24)) + 1)),
            country: region.country, city: region.city,
        });
    }
    auditIdx += entry.results.length;
}

function toPrismaAuditData(log) {
    return {
        id: log.id, userId: log.actorId, sessionId: log.targetType === 'session' ? log.targetId : null,
        action: log.action, category: toPrismaAuditCategory(log.category),
        resource: log.resource, resourceId: log.targetId, ipAddress: log.ipAddress,
        userAgent: log.userAgent, country: log.country, city: log.city,
        result: toPrismaAuditResult(log.result), duration: 30 + randomInt(0, 300),
        errorCode: log.result === 'failure' ? 'AUTH_INVALID_CREDENTIALS' : null,
        metadata: { ...log.metadata, actorEmail: log.actorEmail, targetType: log.targetType },
        createdAt: new Date(log.createdAt),
    };
}

function generateAlertLogs() {
    const alertLogs = [];
    for (let i = 0; i < 12; i++) {
        alertLogs.push({ id: uuidv4(), userId: null, action: 'LOGIN_FAILED', category: 'AUTHENTICATION', resource: '/api/auth/login', result: 'FAILURE', ipAddress: '198.51.100.42', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', country: 'United States', city: 'New York', createdAt: new Date(now.getTime() - i * 60 * 1000), duration: 45, errorCode: 'AUTH_INVALID_CREDENTIALS' });
    }
    const targetUser = users[1] || users[0];
    alertLogs.push({ id: uuidv4(), userId: targetUser.id, action: 'ACCOUNT_LOCKED', category: 'AUTHENTICATION', resource: `/api/users/${targetUser.id}`, result: 'FAILURE', ipAddress: '198.51.100.42', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', country: 'United States', city: 'New York', createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), duration: 20 });
    const abuseUser = users[2] || users[0];
    for (let i = 0; i < 7; i++) {
        alertLogs.push({ id: uuidv4(), userId: abuseUser.id, action: 'PERMISSION_DENIED', category: 'AUTHORIZATION', resource: '/api/settings', result: 'BLOCKED', ipAddress: '203.0.113.15', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', country: 'Canada', city: 'Toronto', createdAt: new Date(now.getTime() - i * 2 * 60 * 1000), duration: 15, errorCode: 'RBAC_001' });
    }
    for (let i = 0; i < 15; i++) {
        alertLogs.push({ id: uuidv4(), userId: null, action: 'RATE_LIMIT_EXCEEDED', category: 'SYSTEM', resource: '/api/auth/login', result: 'BLOCKED', ipAddress: '203.0.113.88', userAgent: 'curl/8.19.0', country: 'Ukraine', city: 'Kyiv', createdAt: new Date(now.getTime() - i * 30 * 60 * 1000), duration: 5 });
    }
    return alertLogs;
}

function generateDailyLogs() {
    const dailyLogs = [];
    const actions = [
        { action: 'LOGIN', category: 'Authentication', result: 'success' },
        { action: 'LOGOUT', category: 'Authentication', result: 'success' },
        { action: 'PERMISSION_CHECKED', category: 'Authorization', result: 'success' },
        { action: 'USER_UPDATED', category: 'UserMgmt', result: 'success' },
        { action: 'GROUP_MEMBER_ADDED', category: 'GroupMgmt', result: 'success' },
    ];
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
        for (let i = 0, n = 4 + randomInt(0, 2); i < n; i++) {
            const actor = users[randomInt(0, users.length)];
            const actionInfo = actions[randomInt(0, actions.length)];
            const logDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
            logDate.setHours(randomInt(0, 24), randomInt(0, 60), randomInt(0, 60));
            dailyLogs.push({
                id: uuidv4(), userId: actor.id, action: actionInfo.action,
                category: toPrismaAuditCategory(actionInfo.category),
                resource: actionInfo.action === 'PERMISSION_CHECKED' ? 'arn:aws:iam::987654321098:policy/ReadOnlyAccess' : '/api/system/health',
                result: toPrismaAuditResult(actionInfo.result),
                ipAddress: IP_POOL[randomInt(0, IP_POOL.length)],
                userAgent: USER_AGENTS[randomInt(0, USER_AGENTS.length)],
                country: COUNTRY_CITY[randomInt(0, COUNTRY_CITY.length)].country,
                city: COUNTRY_CITY[randomInt(0, COUNTRY_CITY.length)].city,
                createdAt: logDate, duration: 30 + randomInt(0, 300),
            });
        }
    }
    return dailyLogs;
}

async function seedOrganization() {
    const existingOrg = await prisma.organizationSettings.findFirst();
    if (existingOrg) {
        console.log('OrganizationSettings exists, skipping creation');
        return;
    }
    await prisma.organizationSettings.create({
        data: { orgName: 'Northbridge IAM', accountId: uuidv4(), plan: 'enterprise', region: 'us-east-1', minPasswordLength: 12, requireUppercase: true, requireNumber: true, requireSymbol: true, passwordExpiryDays: 90, maxFailedAttempts: 5, sessionTimeoutMinutes: 480, requireMfaForAll: false, allowOAuthLogin: true, ipAllowlist: [] },
    });
}

async function seedRoles() {
    await prisma.role.createMany({ data: roleSeeds.map((r) => ({ id: r.id, name: r.name, description: r.description, isSystem: r.type === 'system', createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt) })) });
    await prisma.policy.createMany({ data: policies.map((p) => ({ id: p.id, name: p.name, description: p.description, effect: toPrismaPolicyEffect(p.effect), actions: p.actions, resources: p.resources, conditions: { seededBy: 'production-seed', type: p.type }, isSystem: p.type === 'aws_managed', createdBy: users[0].id, createdAt: new Date(p.createdAt), updatedAt: new Date(p.updatedAt) })) });
    await prisma.group.createMany({ data: groups.map((g) => ({ id: g.id, name: g.name, description: g.description, createdAt: new Date(g.createdAt), updatedAt: new Date(g.updatedAt) })) });
    const userRoleRows = users.filter((u) => u.roleId).map((u, idx) => ({ id: uuidv4(), userId: u.id, roleId: u.roleId, assignedAt: new Date(hoursAgo(240 - idx * 3)), assignedBy: users[0].id }));
    const rolePolicyRows = policies.flatMap((p) => p.attachedToRoles.map((roleId) => ({ id: uuidv4(), roleId, policyId: p.id })));
    const userGroupRows = groups.flatMap((g) => g.memberIds.map((userId, idx) => ({ id: uuidv4(), userId, groupId: g.id, joinedAt: new Date(daysAgo(160 - idx * 2)) })));
    const groupRoleRows = groups.flatMap((g) => g.attachedRoleIds.map((roleId) => ({ id: uuidv4(), groupId: g.id, roleId, assignedAt: new Date(daysAgo(120)) })));
    await prisma.userRole.createMany({ data: userRoleRows });
    await prisma.rolePolicy.createMany({ data: rolePolicyRows });
    await prisma.userGroup.createMany({ data: userGroupRows });
    await prisma.groupRole.createMany({ data: groupRoleRows });
    return { userRoleRows, rolePolicyRows, userGroupRows, groupRoleRows };
}

async function seedUsers(passwordHash) {
    await prisma.user.createMany({
        data: users.map((user, idx) => ({
            id: user.id, email: user.email, passwordHash, firstName: user.firstName, lastName: user.lastName,
            status: toPrismaUserStatus(user.status), emailVerified: user.emailVerified,
            emailVerifyToken: user.emailVerified ? null : `verify-${user.id}`,
            mfaEnabled: user.mfaEnabled, mfaSecret: user.mfaEnabled ? `JBSWY3DPEHPK3PXP${idx}` : null,
            mfaBackupCodes: user.mfaEnabled ? JSON.stringify([`${100000 + idx * 11}`, `${200000 + idx * 13}`, `${300000 + idx * 17}`, `${400000 + idx * 19}`, `${500000 + idx * 23}`, `${600000 + idx * 29}`]) : null,
            passwordChangedAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
            failedLoginCount: user.loginAttempts,
            lockedUntil: user.status === 'locked' ? hoursFrom(now.toISOString(), 24 + idx) : null,
            createdAt: new Date(user.createdAt), updatedAt: new Date(user.updatedAt),
        })),
    });
}

async function seedSessions() {
    await prisma.session.createMany({
        data: sessions.map((s) => ({
            id: s.id, userId: s.userId, refreshToken: `seed-rt-${s.id}`,
            ipAddress: s.ipAddress,
            deviceInfo: JSON.stringify({ userEmail: s.userEmail, userAgent: s.userAgent, browser: s.browser, os: s.os, device: s.device, isCurrent: s.isCurrent, lastActiveAt: s.lastActiveAt }),
            createdAt: new Date(s.createdAt), expiresAt: new Date(s.expiresAt),
        })),
    });
}

async function seedAuditLogs() {
    await prisma.auditLog.createMany({ data: auditLogs.map(toPrismaAuditData) });
    await prisma.auditLog.createMany({ data: generateAlertLogs() });
    const dailyLogs = generateDailyLogs();
    await prisma.auditLog.createMany({ data: dailyLogs });
    return { dailyLogs };
}

async function seedDatabase() {
    console.log('Starting production-style IAM seed...');
    await seedOrganization();
    const passwordHash = await bcrypt.hash(SEED_USER_PASSWORD, 12);
    await prisma.rolePolicy.deleteMany();
    await prisma.groupRole.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.userGroup.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.session.deleteMany();
    await prisma.oAuthAccount.deleteMany();
    await prisma.policy.deleteMany();
    await prisma.group.deleteMany();
    await prisma.role.deleteMany();
    await prisma.user.deleteMany();
    const joinRows = await seedRoles();
    await seedUsers(passwordHash);
    await seedSessions();
    const { dailyLogs } = await seedAuditLogs();
    const alertLogs = [];
    const summary = {
        users: users.length, roles: roleSeeds.length, policies: policies.length,
        groups: groups.length, auditLogs: auditLogs.length + alertLogs.length + dailyLogs.length,
        sessions: sessions.length, userRoles: joinRows.userRoleRows.length,
        rolePolicies: joinRows.rolePolicyRows.length, userGroups: joinRows.userGroupRows.length,
        groupRoles: joinRows.groupRoleRows.length,
    };
    console.log('Production seed completed successfully.');
    console.table(summary);
}

async function main() {
    try {
        await seedDatabase();
    } catch (error) {
        console.error('Seed failed:', error);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    users,
    roles: roleSeeds,
    policies,
    groups,
    auditLogs,
    sessions,
    default: { users, roles: roleSeeds, policies, groups, auditLogs, sessions },
    seedDatabase,
};
