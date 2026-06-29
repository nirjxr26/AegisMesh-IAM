const prisma = require('../../config/database');
const tokenService = require('../../services/token.service');
const { createAuditLog } = require('../../utils/auditLog');
const {
    serializeSession,
} = require('./helpers');

exports.getSessions = async (req, res, next) => {
    try {
        const sessions = await tokenService.getUserSessions(req.user.id);
        const currentSessionId = req.user.sessionId || null;

        res.json({
            success: true,
            data: sessions.map((session) => serializeSession(session, currentSessionId)),
        });
    } catch (error) {
        next(error);
    }
};

exports.revokeSession = async (req, res, next) => {
    try {
        const { sessionId } = req.params;

        if (req.user.sessionId && sessionId === req.user.sessionId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Cannot revoke your current session. Use Sign Out instead.',
                },
            });
        }

        const session = await prisma.session.findUnique({ where: { id: sessionId } });
        if (!session || session.userId !== req.user.id) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } });
        }

        await tokenService.revokeSession(sessionId, { actorUserId: req.user.id, req });

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'SESSION_REVOKED',
            category: 'SESSION_MANAGEMENT',
            resource: 'settings/sessions',
            resourceId: sessionId,
            result: 'SUCCESS',
        });

        res.json({ success: true, data: { message: 'Session revoked' } });
    } catch (error) {
        next(error);
    }
};

exports.revokeAllOtherSessions = async (req, res, next) => {
    try {
        const revoked = await tokenService.revokeAllOtherSessions(req.user.id, req.user.sessionId || null);

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'ALL_OTHER_SESSIONS_REVOKED',
            category: 'SESSION_MANAGEMENT',
            resource: 'settings/sessions',
            resourceId: req.user.id,
            result: 'SUCCESS',
            metadata: { revokedCount: revoked },
        });

        res.json({ success: true, data: { revoked } });
    } catch (error) {
        next(error);
    }
};
