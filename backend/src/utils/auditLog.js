const prisma = require('../config/database');
const logger = require('./logger');
const { createNotificationFromAudit } = require('./notifications');
const { recordAuditMetrics, recordAuditWriteFailure } = require('./metrics');

const USER_INCLUDE = {
    user: {
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
        },
    },
};

const LEGACY_ACTION_DEFAULTS = {
    REGISTER: { category: 'AUTHENTICATION', resource: 'auth/register', result: 'SUCCESS' },
    LOGIN: { category: 'AUTHENTICATION', resource: 'auth/login', result: 'SUCCESS' },
    LOGIN_FAILED: { category: 'AUTHENTICATION', resource: 'auth/login', result: 'FAILURE' },
    LOGIN_MFA_FAILED: { category: 'AUTHENTICATION', resource: 'auth/login', result: 'FAILURE' },
    LOGOUT: { category: 'AUTHENTICATION', resource: 'auth/logout', result: 'SUCCESS' },
    TOKEN_REFRESHED: { category: 'SESSION_MANAGEMENT', resource: 'auth/refresh-token', result: 'SUCCESS' },
    EMAIL_VERIFIED: { category: 'AUTHENTICATION', resource: 'auth/verify-email', result: 'SUCCESS' },
    PASSWORD_RESET_REQUESTED: { category: 'AUTHENTICATION', resource: 'auth/forgot-password', result: 'SUCCESS' },
    PASSWORD_RESET: { category: 'AUTHENTICATION', resource: 'auth/reset-password', result: 'SUCCESS' },
    OAUTH_LOGIN: { category: 'AUTHENTICATION', resource: 'auth/oauth', result: 'SUCCESS' },
    ACCOUNT_LOCKED: { category: 'SECURITY', resource: 'users/security', result: 'BLOCKED' },
    SUSPICIOUS_ACTIVITY: { category: 'SECURITY', resource: 'security/monitor', result: 'BLOCKED' },
    RATE_LIMIT_EXCEEDED: { category: 'SECURITY', resource: 'security/rate-limit', result: 'BLOCKED' },
    UNAUTHORIZED_ACCESS: { category: 'AUTHORIZATION', resource: 'authorization', result: 'BLOCKED' },
    MFA_ENABLED: { category: 'MFA', resource: 'auth/mfa', result: 'SUCCESS' },
    MFA_DISABLED: { category: 'MFA', resource: 'auth/mfa', result: 'SUCCESS' },
    MFA_BACKUP_CODE_USED: { category: 'MFA', resource: 'auth/mfa/backup', result: 'SUCCESS' },
    MFA_SETUP_INITIATED: { category: 'MFA', resource: 'auth/mfa/setup', result: 'SUCCESS' },
    SESSION_REVOKED: { category: 'SESSION_MANAGEMENT', resource: 'sessions', result: 'SUCCESS' },
    ALL_SESSIONS_REVOKED: { category: 'SESSION_MANAGEMENT', resource: 'sessions', result: 'SUCCESS' },
    ROLE_CREATED: { category: 'ROLE_MANAGEMENT', resource: 'roles', result: 'SUCCESS' },
    ROLE_UPDATED: { category: 'ROLE_MANAGEMENT', resource: 'roles', result: 'SUCCESS' },
    ROLE_DELETED: { category: 'ROLE_MANAGEMENT', resource: 'roles', result: 'SUCCESS' },
    ROLE_ASSIGNED: { category: 'ROLE_MANAGEMENT', resource: 'users/roles', result: 'SUCCESS' },
    ROLE_REMOVED: { category: 'ROLE_MANAGEMENT', resource: 'users/roles', result: 'SUCCESS' },
    POLICY_CREATED: { category: 'POLICY_MANAGEMENT', resource: 'policies', result: 'SUCCESS' },
    POLICY_UPDATED: { category: 'POLICY_MANAGEMENT', resource: 'policies', result: 'SUCCESS' },
    POLICY_DELETED: { category: 'POLICY_MANAGEMENT', resource: 'policies', result: 'SUCCESS' },
    POLICY_ATTACHED: { category: 'POLICY_MANAGEMENT', resource: 'roles/policies', result: 'SUCCESS' },
    POLICY_DETACHED: { category: 'POLICY_MANAGEMENT', resource: 'roles/policies', result: 'SUCCESS' },
    POLICY_SIMULATED: { category: 'POLICY_MANAGEMENT', resource: 'policies/simulate', result: 'SUCCESS' },
    GROUP_CREATED: { category: 'GROUP_MANAGEMENT', resource: 'groups', result: 'SUCCESS' },
    GROUP_UPDATED: { category: 'GROUP_MANAGEMENT', resource: 'groups', result: 'SUCCESS' },
    GROUP_DELETED: { category: 'GROUP_MANAGEMENT', resource: 'groups', result: 'SUCCESS' },
    GROUP_MEMBER_ADDED: { category: 'GROUP_MANAGEMENT', resource: 'groups/members', result: 'SUCCESS' },
    GROUP_MEMBER_REMOVED: { category: 'GROUP_MANAGEMENT', resource: 'groups/members', result: 'SUCCESS' },
    GROUP_ROLE_ATTACHED: { category: 'GROUP_MANAGEMENT', resource: 'groups/roles', result: 'SUCCESS' },
    GROUP_ROLE_DETACHED: { category: 'GROUP_MANAGEMENT', resource: 'groups/roles', result: 'SUCCESS' },
    BULK_STATUS_CHANGE: { category: 'USER_MANAGEMENT', resource: 'users/bulk/status', result: 'SUCCESS' },
    BULK_ROLE_ASSIGN: { category: 'ROLE_MANAGEMENT', resource: 'users/bulk/roles', result: 'SUCCESS' },
    BULK_GROUP_ASSIGN: { category: 'GROUP_MANAGEMENT', resource: 'users/bulk/groups', result: 'SUCCESS' },
    BULK_DELETE: { category: 'USER_MANAGEMENT', resource: 'users/bulk/delete', result: 'SUCCESS' },
    BULK_EXPORT: { category: 'DATA_ACCESS', resource: 'users/bulk/export', result: 'SUCCESS' },
    ROLE_CREATED_FROM_TEMPLATE: { category: 'ROLE_MANAGEMENT', resource: 'roles/templates', result: 'SUCCESS' },
    PERMISSION_CHECKED: { category: 'AUTHORIZATION', resource: 'authorization', result: 'SUCCESS' },
    PERMISSION_DENIED: { category: 'AUTHORIZATION', resource: 'authorization', result: 'BLOCKED' },
    AUDIT_LOGS_CLEANED: { category: 'SYSTEM', resource: 'audit-logs', result: 'SUCCESS' },
    AUDIT_CLEANUP_COMPLETED: { category: 'SYSTEM', resource: 'audit-logs', result: 'SUCCESS' },
};

