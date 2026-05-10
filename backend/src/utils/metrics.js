const client = require('prom-client');

const register = new client.Registry();

client.collectDefaultMetrics({
    register,
    prefix: 'aegismesh_',
});

const httpRequestDuration = new client.Histogram({
    name: 'aegismesh_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

const httpRequestTotal = new client.Counter({
    name: 'aegismesh_http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
});

const authEventsTotal = new client.Counter({
    name: 'aegismesh_auth_events_total',
    help: 'Authentication and session lifecycle events',
    labelNames: ['action', 'result', 'method'],
});

const securityEventsTotal = new client.Counter({
    name: 'aegismesh_security_events_total',
    help: 'Security-sensitive events emitted by the IAM platform',
    labelNames: ['action', 'result', 'severity'],
});

const mfaEventsTotal = new client.Counter({
    name: 'aegismesh_mfa_events_total',
    help: 'MFA enrollment and challenge events',
    labelNames: ['action', 'result'],
});

const permissionEventsTotal = new client.Counter({
    name: 'aegismesh_permission_events_total',
    help: 'Authorization checks and permission denials',
    labelNames: ['action', 'result'],
});

const sessionEventsTotal = new client.Counter({
    name: 'aegismesh_session_events_total',
    help: 'Session refresh and revocation events',
    labelNames: ['action', 'result'],
});

const apiKeyEventsTotal = new client.Counter({
    name: 'aegismesh_api_key_events_total',
    help: 'API key lifecycle and usage events',
    labelNames: ['action', 'result'],
});

const auditLogWritesTotal = new client.Counter({
    name: 'aegismesh_audit_log_writes_total',
    help: 'Audit log write attempts by result and category',
    labelNames: ['result', 'category'],
});

const databaseQueryDuration = new client.Histogram({
    name: 'aegismesh_database_query_duration_seconds',
    help: 'Prisma database query duration in seconds',
    labelNames: ['model', 'operation'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

const activeSessions = new client.Gauge({
    name: 'aegismesh_active_sessions',
    help: 'Current number of non-expired sessions',
    async collect() {
        try {
            const prisma = require('../config/database');
            const count = await prisma.session.count({
                where: {
                    expiresAt: {
                        gt: new Date(),
                    },
                },
            });
            this.set(count);
        } catch {
            this.set(0);
        }
    },
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(authEventsTotal);
register.registerMetric(securityEventsTotal);
register.registerMetric(mfaEventsTotal);
register.registerMetric(permissionEventsTotal);
register.registerMetric(sessionEventsTotal);
register.registerMetric(apiKeyEventsTotal);
register.registerMetric(auditLogWritesTotal);
register.registerMetric(databaseQueryDuration);
register.registerMetric(activeSessions);

const ACTION_ALIASES = {
    REGISTER: 'register',
    LOGIN: 'login',
    LOGIN_FAILED: 'login',
    LOGIN_MFA_FAILED: 'login_mfa',
    LOGOUT: 'logout',
    TOKEN_REFRESHED: 'token_refresh',
    EMAIL_VERIFIED: 'email_verify',
    PASSWORD_RESET_REQUESTED: 'password_reset_requested',
    PASSWORD_RESET: 'password_reset',
    OAUTH_LOGIN: 'oauth_login',
    ACCOUNT_LOCKED: 'account_locked',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
    RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
    UNAUTHORIZED_ACCESS: 'unauthorized_access',
    MFA_ENABLED: 'mfa_enabled',
    MFA_DISABLED: 'mfa_disabled',
    MFA_BACKUP_CODE_USED: 'mfa_backup_code_used',
    MFA_SETUP_INITIATED: 'mfa_setup_initiated',
    SESSION_REVOKED: 'session_revoked',
    ALL_SESSIONS_REVOKED: 'all_sessions_revoked',
    PERMISSION_CHECKED: 'permission_checked',
    PERMISSION_DENIED: 'permission_denied',
    API_KEY_CREATED: 'api_key_created',
    API_KEY_REVOKED: 'api_key_revoked',
    API_KEY_USED: 'api_key_used',
    API_KEY_DENIED: 'api_key_denied',
    API_KEY_EXPIRED: 'api_key_expired',
};

function normalizeAction(action) {
    return ACTION_ALIASES[action] || String(action || 'unknown').toLowerCase();
}

function normalizeResult(result) {
    return String(result || 'unknown').toLowerCase();
}

function getAuthMethod(action, metadata) {
    if (action === 'OAUTH_LOGIN') {
        return metadata?.provider || 'oauth';
    }

    if (action === 'LOGIN' || action === 'LOGIN_FAILED' || action === 'LOGIN_MFA_FAILED') {
        return metadata?.method || 'password';
    }

    return 'default';
}

function getSeverity(action, result) {
    if (['ACCOUNT_LOCKED', 'SUSPICIOUS_ACTIVITY', 'RATE_LIMIT_EXCEEDED'].includes(action)) {
        return 'high';
    }

    if (['UNAUTHORIZED_ACCESS', 'PERMISSION_DENIED'].includes(action)) {
        return 'medium';
    }

    if (['BLOCKED', 'ERROR'].includes(result)) {
        return 'medium';
    }

    return 'info';
}

function recordAuditMetrics({ action, category, result, metadata }) {
    const normalizedAction = normalizeAction(action);
    const normalizedResult = normalizeResult(result);

    auditLogWritesTotal.inc({
        result: 'success',
        category: category || 'SYSTEM',
    });

    if (category === 'AUTHENTICATION') {
        authEventsTotal.inc({
            action: normalizedAction,
            result: normalizedResult,
            method: getAuthMethod(action, metadata),
        });
    }

    if (category === 'SECURITY') {
        securityEventsTotal.inc({
            action: normalizedAction,
            result: normalizedResult,
            severity: getSeverity(action, result),
        });
    }

    if (category === 'MFA') {
        mfaEventsTotal.inc({
            action: normalizedAction,
            result: normalizedResult,
        });
    }

    if (category === 'AUTHORIZATION') {
        permissionEventsTotal.inc({
            action: normalizedAction,
            result: normalizedResult,
        });

        if (result === 'BLOCKED') {
            securityEventsTotal.inc({
                action: normalizedAction,
                result: normalizedResult,
                severity: getSeverity(action, result),
            });
        }
    }

    if (category === 'SESSION_MANAGEMENT') {
        sessionEventsTotal.inc({
            action: normalizedAction,
            result: normalizedResult,
        });
    }

    if (['API_KEY_CREATED', 'API_KEY_REVOKED'].includes(action)) {
        apiKeyEventsTotal.inc({
            action: normalizedAction,
            result: normalizedResult,
        });
    }
}

function recordAuditWriteFailure(category = 'SYSTEM') {
    auditLogWritesTotal.inc({
        result: 'failure',
        category,
    });
}

function recordApiKeyEvent(action, result = 'SUCCESS') {
    apiKeyEventsTotal.inc({
        action: normalizeAction(action),
        result: normalizeResult(result),
    });
}

function observeDatabaseQuery(model, operation, durationSeconds) {
    databaseQueryDuration.observe({
        model: model || 'raw',
        operation: operation || 'unknown',
    }, durationSeconds);
}

function normalizeRoute(req) {
    if (req.route?.path) {
        const baseUrl = req.baseUrl || '';
        return `${baseUrl}${req.route.path}`;
    }

    return req.path
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, ':id')
        .replace(/\/\d+/g, '/:id');
}

function metricsMiddleware(req, res, next) {
    if (req.path === '/metrics') {
        return next();
    }

    const endTimer = httpRequestDuration.startTimer();

    res.on('finish', () => {
        const labels = {
            method: req.method,
            route: normalizeRoute(req),
            status_code: String(res.statusCode),
        };

        httpRequestTotal.inc(labels);
        endTimer(labels);
    });

    return next();
}

async function metricsHandler(req, res, next) {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        next(error);
    }
}

module.exports = {
    metricsHandler,
    metricsMiddleware,
    observeDatabaseQuery,
    recordApiKeyEvent,
    recordAuditMetrics,
    recordAuditWriteFailure,
    register,
};
