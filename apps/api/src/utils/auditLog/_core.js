const prisma = require('../../config/database');
const logger = require('../logger');
const { createNotificationFromAudit } = require('../notifications');
const { recordAuditMetrics, recordAuditWriteFailure } = require('../metrics');

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

module.exports = {
    audit,
    createAuditLog,
    LEGACY_ACTION_DEFAULTS,
    USER_INCLUDE,
    sseClients,
    addSSEClient,
    removeSSEClient,
    broadcastToSSE,
    getRequestIp,
    normalizeResult,
};