const sseClients = new Set();

function addSSEClient(client) {
    sseClients.add(client);
}

function removeSSEClient(client) {
    sseClients.delete(client);
}

function broadcastToSSE(entry) {
    sseClients.forEach((client) => {
        try {
            client.res.write(`data: ${JSON.stringify(entry)}\n\n`);
        } catch {
            sseClients.delete(client);
        }
    });
}

function getRequestIp(req) {
    if (!req) {
        return null;
    }

    const forwardedFor = req.headers?.['x-forwarded-for'];
    if (forwardedFor) {
        return String(forwardedFor).split(',')[0].trim();
    }

    return req.ip || req.socket?.remoteAddress || null;
}

function normalizeResult(result) {
    if (['SUCCESS', 'FAILURE', 'ERROR', 'BLOCKED'].includes(result)) {
        return result;
    }

    if (result === 'FAIL') {
        return 'FAILURE';
    }

    return null;
}

async function audit({
    userId = null,
    sessionId = null,
    action,
    category = 'SYSTEM',
    resource = null,
    resourceId = null,
    ipAddress = null,
    userAgent = null,
    country = null,
    city = null,
    result = 'SUCCESS',
    duration = null,
    errorCode = null,
    metadata = null,
    req = null,
}) {
    try {
        if (!action) {
            logger.warn('Audit log skipped because action was missing');
            return null;
        }

        if (req) {
            ipAddress = ipAddress || getRequestIp(req);
            userAgent = userAgent || req.headers?.['user-agent'] || null;
            userId = userId || req.user?.id || null;
            sessionId = sessionId || req.user?.sessionId || null;
        }

        const entry = await prisma.auditLog.create({
            data: {
                userId,
                sessionId,
                action,
                category,
                resource,
                resourceId,
                ipAddress,
                userAgent,
                country,
                city,
                result,
                duration,
                errorCode,
                metadata,
            },
            include: USER_INCLUDE,
        });

        logger.info('AUDIT', {
            auditId: entry.id,
            userId,
            sessionId,
            action,
            category,
            resource,
            resourceId,
            result,
            ipAddress,
            errorCode,
        });

        await createNotificationFromAudit(entry);
        broadcastToSSE(entry);
        recordAuditMetrics({
            action,
            category,
            result,
            metadata,
        });

        return entry;
    } catch (error) {
        recordAuditWriteFailure(category);
        logger.error('Audit log write failed', {
            action,
            category,
            error: error.message,
        });
        return null;
    }
}

