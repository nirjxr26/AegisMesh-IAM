const prisma = require('../config/database');
const { createError } = require('../utils/errors');
const { audit, auditRole, auditPolicy } = require('../utils/auditLog');
const { ROLE_TEMPLATES } = require('../data/roleTemplates');

exports.getRoles = async (req, res, next) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const where = search ? { name: { contains: search, mode: 'insensitive' } } : {};

        const [roles, total] = await Promise.all([
            prisma.role.findMany({
                where,
                skip: Number.parseInt(skip),
                take: Number.parseInt(limit),
                include: { _count: { select: { userRoles: true, rolePolicies: true } } },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.role.count({ where })
        ]);

        res.json({ success: true, data: roles, pagination: { total, page: Number.parseInt(page), limit: Number.parseInt(limit) } });
    } catch (error) { next(error); }
};

exports.getRole = async (req, res, next) => {
    try {
        const role = await prisma.role.findUnique({
            where: { id: req.params.id },
            include: {
                rolePolicies: { include: { policy: true } },
                userRoles: { include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } } }
            }
        });
        if (!role) throw createError('RBAC_002');
        res.json({ success: true, data: role });
    } catch (error) { next(error); }
};

exports.createRole = async (req, res, next) => {
    try {
        const { name, description } = req.body;
        const trimmedName = String(name || '').trim();

        if (!trimmedName) {
            return res.status(400).json({ success: false, error: 'Role name is required' });
        }

        const existing = await prisma.role.findFirst({
            where: { name: { equals: trimmedName, mode: 'insensitive' } }
        });

        if (existing) {
            return res.status(409).json({ success: false, error: `Role "${trimmedName}" already exists` });
        }

        const role = await prisma.role.create({
            data: { name: trimmedName, description, isSystem: false }
        });

        await auditRole.created(req, role.id, trimmedName);
        res.status(201).json({ success: true, data: role });
    } catch (error) { next(error); }
};

exports.updateRole = async (req, res, next) => {
    try {
        const { name, description } = req.body;
        const role = await prisma.role.findUnique({ where: { id: req.params.id } });
        if (!role) throw createError('RBAC_002');
        if (role.isSystem) throw createError('RBAC_005');

        const updatedRole = await prisma.role.update({ where: { id: req.params.id }, data: { name, description } });
        await auditRole.updated(req, updatedRole.id, { name, description });

        res.json({ success: true, data: updatedRole });
    } catch (error) { next(error); }
};

exports.deleteRole = async (req, res, next) => {
    try {
        const role = await prisma.role.findUnique({ where: { id: req.params.id } });
        if (!role) throw createError('RBAC_002');
        if (role.isSystem) throw createError('RBAC_005');

        await prisma.role.delete({ where: { id: req.params.id } });
        await auditRole.deleted(req, role.id, role.name);

        res.json({ success: true, message: 'Role deleted' });
    } catch (error) { next(error); }
};

exports.attachPolicy = async (req, res, next) => {
    try {
        const { policyId } = req.body;
        const { id: roleId } = req.params;
        const policy = await prisma.policy.findUnique({ where: { id: policyId } });
        if (!policy) throw createError('RBAC_003');

        await prisma.rolePolicy.create({ data: { roleId, policyId } });
        await auditPolicy.attached(req, policyId, roleId);

        res.json({ success: true, message: 'Policy attached to role' });
    } catch (error) {
        if (error.code === 'P2002') return res.status(400).json({ success: false, error: 'Policy already attached' });
        next(error);
    }
};

exports.detachPolicy = async (req, res, next) => {
    try {
        const { id: roleId, policyId } = req.params;
        const rp = await prisma.rolePolicy.findUnique({ where: { roleId_policyId: { roleId, policyId } } });
        if (rp) {
            await prisma.rolePolicy.delete({ where: { roleId_policyId: { roleId, policyId } } });
            await auditPolicy.detached(req, policyId, roleId);
        }
        res.json({ success: true, message: 'Policy detached from role' });
    } catch (error) { next(error); }
};

