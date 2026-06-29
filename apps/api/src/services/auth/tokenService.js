const tokenService = require('../token.service');
const { auditAuth } = require('../../utils/auditLog');
const { createError } = require('../../utils/errors');

async function logout({ refreshToken, accessToken, userId, req }) {
    let sessionId = req?.user?.sessionId || null;

    if (refreshToken) {
        const session = await tokenService.findSessionByToken(refreshToken);
        sessionId = session?.id || sessionId;
        await tokenService.deleteSession(refreshToken);
    }

    if (accessToken) {
        await tokenService.blacklistToken(accessToken);
    }

    await auditAuth.logout(req, userId, sessionId);

    return { message: 'Logged out successfully' };
}

async function refreshAccessToken({ refreshToken, req }) {
    const payload = tokenService.verifyRefreshToken(refreshToken);
    if (!payload) {
        throw createError('AUTH_006');
    }

    const session = await tokenService.findSessionByToken(refreshToken);
    if (!session) {
        throw createError('AUTH_007');
    }

    if (new Date(session.expiresAt) < new Date()) {
        await tokenService.deleteSession(refreshToken);
        throw createError('AUTH_006');
    }

    const deviceInfo = req?.headers?.['user-agent'];
    const ipAddress = req?.ip || req?.socket?.remoteAddress;

    const rotation = await tokenService.rotateRefreshToken(
        refreshToken,
        session.userId,
        deviceInfo,
        ipAddress
    );

    const newAccessToken = tokenService.generateAccessToken(session.user, rotation.session.id);

    await auditAuth.tokenRefreshed(req, session.userId, rotation.session.id);

    return { accessToken: newAccessToken, refreshToken: rotation.refreshToken };
}

module.exports = { logout, refreshAccessToken };