const auditAuth = {
    registered: (req, userId) => audit({
        req,
        userId,
        action: 'REGISTER',
        category: 'AUTHENTICATION',
        resource: 'auth/register',
        resourceId: userId,
        result: 'SUCCESS',
        metadata: { email: req.body?.email || null },
    }),

    loginSuccess: (req, userId, sessionId) => audit({
        req,
        userId,
        sessionId,
        action: 'LOGIN',
        category: 'AUTHENTICATION',
        resource: 'auth/login',
        resourceId: sessionId,
        result: 'SUCCESS',
        metadata: {
            method: 'password',
            device: req.headers?.['user-agent'] || null,
        },
    }),

    loginFailed: (req, email, reason, errorCode) => audit({
        req,
        action: 'LOGIN_FAILED',
        category: 'AUTHENTICATION',
        resource: 'auth/login',
        result: 'FAILURE',
        errorCode,
        metadata: { email, reason },
    }),

    loginMFAFailed: (req, userId) => audit({
        req,
        userId,
        action: 'LOGIN_MFA_FAILED',
        category: 'AUTHENTICATION',
        resource: 'auth/login',
        resourceId: userId,
        result: 'FAILURE',
        errorCode: 'AUTH_005',
        metadata: { reason: 'Invalid MFA code' },
    }),

    logout: (req, userId, sessionId = null) => audit({
        req,
        userId,
        sessionId,
        action: 'LOGOUT',
        category: 'AUTHENTICATION',
        resource: 'auth/logout',
        resourceId: sessionId,
        result: 'SUCCESS',
    }),

    tokenRefreshed: (req, userId, sessionId = null) => audit({
        req,
        userId,
        sessionId,
        action: 'TOKEN_REFRESHED',
        category: 'SESSION_MANAGEMENT',
        resource: 'auth/refresh-token',
        resourceId: sessionId,
        result: 'SUCCESS',
    }),

    emailVerified: (req, userId) => audit({
        req,
        userId,
        action: 'EMAIL_VERIFIED',
        category: 'AUTHENTICATION',
        resource: 'auth/verify-email',
        resourceId: userId,
        result: 'SUCCESS',
    }),

    passwordResetRequested: (req, email) => audit({
        req,
        action: 'PASSWORD_RESET_REQUESTED',
        category: 'AUTHENTICATION',
        resource: 'auth/forgot-password',
        result: 'SUCCESS',
        metadata: { email },
    }),

    passwordReset: (req, userId) => audit({
        req,
        userId,
        action: 'PASSWORD_RESET',
        category: 'AUTHENTICATION',
        resource: 'auth/reset-password',
        resourceId: userId,
        result: 'SUCCESS',
    }),

    oauthLogin: (req, userId, provider, sessionId = null) => audit({
        req,
        userId,
        sessionId,
        action: 'OAUTH_LOGIN',
        category: 'AUTHENTICATION',
        resource: `auth/oauth/${provider}`,
        resourceId: sessionId,
        result: 'SUCCESS',
        metadata: { provider },
    }),
};

