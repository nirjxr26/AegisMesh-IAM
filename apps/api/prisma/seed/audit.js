const { randomInt } = require('node:crypto');
const {
    uuidv4,
    IP_POOL,
    USER_AGENTS,
    COUNTRY_CITY,
    hoursAgo,
    toIso,
    now,
    toPrismaAuditCategory,
    toPrismaAuditResult,
    actionPlan,
    roleSeeds,
} = require('./data');
const { users, sessions } = require('./users');
const { policies, groups } = require('./roles');

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

        if (entry.action.startsWith('USER_')) {
            targetType = 'user';
            targetId = users[(auditIdx + i + 3) % users.length].id;
            resource = `/api/users/${targetId}`;
        } else if (entry.action.startsWith('ROLE_')) {
            targetType = 'role';
            targetId = role.id;
            resource = `/api/roles/${targetId}`;
        } else if (entry.action.startsWith('POLICY_')) {
            targetType = 'policy';
            targetId = policy.id;
            resource = `/api/policies/${targetId}`;
        } else if (entry.action.startsWith('GROUP_')) {
            targetType = 'group';
            targetId = group.id;
            resource = `/api/groups/${targetId}`;
        } else if (entry.action.startsWith('SESSION_')) {
            targetType = 'session';
            targetId = session.id;
            resource = `/api/sessions/${targetId}`;
        } else if (entry.action === 'PERMISSION_CHECKED') {
            targetType = 'policy';
            targetId = policy.id;
            resource = `arn:aws:iam::987654321098:policy/${policy.name}`;
        }

        auditLogs.push({
            id: uuidv4(),
            action: entry.action,
            category: entry.category,
            actorId: actor.id,
            actorEmail: actor.email,
            targetId,
            targetType,
            resource,
            result: entry.results[i],
            ipAddress: IP_POOL[(auditIdx + i) % IP_POOL.length],
            userAgent: USER_AGENTS[(auditIdx + i) % USER_AGENTS.length],
            metadata: {
                traceId: uuidv4(),
                requestPath: resource,
                actorRole: role.name,
                correlationKey: `evt-${(auditIdx + i + 1).toString().padStart(3, '0')}`,
            },
            createdAt: toIso(hoursAgo(((auditIdx * 3 + i * 2) % (10 * 24)) + 1)),
            country: region.country,
            city: region.city,
        });
    }
    auditIdx += entry.results.length;
}

const toPrismaAuditData = (log) => ({
    id: log.id,
    userId: log.actorId,
    sessionId: log.targetType === 'session' ? log.targetId : null,
    action: log.action,
    category: toPrismaAuditCategory(log.category),
    resource: log.resource,
    resourceId: log.targetId,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    country: log.country,
    city: log.city,
    result: toPrismaAuditResult(log.result),
    duration: 30 + randomInt(0, 300),
    errorCode: log.result === 'failure'
        ? 'AUTH_INVALID_CREDENTIALS'
        : null,
    metadata: {
        ...log.metadata,
        actorEmail: log.actorEmail,
        targetType: log.targetType,
    },
    createdAt: new Date(log.createdAt),
});

function generateAlertLogs() {
    const alertLogs = [];
    const seedUser = users[0];
    const targetUser = users[1] || seedUser;

    for (let i = 0; i < 12; i++) {
        alertLogs.push({
            id: uuidv4(),
            userId: null,
            action: 'LOGIN_FAILED',
            category: 'AUTHENTICATION',
            resource: '/api/auth/login',
            result: 'FAILURE',
            ipAddress: '198.51.100.42',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            country: 'United States',
            city: 'New York',
            createdAt: new Date(now.getTime() - i * 60 * 1000),
            duration: 45,
            errorCode: 'AUTH_INVALID_CREDENTIALS',
        });
    }

    alertLogs.push({
        id: uuidv4(),
        userId: targetUser.id,
        action: 'ACCOUNT_LOCKED',
        category: 'AUTHENTICATION',
        resource: `/api/users/${targetUser.id}`,
        result: 'FAILURE',
        ipAddress: '198.51.100.42',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        country: 'United States',
        city: 'New York',
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        duration: 20,
    });

    const abuseUser = users[2] || seedUser;
    for (let i = 0; i < 7; i++) {
        alertLogs.push({
            id: uuidv4(),
            userId: abuseUser.id,
            action: 'PERMISSION_DENIED',
            category: 'AUTHORIZATION',
            resource: '/api/settings',
            result: 'BLOCKED',
            ipAddress: '203.0.113.15',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            country: 'Canada',
            city: 'Toronto',
            createdAt: new Date(now.getTime() - i * 2 * 60 * 1000),
            duration: 15,
            errorCode: 'RBAC_001',
        });
    }

    for (let i = 0; i < 15; i++) {
        alertLogs.push({
            id: uuidv4(),
            userId: null,
            action: 'RATE_LIMIT_EXCEEDED',
            category: 'SYSTEM',
            resource: '/api/auth/login',
            result: 'BLOCKED',
            ipAddress: '203.0.113.88',
            userAgent: 'curl/8.19.0',
            country: 'Ukraine',
            city: 'Kyiv',
            createdAt: new Date(now.getTime() - i * 30 * 60 * 1000),
            duration: 5,
        });
    }

    return alertLogs;
}

function generateDailyLogs() {
    const dailyLogs = [];
    const ACTIONS = [
        { action: 'LOGIN', category: 'Authentication', result: 'success' },
        { action: 'LOGOUT', category: 'Authentication', result: 'success' },
        { action: 'PERMISSION_CHECKED', category: 'Authorization', result: 'success' },
        { action: 'USER_UPDATED', category: 'UserMgmt', result: 'success' },
        { action: 'GROUP_MEMBER_ADDED', category: 'GroupMgmt', result: 'success' },
    ];

    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
        const logsCount = 4 + randomInt(0, 2);
        for (let i = 0; i < logsCount; i++) {
            const actor = users[randomInt(0, users.length)];
            const actionInfo = ACTIONS[randomInt(0, ACTIONS.length)];
            const ip = IP_POOL[randomInt(0, IP_POOL.length)];
            const region = COUNTRY_CITY[randomInt(0, COUNTRY_CITY.length)];

            const logDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
            logDate.setHours(randomInt(0, 24), randomInt(0, 60), randomInt(0, 60));

            dailyLogs.push({
                id: uuidv4(),
                userId: actor.id,
                action: actionInfo.action,
                category: toPrismaAuditCategory(actionInfo.category),
                resource: actionInfo.action === 'PERMISSION_CHECKED' ? 'arn:aws:iam::987654321098:policy/ReadOnlyAccess' : '/api/system/health',
                result: toPrismaAuditResult(actionInfo.result),
                ipAddress: ip,
                userAgent: USER_AGENTS[randomInt(0, USER_AGENTS.length)],
                country: region.country,
                city: region.city,
                createdAt: logDate,
                duration: 30 + randomInt(0, 300),
            });
        }
    }

    return dailyLogs;
}

async function seedAuditLogs(prisma) {
    await prisma.auditLog.createMany({
        data: auditLogs.map(toPrismaAuditData),
    });

    const alertLogs = generateAlertLogs();
    await prisma.auditLog.createMany({ data: alertLogs });

    const dailyLogs = generateDailyLogs();
    await prisma.auditLog.createMany({ data: dailyLogs });

    return { auditLogs, alertLogs, dailyLogs };
}

module.exports = { auditLogs, seedAuditLogs };
