require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const crypto = require('node:crypto');
const { doubleCsrf } = require('csrf-csrf');
const passport = require('passport');

const csrfSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

const {
    generateCsrfToken,
    doubleCsrfProtection,
} = doubleCsrf({
    getSecret: (_req) => csrfSecret,
    getSessionIdentifier: (req) => req.ip + (req.headers['user-agent'] || ''),
    cookieName: 'x-csrf-token',
    cookieOptions: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
    },
    getTokenFromRequest: (req) => req.headers['x-csrf-token'],
});
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const { initializePassport } = require('./config/passport');
const authRoutes = require('./routes/auth.routes');
const rolesRoutes = require('./routes/roles.routes');
const policiesRoutes = require('./routes/policies.routes');
const groupsRoutes = require('./routes/groups.routes');
const usersRoutes = require('./routes/users.routes');
const auditLogRoutes = require('./routes/auditLog.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const settingsRoutes = require('./routes/settings.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const logger = require('./utils/logger');
const { metricsHandler, metricsMiddleware } = require('./utils/metrics');
const { scheduleCleanup } = require('./utils/auditCleanup');
const path = require('node:path');

const app = express();

// Needed when running behind nginx reverse proxy in Docker.
app.set('trust proxy', 1);

// ═══════════════════════════════════════
// SECURITY MIDDLEWARE
// ═══════════════════════════════════════
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

// ═══════════════════════════════════════
// PARSING MIDDLEWARE
// ═══════════════════════════════════════
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(metricsMiddleware);

const csrfExemptPaths = new Set([
    '/api/health',
    '/api/csrf-token',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh-token',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/verify-email',
    '/api/auth/oauth/google',
    '/api/auth/oauth/google/callback',
    '/api/auth/oauth/github',
    '/api/auth/oauth/github/callback',
]);

app.use((req, res, next) => {
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    if (!isMutating || csrfExemptPaths.has(req.path)) {
        return next();
    }
    return doubleCsrfProtection(req, res, next);
});

// ═══════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════
app.use('/api/', (req, res, next) => {
    if (req.path === '/health') {
        return next();
    }
    return generalLimiter(req, res, next);
});

// ═══════════════════════════════════════
// PASSPORT
// ═══════════════════════════════════════
app.use(passport.initialize());
initializePassport();

// ═══════════════════════════════════════
// REQUEST LOGGING
// ═══════════════════════════════════════
app.use((req, res, next) => {
    // Sanitize user-controlled inputs before logging to prevent log injection
    const safeMethod = /^[A-Z]{1,10}$/.test(req.method) ? req.method : 'UNKNOWN';
    const safePath = req.path.replace(/[^\w\-/.]/g, '').substring(0, 200);
    const safeAgent = (req.headers['user-agent'] ?? '').replace(/[\r\n]/g, '').substring(0, 100);
    logger.info(`${safeMethod} ${safePath}`, {
        ip: req.ip,
        userAgent: safeAgent,
    });
    next();
});

// ═══════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
        },
    });
});

app.get('/metrics', metricsHandler);

app.get('/api/csrf-token', (req, res) => {
    res.json({
        success: true,
        data: {
            csrfToken: generateCsrfToken(req, res),
        },
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/policies', policiesRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// ═══════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
