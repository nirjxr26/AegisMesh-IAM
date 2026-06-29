const prisma = require('../config/database');
const { audit } = require('../utils/auditLog');

/**
 * GET /api/audit-logs
 */
exports.getAuditLogs = async (req, res, next) => {
    try {
        const {
            page = 1, limit = 50,
            userId, action, category, result,
            startDate, endDate, search, ipAddress
        } = req.query;

        const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);
        const where = {};

        if (userId) where.userId = userId;
        if (action) where.action = action;
        if (category) where.category = category;
        if (result) where.result = result;
        if (ipAddress) where.ipAddress = { contains: ipAddress };
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }
        if (search) {
            where.OR = [
                { action: { contains: search, mode: 'insensitive' } },
                { resource: { contains: search, mode: 'insensitive' } },
                { ipAddress: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                skip,
                take: Number.parseInt(limit),
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } }
            }),
            prisma.auditLog.count({ where })
        ]);

        const totalPages = Math.ceil(total / Number.parseInt(limit));

        // Summary
        const [failureCount, uniqueUsers, topActionsRaw] = await Promise.all([
            prisma.auditLog.count({ where: { ...where, result: { in: ['FAILURE', 'ERROR', 'BLOCKED'] } } }),
            prisma.auditLog.groupBy({ by: ['userId'], where, _count: true }),
            prisma.auditLog.groupBy({
                by: ['action'],
                where,
                _count: { action: true },
                orderBy: { _count: { action: 'desc' } },
                take: 10
            })
        ]);

        res.json({
            success: true,
            data: logs,
            pagination: {
                total,
                page: Number.parseInt(page),
                limit: Number.parseInt(limit),
                totalPages,
                hasNext: Number.parseInt(page) < totalPages,
                hasPrev: Number.parseInt(page) > 1
            },
            summary: {
                totalEvents: total,
                failureRate: total > 0 ? Math.round((failureCount / total) * 100 * 100) / 100 : 0,
                topActions: topActionsRaw.map(a => ({ action: a.action, count: a._count.action })),
                uniqueUsers: uniqueUsers.length
            }
        });
    } catch (error) { next(error); }
};

/**
 * GET /api/audit-logs/stats
 */
exports.getStats = async (req, res, next) => {
    try {
        const now = new Date();
        const h24 = new Date(now - 24 * 60 * 60 * 1000);
        const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const d9 = new Date(now - 9 * 24 * 60 * 60 * 1000);
        const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000);

        async function getTimeStats(since) {
            const where = { createdAt: { gte: since } };
            const results = await prisma.auditLog.groupBy({
                by: ['action'],
                where,
                _count: { _all: true }
            });

            const stats = {
                totalEvents: results.reduce((sum, r) => sum + r._count._all, 0),
                loginAttempts: results.find(r => r.action === 'LOGIN')?._count._all || 0,
                failedLogins: results.find(r => r.action === 'LOGIN_FAILED')?._count._all || 0,
                newUsers: results.find(r => r.action === 'REGISTER')?._count._all || 0,
                permissionDenied: results.find(r => r.action === 'PERMISSION_DENIED')?._count._all || 0
            };
            return stats;
        }

        const [last24h, last7d, last9d, last30d, totalUsers, failedIPsRaw, topActionsRaw, catRaw, hourlyRaw, dailyRaw] = await Promise.all([
            getTimeStats(h24),
            getTimeStats(d7),
            getTimeStats(d9),
            getTimeStats(d30),
            prisma.user.count(),
            prisma.auditLog.groupBy({
                by: ['ipAddress'],
                where: { result: { in: ['FAILURE', 'BLOCKED'] }, createdAt: { gte: d7 } },
                _count: { ipAddress: true },
                _max: { createdAt: true },
                orderBy: { _count: { ipAddress: 'desc' } },
                take: 10
            }),
            prisma.$queryRaw`
                SELECT 
                    action, 
                    COUNT(*)::int as count,
                    SUM(CASE WHEN result = 'SUCCESS' THEN 1 ELSE 0 END)::int as "successCount"
                FROM "AuditLog"
                WHERE "createdAt" >= ${d30}
                GROUP BY action
                ORDER BY count DESC
                LIMIT 15`,
            prisma.auditLog.groupBy({
                by: ['category'],
                where: { createdAt: { gte: d30 } },
                _count: { category: true },
                orderBy: { _count: { category: 'desc' } }
            }),
            prisma.$queryRaw`
                SELECT EXTRACT(HOUR FROM "createdAt")::int as hour, COUNT(*)::int as count
                FROM "AuditLog"
                WHERE "createdAt" >= ${h24}
                GROUP BY EXTRACT(HOUR FROM "createdAt")
                ORDER BY hour`,
            prisma.$queryRaw`
                SELECT DATE("createdAt") as date, COUNT(*)::int as count
                FROM "AuditLog"
                WHERE "createdAt" >= ${d30}
                GROUP BY DATE("createdAt")
                ORDER BY date`
        ]);

        const topFailedIPs = failedIPsRaw
            .filter(i => i.ipAddress)
            .map(i => ({ ip: i.ipAddress, count: i._count.ipAddress, lastSeen: i._max.createdAt }));

        const topActions = topActionsRaw.map(a => ({
            action: a.action,
            count: a.count,
            successRate: a.count > 0 ? Math.round((a.successCount / a.count) * 100) : 0
        }));

        const totalCat = catRaw.reduce((s, c) => s + c._count.category, 0);
        const categoryBreakdown = catRaw.map(c => ({
            category: c.category, count: c._count.category,
            percentage: totalCat > 0 ? Math.round((c._count.category / totalCat) * 100 * 100) / 100 : 0
        }));

        const hourlyActivity = Array.from({ length: 24 }, (_, i) => {
            const found = hourlyRaw.find(h => h.hour === i);
            return { hour: i, count: found ? found.count : 0 };
        });

        const dailyActivity = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const found = dailyRaw.find(r => {
                const rawDate = r.date instanceof Date 
                    ? `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}-${String(r.date.getDate()).padStart(2, '0')}`
                    : String(r.date).split('T')[0];
                return rawDate === dateStr;
            });
            dailyActivity.push({
                date: dateStr,
                count: found ? found.count : 0
            });
        }

        res.json({
            success: true,
            data: { last24h, last7d, last9d, last30d, totalUsers, topFailedIPs, topActions, categoryBreakdown, hourlyActivity, dailyActivity }
        });
    } catch (error) { next(error); }
};