const auditSecurity = {
    accountLocked: (req, userId, email) => audit({
        req,
        userId,
        action: 'ACCOUNT_LOCKED',
        category: 'SECURITY',
        resource: 'users/security',
        resourceId: userId,
        result: 'BLOCKED',
        metadata: {
            email,
            reason: 'Too many failed login attempts',
        },
    }),

    suspiciousActivity: (req, userId, reason) => audit({
        req,
        userId,
        action: 'SUSPICIOUS_ACTIVITY',
        category: 'SECURITY',
        resource: 'security/monitor',
        result: 'BLOCKED',
        metadata: {
            reason,
            ip: getRequestIp(req),
        },
    }),

    rateLimitExceeded: (req, endpoint) => audit({
        req,
        action: 'RATE_LIMIT_EXCEEDED',
        category: 'SECURITY',
        resource: endpoint,
        result: 'BLOCKED',
        metadata: {
            endpoint,
            ip: getRequestIp(req),
        },
    }),

    unauthorizedAccess: (req, userId, action, resource) => audit({
        req,
        userId,
        action: 'UNAUTHORIZED_ACCESS',
        category: 'AUTHORIZATION',
        resource,
        result: 'BLOCKED',
        errorCode: 'RBAC_001',
        metadata: {
            attemptedAction: action,
            attemptedResource: resource,
        },
    }),
};

const auditMFA = {
    enabled: (req, userId) => audit({
        req,
        userId,
        action: 'MFA_ENABLED',
        category: 'MFA',
        resource: 'auth/mfa',
        resourceId: userId,
        result: 'SUCCESS',
    }),

    disabled: (req, userId) => audit({
        req,
        userId,
        action: 'MFA_DISABLED',
        category: 'MFA',
        resource: 'auth/mfa',
        resourceId: userId,
        result: 'SUCCESS',
    }),

    backupCodeUsed: (req, userId) => audit({
        req,
        userId,
        action: 'MFA_BACKUP_CODE_USED',
        category: 'MFA',
        resource: 'auth/mfa/backup',
        resourceId: userId,
        result: 'SUCCESS',
        metadata: { warning: 'Backup code consumed' },
    }),

    setupInitiated: (req, userId) => audit({
        req,
        userId,
        action: 'MFA_SETUP_INITIATED',
        category: 'MFA',
        resource: 'auth/mfa/setup',
        resourceId: userId,
        result: 'SUCCESS',
    }),
};

const auditSession = {
    revoked: (req, userId, revokedSessionId) => audit({
        req,
        userId,
        action: 'SESSION_REVOKED',
        category: 'SESSION_MANAGEMENT',
        resource: 'sessions',
        resourceId: revokedSessionId,
        result: 'SUCCESS',
        metadata: { revokedSessionId },
    }),

    allRevoked: (req, userId, reason) => audit({
        req,
        userId,
        action: 'ALL_SESSIONS_REVOKED',
        category: 'SESSION_MANAGEMENT',
        resource: 'sessions',
        resourceId: userId,
        result: 'SUCCESS',
        metadata: { reason },
    }),
};

const auditRole = {
    created: (req, roleId, roleName) => audit({
        req,
        action: 'ROLE_CREATED',
        category: 'ROLE_MANAGEMENT',
        resource: 'roles',
        resourceId: roleId,
        result: 'SUCCESS',
        metadata: { roleName },
    }),

    updated: (req, roleId, changes) => audit({
        req,
        action: 'ROLE_UPDATED',
        category: 'ROLE_MANAGEMENT',
        resource: 'roles',
        resourceId: roleId,
        result: 'SUCCESS',
        metadata: { changes },
    }),

    deleted: (req, roleId, roleName) => audit({
        req,
        action: 'ROLE_DELETED',
        category: 'ROLE_MANAGEMENT',
        resource: 'roles',
        resourceId: roleId,
        result: 'SUCCESS',
        metadata: { roleName },
    }),

    assigned: (req, roleId, targetUserId) => audit({
        req,
        action: 'ROLE_ASSIGNED',
        category: 'ROLE_MANAGEMENT',
        resource: 'users/roles',
        resourceId: targetUserId,
        result: 'SUCCESS',
        metadata: {
            roleId,
            assignedTo: targetUserId,
        },
    }),

    removed: (req, roleId, targetUserId) => audit({
        req,
        action: 'ROLE_REMOVED',
        category: 'ROLE_MANAGEMENT',
        resource: 'users/roles',
        resourceId: targetUserId,
        result: 'SUCCESS',
        metadata: {
            roleId,
            removedFrom: targetUserId,
        },
    }),
};

