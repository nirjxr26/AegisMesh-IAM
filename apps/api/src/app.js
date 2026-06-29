require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { doubleCsrf } = require('csrf-csrf');
const passport = require('passport');

const csrfSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

function extractRequestToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    if (req.cookies?.accessToken) {
        const rawCookieToken = req.cookies.accessToken;
        try {
            const { decryptText } = require('./utils/crypto');
            return decryptText(rawCookieToken) || rawCookieToken;
        } catch {
            return rawCookieToken;
        }
    }
    return null;
}

const {
    generateCsrfToken,
    doubleCsrfProtection: baseDoubleCsrfProtection,
} = doubleCsrf({
    getSecret: (_req) => csrfSecret,
    getSessionIdentifier: (req) => {
        const token = extractRequestToken(req);
        if (token) {
            try {
                const payload = jwt.decode(token);
                if (payload?.sessionId) return `session:${payload.sessionId}`;
            } catch {
                // fall through to IP+UA fallback
            }
        }
        return req.ip + (req.headers['user-agent'] || '');
    },
    cookieName: 'x-csrf-token',
    cookieOptions: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
    },
    getTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

function doubleCsrfProtection(req, res, next) {
    baseDoubleCsrfProtection(req, res, (err) => {
        if (err) return next(err);
        generateCsrfToken(req, res);
        next();
    });
}
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
const { scheduleCleanup: _scheduleCleanup } = require('./utils/auditCleanup');
const path = require('node:path');

const app = express();

// Needed when running behind nginx reverse proxy in Docker.
app.set('trust proxy', 1);

// ═══════════════════════════════════════
// SECURITY MIDDLEWARE
// ═══════════════════════════════════════
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000'],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
}));

const ALLOWED_ORIGINS = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((s) => s.trim())
    : ['http://localhost:3000'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

// ═══════════════════════════════════════
// PARSING MIDDLEWARE
// ═══════════════════════════════════════
app.use(express.json({ limit: '1mb' }));
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

function isInternalIP(req) {
    const ip = req.ip || req.connection?.remoteAddress || '';
    const internalRanges = ['127.0.0.1', '::1', '::ffff:127.0.0.1', '10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '192.168.'];
    return internalRanges.some((range) => ip.startsWith(range));
}

app.get('/metrics', (req, res, next) => {
    if (!isInternalIP(req)) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Metrics accessible only from internal network' } });
    }
    next();
}, metricsHandler);

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
