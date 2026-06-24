const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { recordApiKeyEvent } = require('../utils/metrics');

function getRequiredScope(method, fullPath) {
    const path = (fullPath || '').toLowerCase();
    const verb = (method || 'GET').toUpperCase();

    if (path.startsWith('/api/users')) {
        return verb === 'GET' ? 'read:users' : 'write:users';
    }

    if (path.startsWith('/api/roles')) {
        return verb === 'GET' ? 'read:roles' : 'write:roles';
    }

    if (path.startsWith('/api/policies')) {
        return verb === 'GET' ? 'read:policies' : 'write:policies';
    }

    if (path.startsWith('/api/groups')) {
        return 'write:groups';
    }

    if (path.startsWith('/api/audit-logs')) {
        return 'read:audit';
    }

    return null;
}

function derivePrimaryRole(user) {
    const names = (user.userRoles || []).map((ur) => ur.role?.name).filter(Boolean);
    if (names.includes('SuperAdmin')) return 'SuperAdmin';
    return names[0] || null;
}

async function authenticateApiKeyToken(req, rawToken) {
    if (typeof rawToken !== 'string' || rawToken.length < 16 || rawToken.length > 4096 || !rawToken.startsWith('iam_')) {
        return null;
    }

    const lookupPrefix = rawToken.substring(0, 12);

    const candidates = await prisma.apiToken.findMany({
        where: {
            tokenPrefix: lookupPrefix,
            isActive: true,
            revokedAt: null,
        },
        include: {
            user: {
                include: {
                    userRoles: {
                        include: {
                            role: {
                                select: { name: true },
                            },
                        },
                    },
                },
            },
        },
        take: 20,
    });

    for (const token of candidates) {
        const isMatch = await bcrypt.compare(rawToken, token.tokenHash);
        if (!isMatch) continue;

        if (token.expiresAt && token.expiresAt < new Date()) {
            await prisma.apiToken.update({
                where: { id: token.id },
                data: { isActive: false, revokedAt: token.expiresAt },
            });
            recordApiKeyEvent('API_KEY_EXPIRED', 'BLOCKED');
            return null;
        }

        const requiredScope = getRequiredScope(req.method, req.originalUrl || req.path || '');
        if (requiredScope && !token.scopes.includes(requiredScope) && !token.scopes.includes('*')) {
            recordApiKeyEvent('API_KEY_DENIED', 'BLOCKED');
            return { scopeError: true };
        }

        await prisma.apiToken.update({
            where: { id: token.id },
            data: { lastUsedAt: new Date() },
        });

        const user = token.user;
        if (!user) return null;

        recordApiKeyEvent('API_KEY_USED', 'SUCCESS');

        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            status: user.status,
            emailVerified: user.emailVerified,
            mfaEnabled: user.mfaEnabled,
            role: derivePrimaryRole(user),
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            authType: 'apiKey',
            apiTokenId: token.id,
            apiTokenScopes: token.scopes,
            sessionId: null,
        };
    }

    return null;
}

module.exports = {
    authenticateApiKeyToken,
    getRequiredScope,
};
