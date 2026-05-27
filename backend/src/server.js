require('dotenv').config();

const app = require('./app');
const logger = require('./utils/logger');
const { scheduleCleanup } = require('./utils/auditCleanup');

function maskDatabaseUrl(rawUrl) {
    if (!rawUrl) return 'not configured';

    try {
        const parsed = new URL(rawUrl);
        const username = parsed.username || 'user';
        const hasPassword = Boolean(parsed.password);
        const passwordMask = hasPassword ? '***' : '';
        const host = parsed.hostname === 'db' ? 'localhost' : parsed.hostname;
        const hostPort = process.env.DB_PORT || parsed.port || '5432';
        const auth = passwordMask ? `${username}:${passwordMask}@` : `${username}@`;

        return `${parsed.protocol}//${auth}${host}:${hostPort}${parsed.pathname}`;
    } catch {
        return rawUrl;
    }
}

function getServiceUrls(port) {
    const frontendUrl = process.env.FRONTEND_URL
        || `http://localhost:3000`;
    const backendUrl = process.env.BACKEND_PUBLIC_URL
        || `http://localhost:${process.env.PORT || port}`;
    const healthUrl = `${backendUrl}/api/health`;
    const prismaUrl = maskDatabaseUrl(process.env.DATABASE_URL);

    return {
        frontendUrl,
        backendUrl,
        healthUrl,
        prismaUrl,
    };
}

// ═══════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════
const PORT = process.env.PORT || 5000;

const { BIND_ADDR } = require('./config/constants');

const server = app.listen(PORT, BIND_ADDR, () => {
    const urls = getServiceUrls(PORT);

    logger.info(`🚀 IAM Auth Server running on port ${PORT}`);
    logger.info(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info([
        '',
        '============================================================',
        'AegisMesh IAM Service URLs',
        '------------------------------------------------------------',
        `Frontend     : ${urls.frontendUrl}`,
        `Backend API  : ${urls.backendUrl}`,
        `Health Check : ${urls.healthUrl}`,
        `Prisma DB URL: ${urls.prismaUrl}`,
        '============================================================',
    ].join('\n'));
    scheduleCleanup();
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

module.exports = server;