const auditPolicy = {
    created: (req, policyId, policyName) => audit({
        req,
        action: 'POLICY_CREATED',
        category: 'POLICY_MANAGEMENT',
        resource: 'policies',
        resourceId: policyId,
        result: 'SUCCESS',
        metadata: { policyName },
    }),

    updated: (req, policyId, changes) => audit({
        req,
        action: 'POLICY_UPDATED',
        category: 'POLICY_MANAGEMENT',
        resource: 'policies',
        resourceId: policyId,
        result: 'SUCCESS',
        metadata: { changes },
    }),

    deleted: (req, policyId, policyName) => audit({
        req,
        action: 'POLICY_DELETED',
        category: 'POLICY_MANAGEMENT',
        resource: 'policies',
        resourceId: policyId,
        result: 'SUCCESS',
        metadata: { policyName },
    }),

    attached: (req, policyId, roleId) => audit({
        req,
        action: 'POLICY_ATTACHED',
        category: 'POLICY_MANAGEMENT',
        resource: 'roles/policies',
        resourceId: roleId,
        result: 'SUCCESS',
        metadata: {
            policyId,
            attachedTo: roleId,
        },
    }),

    detached: (req, policyId, roleId) => audit({
        req,
        action: 'POLICY_DETACHED',
        category: 'POLICY_MANAGEMENT',
        resource: 'roles/policies',
        resourceId: roleId,
        result: 'SUCCESS',
        metadata: {
            policyId,
            detachedFrom: roleId,
        },
    }),

    simulated: (req, userId, action, resource, simResult) => audit({
        req,
        action: 'POLICY_SIMULATED',
        category: 'POLICY_MANAGEMENT',
        resource: 'policies/simulate',
        resourceId: userId,
        result: 'SUCCESS',
        metadata: {
            targetUserId: userId,
            simulatedAction: action,
            simulatedResource: resource,
            simulationResult: simResult,
        },
    }),
};

const auditGroup = {
    created: (req, groupId, groupName) => audit({
        req,
        action: 'GROUP_CREATED',
        category: 'GROUP_MANAGEMENT',
        resource: 'groups',
        resourceId: groupId,
        result: 'SUCCESS',
        metadata: { groupName },
    }),

    updated: (req, groupId, changes) => audit({
        req,
        action: 'GROUP_UPDATED',
        category: 'GROUP_MANAGEMENT',
        resource: 'groups',
        resourceId: groupId,
        result: 'SUCCESS',
        metadata: { changes },
    }),

    deleted: (req, groupId, groupName) => audit({
        req,
        action: 'GROUP_DELETED',
        category: 'GROUP_MANAGEMENT',
        resource: 'groups',
        resourceId: groupId,
        result: 'SUCCESS',
        metadata: { groupName },
    }),

    memberAdded: (req, groupId, memberId) => audit({
        req,
        action: 'GROUP_MEMBER_ADDED',
        category: 'GROUP_MANAGEMENT',
        resource: 'groups/members',
        resourceId: groupId,
        result: 'SUCCESS',
        metadata: {
            groupId,
            userId: memberId,
        },
    }),

    memberRemoved: (req, groupId, memberId) => audit({
        req,
        action: 'GROUP_MEMBER_REMOVED',
        category: 'GROUP_MANAGEMENT',
        resource: 'groups/members',
        resourceId: groupId,
        result: 'SUCCESS',
        metadata: {
            groupId,
            userId: memberId,
        },
    }),

    roleAttached: (req, groupId, roleId) => audit({
        req,
        action: 'GROUP_ROLE_ATTACHED',
        category: 'GROUP_MANAGEMENT',
        resource: 'groups/roles',
        resourceId: groupId,
        result: 'SUCCESS',
        metadata: {
            groupId,
            roleId,
        },
    }),

    roleDetached: (req, groupId, roleId) => audit({
        req,
        action: 'GROUP_ROLE_DETACHED',
        category: 'GROUP_MANAGEMENT',
        resource: 'groups/roles',
        resourceId: groupId,
        result: 'SUCCESS',
        metadata: {
            groupId,
            roleId,
        },
    }),
};