/**
 * GET /api/audit-logs/security-alerts
 */
exports.getSecurityAlerts = async (req, res, next) => {
    try {
        const now = new Date();
        const h1 = new Date(now - 60 * 60 * 1000);
        const h24 = new Date(now - 24 * 60 * 60 * 1000);
        const alerts = [];

        // Brute force: >10 failed logins from same IP in 1hr
        const bruteForce = await prisma.auditLog.groupBy({
            by: ['ipAddress'],
            where: { action: 'LOGIN_FAILED', createdAt: { gte: h1 } },
            _count: { ipAddress: true },
            _min: { createdAt: true },
            _max: { createdAt: true },
            having: { ipAddress: { _count: { gt: 10 } } }
        });
        for (const bf of bruteForce) {
            if (bf.ipAddress) {
                alerts.push({
                    type: 'BRUTE_FORCE', severity: 'CRITICAL',
                    userId: null, ipAddress: bf.ipAddress,
                    count: bf._count.ipAddress,
                    firstSeen: bf._min.createdAt, lastSeen: bf._max.createdAt,
                    details: `${bf._count.ipAddress} failed login attempts from ${bf.ipAddress}`
                });
            }
        }

        // Account lockouts in last 24h
        const lockouts = await prisma.auditLog.findMany({
            where: { action: 'ACCOUNT_LOCKED', createdAt: { gte: h24 } },
            include: { user: { select: { email: true } } },
            orderBy: { createdAt: 'desc' }
        });
        for (const lo of lockouts) {
            alerts.push({
                type: 'ACCOUNT_LOCKOUT', severity: 'HIGH',
                userId: lo.userId, ipAddress: lo.ipAddress,
                count: 1, firstSeen: lo.createdAt, lastSeen: lo.createdAt,
                details: `Account locked for ${lo.user?.email || lo.userId}`
            });
        }

        // Permission abuse: >5 denied in 1hr per user
        const permAbuse = await prisma.auditLog.groupBy({
            by: ['userId'],
            where: { action: 'PERMISSION_DENIED', createdAt: { gte: h1 } },
            _count: { userId: true },
            _min: { createdAt: true },
            _max: { createdAt: true },
            having: { userId: { _count: { gt: 5 } } }
        });
        for (const pa of permAbuse) {
            if (pa.userId) {
                alerts.push({
                    type: 'PERMISSION_ABUSE', severity: 'MEDIUM',
                    userId: pa.userId, ipAddress: null,
                    count: pa._count.userId,
                    firstSeen: pa._min.createdAt, lastSeen: pa._max.createdAt,
                    details: `${pa._count.userId} permission denied events for user ${pa.userId}`
                });
            }
        }

        // Rate limit events in last 24h
        const rateLimits = await prisma.auditLog.groupBy({
            by: ['ipAddress'],
            where: { action: 'RATE_LIMIT_EXCEEDED', createdAt: { gte: h24 } },
            _count: { ipAddress: true },
            _max: { createdAt: true }
        });
        for (const rl of rateLimits) {
            if (rl.ipAddress) {
                alerts.push({
                    type: 'RATE_LIMIT', severity: rl._count.ipAddress > 10 ? 'HIGH' : 'LOW',
                    userId: null, ipAddress: rl.ipAddress,
                    count: rl._count.ipAddress,
                    firstSeen: rl._max.createdAt, lastSeen: rl._max.createdAt,
                    details: `Rate limit exceeded ${rl._count.ipAddress} time(s) from ${rl.ipAddress}`
                });
            }
        }

        alerts.sort((a, b) => {
            const sev = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
            return (sev[a.severity] || 4) - (sev[b.severity] || 4);
        });

        res.json({ success: true, data: { alerts, totalAlerts: alerts.length } });
    } catch (error) { next(error); }
};