exports.getRoleUsers = async (req, res, next) => {
    try {
        const role = await prisma.role.findUnique({ where: { id: req.params.id } });
        if (!role) throw createError('RBAC_002');
        const userRoles = await prisma.userRole.findMany({
            where: { roleId: req.params.id },
            include: { user: { select: { id: true, email: true, firstName: true, lastName: true, status: true } } }
        });
        res.json({ success: true, data: userRoles.map(ur => ur.user) });
    } catch (error) { next(error); }
};

exports.getRoleTemplates = async (req, res) => {
    res.json({
        success: true,
        data: ROLE_TEMPLATES,
    });
};

exports.applyTemplate = async (req, res, next) => {
    try {
        const { templateId } = req.params;
        const {
            roleName,
            description,
            assignToUserIds = [],
            assignToGroupIds = [],
        } = req.body || {};

        const template = ROLE_TEMPLATES.find((item) => item.id === templateId);
        if (!template) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Template not found',
                },
            });
        }

        const finalName = String(roleName || template.name).trim();
        const finalDescription = String(description || template.description || '').trim();

        const existing = await prisma.role.findFirst({
            where: {
                name: {
                    equals: finalName,
                    mode: 'insensitive',
                },
            },
        });

        if (existing) {
            return res.status(409).json({
                success: false,
                code: 'ROLE_NAME_EXISTS',
                message: `A role named "${finalName}" already exists. Please choose a different name.`,
            });
        }

        const userIds = [...new Set((assignToUserIds || []).map((id) => String(id).trim()).filter(Boolean))];
        const groupIds = [...new Set((assignToGroupIds || []).map((id) => String(id).trim()).filter(Boolean))];

        const result = await prisma.$transaction(async (tx) => {
            const role = await tx.role.create({
                data: {
                    name: finalName,
                    description: finalDescription,
                    isSystem: false,
                },
            });

            const createdPolicies = [];
            for (const templatePolicy of template.policies) {
                const policyName = `${templatePolicy.name}-${role.id.slice(0, 6)}`;
                const policy = await tx.policy.create({
                    data: {
                        name: policyName,
                        description: templatePolicy.description,
                        effect: templatePolicy.effect,
                        actions: templatePolicy.actions,
                        resources: templatePolicy.resources,
                    },
                });

                await tx.rolePolicy.create({
                    data: {
                        roleId: role.id,
                        policyId: policy.id,
                    },
                });

                createdPolicies.push(policy);
            }

            if (userIds.length > 0) {
                await tx.userRole.createMany({
                    data: userIds.map((userId) => ({
                        userId,
                        roleId: role.id,
                        assignedBy: req.user.id,
                    })),
                    skipDuplicates: true,
                });
            }

            if (groupIds.length > 0) {
                await tx.groupRole.createMany({
                    data: groupIds.map((groupId) => ({
                        groupId,
                        roleId: role.id,
                    })),
                    skipDuplicates: true,
                });
            }

            return { role, policies: createdPolicies };
        });

        await audit({
            req,
            userId: req.user.id,
            action: 'ROLE_CREATED_FROM_TEMPLATE',
            category: 'ROLE_MANAGEMENT',
            resource: 'roles/templates',
            resourceId: result.role.id,
            result: 'SUCCESS',
            metadata: {
                templateId: template.id,
                templateName: template.name,
                roleName: result.role.name,
                policiesCreated: result.policies.length,
                usersAssigned: userIds.length,
                groupsAssigned: groupIds.length,
            },
        });

        res.status(201).json({
            success: true,
            data: {
                role: result.role,
                policies: result.policies,
                policiesCreated: result.policies.length,
            },
            message: `Role "${result.role.name}" created from template with ${result.policies.length} policies`,
        });
    } catch (error) {
        next(error);
    }
};
