const cron = require('node-cron');
const prisma = require('../config/database');
const logger = require('./logger');
const { audit } = require('./auditLog');

const RETENTION_DAYS = Number.parseInt(process.env.AUDIT_LOG_RETENTION_DAYS, 10) || 90;
const SECURITY_RETENTION_DAYS = Number.parseInt(process.env.AUDIT_SECURITY_LOG_RETENTION_DAYS, 10) || 365;

async function runCleanup() {
    try {
        const now = new Date();

        // Security logs: longer retention
        const securityCutoff = new Date(now);
        securityCutoff.setDate(securityCutoff.getDate() - SECURITY_RETENTION_DAYS);

        const securityDeleted = await prisma.auditLog.deleteMany({
            where: { category: 'SECURITY', createdAt: { lt: securityCutoff } }
        });

        // All other logs: standard retention
        const generalCutoff = new Date(now);
        generalCutoff.setDate(generalCutoff.getDate() - RETENTION_DAYS);

        const generalDeleted = await prisma.auditLog.deleteMany({
            where: { category: { not: 'SECURITY' }, createdAt: { lt: generalCutoff } }
        });

        const totalDeleted = securityDeleted.count + generalDeleted.count;
        const totalKept = await prisma.auditLog.count();

        logger.info('Audit log cleanup completed', {
            securityDeleted: securityDeleted.count,
            generalDeleted: generalDeleted.count,
            totalDeleted,
            totalKept,
            securityCutoff,
            generalCutoff
        });

        // Log the cleanup itself
        await audit({
            action: 'AUDIT_CLEANUP_SCHEDULED',
            category: 'SYSTEM',
            resource: 'audit-logs',
            result: 'SUCCESS',
            metadata: {
                securityDeleted: securityDeleted.count,
                generalDeleted: generalDeleted.count,
                totalDeleted,
                totalKept,
                retentionDays: RETENTION_DAYS,
                securityRetentionDays: SECURITY_RETENTION_DAYS
            }
        });

        return { totalDeleted, totalKept };
    } catch (error) {
        logger.error('Audit log cleanup failed:', { error: error.message });
        return null;
    }
}

function scheduleCleanup() {
    // Run daily at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
        logger.info('Running scheduled audit log cleanup...');
        await runCleanup();
    });

    logger.info(`Audit log cleanup scheduled: daily at 2 AM (retain ${RETENTION_DAYS}d general, ${SECURITY_RETENTION_DAYS}d security)`);
}

module.exports = { scheduleCleanup, runCleanup };
