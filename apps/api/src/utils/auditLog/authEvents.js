const { audit } = require('./_core');

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
            ip: require('./_core').getRequestIp(req),
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
            ip: require('./_core').getRequestIp(req),
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

module.exports = {
    auditAuth,
    auditSecurity,
    auditMFA,
    auditSession,
};