const auditPermission = {
    checked: (req, userId, action, resource, permissionResult) => {
        const resultDetails = typeof permissionResult === 'object' && permissionResult !== null
            ? permissionResult
            : { allowed: Boolean(permissionResult) };

        return audit({
            req,
            userId,
            action: 'PERMISSION_CHECKED',
            category: 'AUTHORIZATION',
            resource,
            result: resultDetails.allowed ? 'SUCCESS' : 'BLOCKED',
            metadata: {
                checkedAction: action,
                checkedResource: resource,
                allowed: Boolean(resultDetails.allowed),
                reason: resultDetails.reason || null,
                deniedBy: resultDetails.deniedBy?.name || null,
                matchedPolicies: Array.isArray(resultDetails.matchedPolicies)
                    ? resultDetails.matchedPolicies.map((policy) => policy.name || policy.id)
                    : [],
            },
        });
    },

    denied: (req, userId, action, resource, permissionResult = null) => audit({
        req,
        userId,
        action: 'PERMISSION_DENIED',
        category: 'AUTHORIZATION',
        resource,
        result: 'BLOCKED',
        errorCode: 'RBAC_001',
        metadata: {
            deniedAction: action,
            deniedResource: resource,
            reason: permissionResult?.reason || null,
            deniedBy: permissionResult?.deniedBy?.name || null,
        },
    }),
};

async function createAuditLog({
    userId = null,
    sessionId = null,
    action,
    category = null,
    resource = null,
    resourceId = null,
    ipAddress = null,
    userAgent = null,
    result = null,
    errorCode = null,
    metadata = null,
    req = null,
}) {
    const defaults = LEGACY_ACTION_DEFAULTS[action] || {};
    const normalizedResult = normalizeResult(result);

    return audit({
        userId,
        sessionId,
        action,
        category: category || defaults.category || 'SYSTEM',
        resource: resource || defaults.resource || null,
        resourceId,
        ipAddress,
        userAgent,
        result: normalizedResult || defaults.result || 'SUCCESS',
        errorCode,
        metadata,
        req,
    });
}

const auditUser = {
    created: (req, userId, email) => audit({
        req,
        action: 'USER_CREATED',
        category: 'USER_MANAGEMENT',
        resource: 'users',
        resourceId: userId,
        result: 'SUCCESS',
        metadata: { email, createdBy: req.user?.id }
    }),

    statusChanged: (req, userId, email, from, to) => audit({
        req,
        action: 'USER_STATUS_CHANGED',
        category: 'USER_MANAGEMENT',
        resource: 'users/status',
        resourceId: userId,
        result: 'SUCCESS',
        metadata: { targetEmail: email, previousStatus: from, newStatus: to }
    }),

    emailVerified: (req, userId, email) => audit({
        req,
        action: 'EMAIL_MANUALLY_VERIFIED',
        category: 'USER_MANAGEMENT',
        resource: 'users/verify-email',
        resourceId: userId,
        result: 'SUCCESS',
        metadata: { targetEmail: email, verifiedBy: req.user?.id }
    }),

    deleted: (req, userId, email) => audit({
        req,
        action: 'USER_DELETED',
        category: 'USER_MANAGEMENT',
        resource: 'users',
        resourceId: userId,
        result: 'SUCCESS',
        metadata: { deletedEmail: email, deletedBy: req.user?.id }
    }),

    sessionsRevoked: (req, userId, email, count) => audit({
        req,
        action: 'ALL_SESSIONS_REVOKED',
        category: 'SESSION_MANAGEMENT',
        resource: 'users/sessions',
        resourceId: userId,
        result: 'SUCCESS',
        metadata: { targetEmail: email, sessionsRevoked: count, revokedBy: req.user?.id }
    }),
};

module.exports = {
    audit,
    createAuditLog,
    auditAuth,
    auditSecurity,
    auditMFA,
    auditSession,
    auditRole,
    auditPolicy,
    auditGroup,
    auditPermission,
    auditUser,
    addSSEClient,
    removeSSEClient,
    sseClients,
};
