const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../../config/database');
const { createAuditLog } = require('../../utils/auditLog');
const {
    normalizeScopes,
} = require('./helpers');

exports.getApiKeys = async (req, res, next) => {
    try {
        const tokens = await prisma.apiToken.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                tokenPrefix: true,
                scopes: true,
                createdAt: true,
                expiresAt: true,
                lastUsedAt: true,
                isActive: true,
                revokedAt: true,
            },
        });

        res.json({ success: true, data: tokens });
    } catch (error) {
        next(error);
    }
};

exports.createApiKey = async (req, res, next) => {
    try {
        const { name, scopes, expiresIn } = req.body || {};

        if (!name || String(name).trim().length === 0) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Token name is required' } });
        }

        const parsedScopes = normalizeScopes(scopes);
        if (parsedScopes.length === 0) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'At least one scope is required' } });
        }

        const rawToken = `iam_${crypto.randomBytes(20).toString('hex')}`;
        const tokenHash = await bcrypt.hash(rawToken, 10);
        const tokenPrefix = rawToken.slice(0, 12);

        let expiresAt = null;
        if (expiresIn !== null && expiresIn !== undefined && expiresIn !== '') {
            const days = Number(expiresIn);
            if (Number.isNaN(days) || days < 1 || days > 3650) {
                return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'expiresIn must be null or between 1 and 3650 days' } });
            }
            expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        }

        const token = await prisma.apiToken.create({
            data: {
                userId: req.user.id,
                name: String(name).trim(),
                tokenHash,
                tokenPrefix,
                scopes: parsedScopes,
                expiresAt,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                tokenPrefix: true,
                scopes: true,
                createdAt: true,
                expiresAt: true,
                lastUsedAt: true,
                isActive: true,
            },
        });

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'API_KEY_CREATED',
            category: 'SECURITY',
            resource: 'settings/api-keys',
            resourceId: token.id,
            result: 'SUCCESS',
            metadata: { scopes: parsedScopes },
        });

        res.status(201).json({ success: true, data: { token: rawToken, ...token } });
    } catch (error) {
        next(error);
    }
};

exports.revokeApiKey = async (req, res, next) => {
    try {
        const tokenId = req.params.tokenId;

        const token = await prisma.apiToken.findUnique({ where: { id: tokenId } });
        if (!token || token.userId !== req.user.id) {
            return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'API key not found' } });
        }

        const updated = await prisma.apiToken.update({
            where: { id: tokenId },
            data: {
                isActive: false,
                revokedAt: new Date(),
            },
            select: {
                id: true,
                name: true,
                tokenPrefix: true,
                scopes: true,
                createdAt: true,
                expiresAt: true,
                lastUsedAt: true,
                isActive: true,
                revokedAt: true,
            },
        });

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'API_KEY_REVOKED',
            category: 'SECURITY',
            resource: 'settings/api-keys',
            resourceId: tokenId,
            result: 'SUCCESS',
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};
