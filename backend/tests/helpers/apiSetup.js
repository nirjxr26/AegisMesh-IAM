'use strict';

const request = require('supertest');

// ═══════════════════════════════════════
// 1. MOCKS (Must be defined before app)
// ═══════════════════════════════════════

// Mock Prisma
jest.mock('../../src/config/database', () => {
    const mockModel = {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        delete: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
    };

    return {
        user: { ...mockModel },
        session: { ...mockModel },
        group: { ...mockModel },
        role: { ...mockModel },
        policy: { ...mockModel },
        revokedToken: { ...mockModel },
        auditLog: { ...mockModel },
        organizationSettings: { ...mockModel },
        userGroup: { ...mockModel },
        userRole: { ...mockModel },
        groupRole: { ...mockModel },
        rolePolicy: { ...mockModel },
        notificationLog: { ...mockModel },
        oAuthAccount: { ...mockModel },
        apiToken: { ...mockModel },
        $extends: jest.fn().mockReturnThis(),
        $on: jest.fn(),
        $transaction: jest.fn((cb) => cb(this)),
        $connect: jest.fn().mockResolvedValue(),
        $disconnect: jest.fn().mockResolvedValue(),
    };
});

// Mock CSRF
jest.mock('csrf-csrf', () => ({
    doubleCsrf: jest.fn().mockReturnValue({
        generateCsrfToken: jest.fn().mockReturnValue('mock-csrf-token'),
        doubleCsrfProtection: jest.fn((req, res, next) => next()),
    }),
}));

// Mock cron and cleanup
jest.mock('node-cron', () => ({
    schedule: jest.fn(),
}));

jest.mock('../../src/utils/auditCleanup', () => ({
    scheduleCleanup: jest.fn(),
    runCleanup: jest.fn(),
}));

// Mock Metrics
jest.mock('../../src/utils/metrics', () => ({
    metricsHandler: jest.fn((req, res) => res.send('')),
    metricsMiddleware: jest.fn((req, res, next) => next()),
    observeDatabaseQuery: jest.fn(),
    recordAuditMetrics: jest.fn(),
    recordAuditWriteFailure: jest.fn(),
}));

// Mock Rate Limiters
jest.mock('../../src/middleware/rateLimiter', () => ({
    loginLimiter: jest.fn((req, res, next) => next()),
    registerLimiter: jest.fn((req, res, next) => next()),
    generalLimiter: jest.fn((req, res, next) => next()),
    passwordResetLimiter: jest.fn((req, res, next) => next()),
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
    compare: jest.fn().mockResolvedValue(true),
    hash: jest.fn().mockResolvedValue('mocked-hash'),
}));

// Mock Audit Log
jest.mock('../../src/utils/auditLog', () => ({
    audit: jest.fn().mockResolvedValue({}),
    createAuditLog: jest.fn().mockResolvedValue({}),
    auditAuth: {
        registered: jest.fn(), loginSuccess: jest.fn(), loginFailed: jest.fn(),
        loginMFAFailed: jest.fn(), logout: jest.fn(), tokenRefreshed: jest.fn(),
        emailVerified: jest.fn(), passwordResetRequested: jest.fn(), passwordReset: jest.fn(),
        oauthLogin: jest.fn()
    },
    auditSecurity: {
        accountLocked: jest.fn(), suspiciousActivity: jest.fn(),
        rateLimitExceeded: jest.fn(), unauthorizedAccess: jest.fn()
    },
    auditMFA: { enabled: jest.fn(), disabled: jest.fn(), backupCodeUsed: jest.fn(), setupInitiated: jest.fn() },
    auditSession: { revoked: jest.fn(), allRevoked: jest.fn() },
    auditRole: { created: jest.fn(), updated: jest.fn(), deleted: jest.fn(), assigned: jest.fn(), removed: jest.fn() },
    auditPolicy: { created: jest.fn(), updated: jest.fn(), deleted: jest.fn(), attached: jest.fn(), detached: jest.fn(), simulated: jest.fn() },
    auditGroup: { created: jest.fn(), updated: jest.fn(), deleted: jest.fn(), memberAdded: jest.fn(), memberRemoved: jest.fn(), roleAttached: jest.fn(), roleDetached: jest.fn() },
    auditPermission: { checked: jest.fn(), denied: jest.fn() },
    auditUser: { created: jest.fn(), statusChanged: jest.fn(), emailVerified: jest.fn(), deleted: jest.fn(), sessionsRevoked: jest.fn() },
    addSSEClient: jest.fn(),
    removeSSEClient: jest.fn(),
    sseClients: new Set()
}));

// Mock Redis Config
jest.mock('../../src/config/redis', () => ({
    status: 'ready',
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    incr: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
}));

// Mock Risk Engine
jest.mock('../../src/utils/riskEngine', () => ({
    getRiskScore: jest.fn().mockResolvedValue({ is_anomaly: false, risk_score: 0.1 }),
}));

// Mock Token Service
jest.mock('../../src/services/token.service', () => ({
    verifyAccessToken: jest.fn().mockReturnValue({}),
    generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
    generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
    verifyRefreshToken: jest.fn().mockReturnValue({}),
    isTokenBlacklisted: jest.fn().mockResolvedValue(false),
    createSession: jest.fn().mockResolvedValue({ id: 'mock-session-id' }),
    findSessionByToken: jest.fn().mockResolvedValue({ id: 'mock-session-id', user: {} }),
    deleteSession: jest.fn().mockResolvedValue(true),
    rotateRefreshToken: jest.fn().mockResolvedValue({ refreshToken: 'new-refresh', session: { id: 'new-sess' } }),
    getUserSessions: jest.fn().mockResolvedValue([]),
    revokeSession: jest.fn().mockResolvedValue({}),
}));

// Mock Email Service
jest.mock('../../src/services/email.service', () => ({
    sendVerificationEmail: jest.fn().mockResolvedValue({}),
    sendPasswordResetEmail: jest.fn().mockResolvedValue({}),
    sendMFACodeEmail: jest.fn().mockResolvedValue({}),
}));

// ═══════════════════════════════════════
// 2. SETUP
// ═══════════════════════════════════════

const app = require('../../src/app');
const prisma = require('../../src/config/database');
const tokenService = require('../../src/services/token.service');

const authenticatedRequest = (method, path, user = null) => {
    const req = request(app)[method](path);
    
    if (user) {
        tokenService.verifyAccessToken.mockReturnValue({ 
            sub: user.id, 
            email: user.email,
            type: 'access',
            jti: 'mock-jti'
        });
        
        prisma.user.findUnique.mockResolvedValue({
            ...user,
            userRoles: user.userRoles || []
        });
        
        req.set('Authorization', 'Bearer mock-token');
    }
    
    return req;
};

module.exports = {
    app,
    request: request(app),
    authenticatedRequest,
    prisma,
    tokenService,
};