/**
 * GET /api/audit-logs/:id
 */
exports.getAuditLog = async (req, res, next) => {
    try {
        const log = await prisma.auditLog.findUnique({
            where: { id: req.params.id },
            include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } }
        });
        if (!log) return res.status(404).json({ success: false, error: 'Audit log not found' });
        res.json({ success: true, data: log });
    } catch (error) { next(error); }
};

/**
 * GET /api/audit-logs/user/:userId
 */
exports.getUserAuditLogs = async (req, res, next) => {
    try {
        const { page = 1, limit = 50, action, category, result, startDate, endDate } = req.query;
        const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit);
        const where = { userId: req.params.userId };

        if (action) where.action = action;
        if (category) where.category = category;
        if (result) where.result = result;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where, skip, take: Number.parseInt(limit),
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } }
            }),
            prisma.auditLog.count({ where })
        ]);

        const totalPages = Math.ceil(total / Number.parseInt(limit));
        res.json({
            success: true,
            data: logs,
            pagination: { total, page: Number.parseInt(page), limit: Number.parseInt(limit), totalPages, hasNext: Number.parseInt(page) < totalPages, hasPrev: Number.parseInt(page) > 1 }
        });
    } catch (error) { next(error); }
};

/**
 * POST /api/audit-logs/export
 */
exports.exportLogs = async (req, res, next) => {
    try {
        const { userId, action, category, result, startDate, endDate } = req.body || {};
        const where = {};
        if (userId) where.userId = userId;
        if (action) where.action = action;
        if (category) where.category = category;
        if (result) where.result = result;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const logs = await prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 10000,
            include: { user: { select: { email: true } } }
        });

        const header = 'id,timestamp,userId,userEmail,action,category,resource,result,ipAddress,userAgent,errorCode,metadata\n';
        const csvEscape = (val) => {
            if (val == null) return '';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replaceAll('"', '""')}"`;
            }
            return str;
        };

        const rows = logs.map(log =>
            [
                log.id, log.createdAt?.toISOString(), log.userId, log.user?.email,
                log.action, log.category, log.resource, log.result,
                log.ipAddress, log.userAgent, log.errorCode,
                log.metadata ? JSON.stringify(log.metadata) : ''
            ].map(csvEscape).join(',')
        ).join('\n');

        const dateStr = new Date().toISOString().split('T')[0];
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${dateStr}.csv"`);
        res.send(header + rows);
    } catch (error) { next(error); }
};

/**
 * DELETE /api/audit-logs/cleanup
 */
exports.cleanupLogs = async (req, res, next) => {
    try {
        const { olderThanDays = 90, category: cat } = req.body || {};
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - Number.parseInt(olderThanDays));

        const where = { createdAt: { lt: cutoff } };
        if (cat) where.category = cat;

        const deleted = await prisma.auditLog.deleteMany({ where });

        await audit({
            req,
            action: 'AUDIT_LOGS_CLEANED',
            category: 'SYSTEM',
            resource: 'audit-logs',
            result: 'SUCCESS',
            metadata: { olderThanDays, deletedCount: deleted.count, cutoffDate: cutoff }
        });

        res.json({ success: true, data: { deleted: deleted.count, message: `Deleted ${deleted.count} audit logs older than ${olderThanDays} days` } });
    } catch (error) { next(error); }
};

/**
 * GET /api/audit-logs/stream (SSE)
 */
exports.streamLogs = async (req, res) => {
    const { addSSEClient, removeSSEClient } = require('../utils/auditLog');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const client = { id: Date.now(), res };
    addSSEClient(client);

    // Ping every 30s
    const pingInterval = setInterval(() => {
        try { res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`); }
        catch { clearInterval(pingInterval); removeSSEClient(client); }
    }, 30000);

    // Send initial event
    res.write(`data: ${JSON.stringify({ type: 'connected', clientId: client.id })}\n\n`);

    req.on('close', () => {
        clearInterval(pingInterval);
        removeSSEClient(client);
    });
};
