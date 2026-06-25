const prisma = require('../config/database');
const { createError } = require('../utils/errors');
const { auditPolicy } = require('../utils/auditLog');
const permissionService = require('../services/permission.service');

exports.getPolicies = async (req, res, next) => {
    try {
        const { search, effect } = req.query;
        const where = {};
        if (search) where.name = { contains: search, mode: 'insensitive' };
        if (effect) where.effect = effect;

        const policies = await prisma.policy.findMany({
            where,
            include: { _count: { select: { rolePolicies: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: policies });
    } catch (error) { next(error); }
};

exports.getPolicy = async (req, res, next) => {
    try {
        const policy = await prisma.policy.findUnique({
            where: { id: req.params.id },
            include: { rolePolicies: { include: { role: true } } }
        });
        if (!policy) throw createError('RBAC_003');
        res.json({ success: true, data: policy });
    } catch (error) { next(error); }
};

exports.createPolicy = async (req, res, next) => {
    try {
        const { name, description, effect, actions, resources, conditions } = req.body;
        const existing = await prisma.policy.findUnique({ where: { name } });
        if (existing) return res.status(400).json({ success: false, error: 'Policy name must be unique' });

        if (effect !== 'ALLOW' && effect !== 'DENY') {
            return res.status(400).json({ success: false, error: 'effect must be ALLOW or DENY' });
        }

        const isValidAction = (a) => a === '*' || /^[a-zA-Z0-9_*]+:[a-zA-Z0-9_*]+$/.test(a);
        if (!Array.isArray(actions) || actions.length === 0 || !actions.every(isValidAction)) {
            return res.status(400).json({ success: false, error: 'Invalid actions format' });
        }
        if (!Array.isArray(resources) || resources.length === 0 || !resources.every(r => typeof r === 'string' && r.trim().length > 0)) {
            return res.status(400).json({ success: false, error: 'Invalid resources format' });
        }

        const policy = await prisma.policy.create({
            data: { name, description, effect, actions, resources, conditions, createdBy: req.user.id }
        });

        await auditPolicy.created(req, policy.id, name);
        res.status(201).json({ success: true, data: policy });
    } catch (error) { next(error); }
};

exports.updatePolicy = async (req, res, next) => {
    try {
        const { name, description, effect, actions, resources, conditions } = req.body;
        const policy = await prisma.policy.findUnique({ where: { id: req.params.id } });
        if (!policy) throw createError('RBAC_003');
        if (policy.isSystem) throw createError('RBAC_005');

        const updatedPolicy = await prisma.policy.update({
            where: { id: req.params.id },
            data: { name, description, effect, actions, resources, conditions }
        });

        await auditPolicy.updated(req, updatedPolicy.id, { name, description, effect });
        res.json({ success: true, data: updatedPolicy });
    } catch (error) { next(error); }
};

exports.deletePolicy = async (req, res, next) => {
    try {
        const policy = await prisma.policy.findUnique({ where: { id: req.params.id } });
        if (!policy) throw createError('RBAC_003');
        if (policy.isSystem) throw createError('RBAC_005');

        await prisma.policy.delete({ where: { id: req.params.id } });
        await auditPolicy.deleted(req, policy.id, policy.name);

        res.json({ success: true, message: 'Policy deleted' });
    } catch (error) { next(error); }
};

exports.simulatePolicy = async (req, res, next) => {
    try {
        const { userId, action, resource } = req.body;
        if (!userId || !action || !resource) {
            return res.status(400).json({ success: false, error: 'userId, action, resource are required' });
        }

        const result = await permissionService.checkPermission(userId, action, resource);
        await auditPolicy.simulated(req, userId, action, resource, result);

        res.json({ success: true, data: result });
    } catch (error) { next(error); }
};
