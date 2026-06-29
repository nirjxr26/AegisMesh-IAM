const prisma = require('../../config/database');
const { auditUser } = require('../../utils/auditLog');

function parseUserAgent(ua) {
    if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'desktop' };

    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'desktop';

    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';

    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Android')) os = 'Android';

    if (ua.includes('Mobile') || ua.includes('iPhone') || ua.includes('Android')) device = 'mobile';
    else if (ua.includes('iPad') || ua.includes('Tablet')) device = 'tablet';

    return { browser, os, device };
}

exports.getUserSessions = async (req, res, next) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ success: false, error: { code: 'USER_001', message: 'User not found' } });
        }

        const sessions = await prisma.session.findMany({
            where: { userId: id },
            orderBy: { createdAt: 'desc' },
        });

        const currentSessionId = req.user?.sessionId;

        const data = sessions.map((s) => {
            const parsed = parseUserAgent(s.deviceInfo);
            return {
                id: s.id,
                deviceInfo: s.deviceInfo,
                ipAddress: s.ipAddress,
                browser: parsed.browser,
                os: parsed.os,
                device: parsed.device,
                createdAt: s.createdAt,
                expiresAt: s.expiresAt,
                isCurrent: s.id === currentSessionId,
                isExpired: s.expiresAt < new Date(),
            };
        });

        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

exports.revokeUserSessions = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ success: false, error: { code: 'USER_001', message: 'User not found' } });
        }

        const countRes = await prisma.session.count({ where: { userId: id } });

        await prisma.session.deleteMany({ where: { userId: id } });

        await auditUser.sessionsRevoked(req, id, user.email, countRes);

        res.json({ success: true, message: `${countRes} sessions revoked`, data: { revoked: countRes } });
    } catch (error) {
        next(error);
    }
};
