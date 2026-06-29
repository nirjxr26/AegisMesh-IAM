const bcrypt = require('bcryptjs');
const prisma = require('../../config/database');
const tokenService = require('../../services/token.service');
const {
    getOrganizationSettings,
    passwordPolicyErrors,
} = require('../../services/organizationSettings.service');
const { createAuditLog } = require('../../utils/auditLog');
const {
    BCRYPT_ROUNDS,
    fieldError,
    getOAuthAppName,
    getOAuthScopes,
    getOAuthDescription,
    getConnectedAppSortTime,
    parseTrustedDevices,
} = require('./helpers');

exports.changePassword = async (req, res, next) => {
    try {
        const { newPassword, confirmPassword } = req.body || {};

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user?.passwordHash) {
            return res.status(404).json({ success: false, error: { code: 'USER_001', message: 'User not found' } });
        }

        const errors = [];

        if (!newPassword || String(newPassword).length === 0) {
            errors.push(fieldError('newPassword', 'New password is required'));
        }

        const matchesExistingPassword = newPassword
            ? await bcrypt.compare(String(newPassword || ''), user.passwordHash)
            : false;

        if (matchesExistingPassword) {
            errors.push(fieldError('newPassword', 'New password must be different from current password'));
        }

        if (String(newPassword || '') !== String(confirmPassword || '')) {
            errors.push(fieldError('confirmPassword', 'Confirm password must match new password'));
        }

        const orgSettings = await getOrganizationSettings();
        const policyIssues = passwordPolicyErrors(String(newPassword || ''), orgSettings);
        for (const issue of policyIssues) {
            errors.push(fieldError('newPassword', issue));
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Validation failed',
                    details: errors,
                },
            });
        }

        const newHash = await bcrypt.hash(String(newPassword), BCRYPT_ROUNDS);

        await prisma.user.update({
            where: { id: req.user.id },
            data: {
                passwordHash: newHash,
                passwordChangedAt: new Date(),
            },
        });

        const revokedCount = await tokenService.revokeAllOtherSessions(req.user.id, req.user.sessionId || null);

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'PASSWORD_CHANGED',
            category: 'SECURITY',
            resource: 'settings/security/password',
            resourceId: req.user.id,
            result: 'SUCCESS',
            metadata: {
                otherSessionsRevoked: revokedCount,
            },
        });

        res.json({ success: true, data: { message: 'Password updated successfully' } });
    } catch (error) {
        next(error);
    }
};

exports.getLoginHistory = async (req, res, next) => {
    try {
        const logs = await prisma.auditLog.findMany({
            where: {
                userId: req.user.id,
                action: { in: ['LOGIN', 'LOGIN_FAILED'] },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
                id: true,
                createdAt: true,
                ipAddress: true,
                userAgent: true,
                result: true,
                action: true,
            },
        });

        res.json({
            success: true,
            data: logs.map((log) => ({
                id: log.id,
                timestamp: log.createdAt,
                ip: log.ipAddress,
                userAgent: log.userAgent,
                result: log.result,
                action: log.action,
            })),
        });
    } catch (error) {
        next(error);
    }
};

exports.getTrustedDevices = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { trustedDevices: true },
        });

        res.json({ success: true, data: parseTrustedDevices(user?.trustedDevices) });
    } catch (error) {
        next(error);
    }
};

exports.revokeTrustedDevice = async (req, res, next) => {
    try {
        const deviceId = req.params.deviceId;

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { trustedDevices: true },
        });

        const devices = parseTrustedDevices(user?.trustedDevices);
        const nextDevices = devices.filter((device) => device.id !== deviceId);

        await prisma.user.update({
            where: { id: req.user.id },
            data: { trustedDevices: nextDevices },
        });

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'TRUSTED_DEVICE_REVOKED',
            category: 'SECURITY',
            resource: 'settings/security/trusted-devices',
            resourceId: deviceId,
            result: 'SUCCESS',
        });

        res.json({ success: true, data: nextDevices });
    } catch (error) {
        next(error);
    }
};

exports.revokeAllTrustedDevices = async (req, res, next) => {
    try {
        await prisma.user.update({
            where: { id: req.user.id },
            data: { trustedDevices: [] },
        });

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'ALL_TRUSTED_DEVICES_REVOKED',
            category: 'SECURITY',
            resource: 'settings/security/trusted-devices',
            resourceId: req.user.id,
            result: 'SUCCESS',
        });

        res.json({ success: true, data: [] });
    } catch (error) {
        next(error);
    }
};

