const prisma = require('../../config/database');
const {
    ensureOrganizationSettings,
    getOrganizationSettings: _getOrganizationSettings,
    clearOrganizationSettingsCache,
} = require('../../services/organizationSettings.service');
const { createAuditLog } = require('../../utils/auditLog');
const {
    fieldError: _fieldError,
    assignNumberField,
    handlePasswordExpiryDays,
    assignFields,
    handleIpAllowlist,
} = require('./helpers');

exports.getOrganization = async (req, res, next) => {
    try {
        const settings = await ensureOrganizationSettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        next(error);
    }
};

exports.updateOrganization = async (req, res, next) => {
    try {
        const payload = req.body || {};
        const current = await ensureOrganizationSettings();

        const data = {};
        const errors = [];

        assignNumberField(
            payload,
            data,
            errors,
            'minPasswordLength',
            6,
            32
        );

        assignNumberField(
            payload,
            data,
            errors,
            'maxFailedAttempts',
            1,
            20
        );

        assignNumberField(
            payload,
            data,
            errors,
            'sessionTimeoutMinutes',
            15,
            10080
        );

        handlePasswordExpiryDays(payload, data, errors);

        assignFields(
            payload,
            data,
            [
                'requireUppercase',
                'requireNumber',
                'requireSymbol',
                'requireMfaForAll',
                'allowOAuthLogin',
            ],
            Boolean
        );

        assignFields(
            payload,
            data,
            ['orgName', 'plan', 'region'],
            String
        );

        handleIpAllowlist(payload, data, errors);

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

        const updated = await prisma.organizationSettings.update({
            where: { id: current.id },
            data,
        });

        await clearOrganizationSettingsCache();

        const diff = {};

        Object.keys(data).forEach((key) => {
            diff[key] = {
                from: current[key],
                to: updated[key],
            };
        });

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'ORG_SETTINGS_UPDATED',
            category: 'SYSTEM',
            resource: 'settings/organization',
            resourceId: updated.id,
            result: 'SUCCESS',
            metadata: { diff },
        });

        res.json({
            success: true,
            data: updated,
        });
    } catch (error) {
        next(error);
    }
};

exports.exportOrganizationData = async (req, res, next) => {
    try {
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

        const [users, roles, policies, groups, auditLogs] = await Promise.all([
            prisma.user.findMany({
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    status: true,
                    emailVerified: true,
                    mfaEnabled: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            prisma.role.findMany({ include: { rolePolicies: true, userRoles: true } }),
            prisma.policy.findMany(),
            prisma.group.findMany({ include: { groupRoles: true, userGroups: true } }),
            prisma.auditLog.findMany({ where: { createdAt: { gte: ninetyDaysAgo } }, orderBy: { createdAt: 'desc' } }),
        ]);

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'DATA_EXPORTED',
            category: 'DATA_ACCESS',
            resource: 'settings/organization/export',
            resourceId: req.user.id,
            result: 'SUCCESS',
            metadata: {
                users: users.length,
                roles: roles.length,
                policies: policies.length,
                groups: groups.length,
                auditLogs: auditLogs.length,
            },
        });

        const payload = {
            generatedAt: new Date().toISOString(),
            users,
            roles,
            policies,
            groups,
            auditLogs,
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="iam-export-${Date.now()}.json"`);
        res.status(200).send(JSON.stringify(payload, null, 2));
    } catch (error) {
        next(error);
    }
};

exports.resetOrganizationPolicies = async (req, res, next) => {
    try {
        const current = await ensureOrganizationSettings();
        const defaults = {
            minPasswordLength: 8,
            requireUppercase: true,
            requireNumber: true,
            requireSymbol: true,
            passwordExpiryDays: null,
            maxFailedAttempts: 5,
            sessionTimeoutMinutes: 480,
            requireMfaForAll: false,
            allowOAuthLogin: true,
            ipAllowlist: [],
        };

        const updated = await prisma.organizationSettings.update({
            where: { id: current.id },
            data: defaults,
        });

        await clearOrganizationSettingsCache();

        await createAuditLog({
            req,
            userId: req.user.id,
            action: 'ORG_POLICIES_RESET',
            category: 'SYSTEM',
            resource: 'settings/organization/policies',
            resourceId: updated.id,
            result: 'SUCCESS',
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        next(error);
    }
};