exports.getConnectedApps = async (req, res, next) => {
    try {
        const [oauthApps, apiTokens] = await Promise.all([
            prisma.oAuthAccount.findMany({
                where: { userId: req.user.id },
                select: {
                    id: true,
                    provider: true,
                    providerId: true,
                },
            }),
            prisma.apiToken.findMany({
                where: {
                    userId: req.user.id,
                    isActive: true,
                },
                select: {
                    id: true,
                    name: true,
                    tokenPrefix: true,
                    scopes: true,
                    createdAt: true,
                    lastUsedAt: true,
                    expiresAt: true,
                },
            }),
        ]);

        const oauthResources = Array.from(new Set(oauthApps.map((app) => `auth/oauth/${app.provider}`)));
        const oauthLogEntries = oauthResources.length > 0
            ? await prisma.auditLog.findMany({
                where: {
                    userId: req.user.id,
                    action: 'OAUTH_LOGIN',
                    resource: { in: oauthResources },
                },
                orderBy: { createdAt: 'desc' },
                select: {
                    resource: true,
                    createdAt: true,
                },
            })
            : [];

        const oauthActivityMap = oauthLogEntries.reduce((map, entry) => {
            const list = map.get(entry.resource) || [];
            list.push(entry.createdAt);
            map.set(entry.resource, list);
            return map;
        }, new Map());

        const oauthFormatted = oauthApps.map((app) => {
            const resourceKey = `auth/oauth/${app.provider}`;
            const providerLogs = oauthActivityMap.get(resourceKey) || [];
            const lastUsedAt = providerLogs[0] || null;
            const connectedAt = providerLogs[providerLogs.length - 1] || null;

            return {
                id: app.id,
                type: 'oauth',
                name: getOAuthAppName(app.provider),
                provider: app.provider,
                icon: app.provider,
                scopes: getOAuthScopes(app.provider),
                connectedAt,
                lastUsedAt,
                riskLevel: 'low',
                description: getOAuthDescription(app.provider),
            };
        });

        const tokensFormatted = apiTokens.map((token) => ({
            id: token.id,
            type: 'api_token',
            name: token.name,
            provider: 'api_key',
            icon: 'key',
            scopes: token.scopes,
            connectedAt: token.createdAt,
            lastUsedAt: token.lastUsedAt,
            expiresAt: token.expiresAt,
            tokenPrefix: token.tokenPrefix,
            riskLevel: token.scopes.some((scope) => {
                const normalized = String(scope || '');
                return normalized.startsWith('write:') || normalized.startsWith('delete:');
            }) ? 'medium' : 'low',
            description: `API key with ${token.scopes.length} permissions`,
        }));

        const apps = [...oauthFormatted, ...tokensFormatted].sort((left, right) => {
            return getConnectedAppSortTime(right) - getConnectedAppSortTime(left);
        });

        res.json({
            success: true,
            data: apps,
            summary: {
                total: apps.length,
                oauth: oauthFormatted.length,
                apiTokens: tokensFormatted.length,
                highRisk: apps.filter((app) => app.riskLevel === 'high').length,
                mediumRisk: apps.filter((app) => app.riskLevel === 'medium').length,
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.revokeConnectedApp = async (req, res, next) => {
    try {
        const { appId } = req.params;

        const [oauthApp, apiToken] = await Promise.all([
            prisma.oAuthAccount.findFirst({
                where: {
                    id: appId,
                    userId: req.user.id,
                },
            }),
            prisma.apiToken.findFirst({
                where: {
                    id: appId,
                    userId: req.user.id,
                },
            }),
        ]);

        if (!oauthApp && !apiToken) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Connected app not found',
                },
            });
        }

        let appType = 'oauth';
        let appName = getOAuthAppName(oauthApp?.provider);

        if (oauthApp) {
            await prisma.oAuthAccount.delete({
                where: { id: appId },
            });
        } else {
            appType = 'api_token';
            appName = apiToken.name;

            await prisma.apiToken.update({
                where: { id: appId },
                data: {
                    isActive: false,
                    revokedAt: new Date(),
                },
            });
        }

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'CONNECTED_APP_REVOKED',
            category: 'SECURITY',
            resource: 'settings/connected-apps',
            resourceId: appId,
            result: 'SUCCESS',
            metadata: {
                appId,
                appType,
                appName,
            },
        });

        res.json({
            success: true,
            message: 'Access revoked',
        });
    } catch (error) {
        next(error);
    }
};
