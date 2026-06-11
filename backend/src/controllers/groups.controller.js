const prisma = require('../config/database');
const { createError } = require('../utils/errors');
const { auditGroup } = require('../utils/auditLog');

exports.getGroups = async (req, res, next) => {
    try {
        const groups = await prisma.group.findMany({
            include: { _count: { select: { userGroups: true, groupRoles: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: groups });
    } catch (error) { next(error); }
};

exports.getGroup = async (req, res, next) => {
    try {
        const group = await prisma.group.findUnique({
            where: { id: req.params.id },
            include: {
                userGroups: { include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } } },
                groupRoles: { include: { role: true } }
            }
        });
        if (!group) throw createError('RBAC_004');
        res.json({ success: true, data: group });
    } catch (error) { next(error); }
};

exports.createGroup = async (req, res, next) => {
    try {
        const { name, description } = req.body;
        const existing = await prisma.group.findUnique({ where: { name } });
        if (existing) return res.status(400).json({ success: false, error: 'Group name must be unique' });

        const group = await prisma.group.create({ data: { name, description } });
        await auditGroup.created(req, group.id, name);

        res.status(201).json({ success: true, data: group });
    } catch (error) { next(error); }
};

exports.updateGroup = async (req, res, next) => {
    try {
        const { name, description } = req.body;
        const group = await prisma.group.findUnique({ where: { id: req.params.id } });
        if (!group) throw createError('RBAC_004');

        const updatedGroup = await prisma.group.update({ where: { id: req.params.id }, data: { name, description } });
        await auditGroup.updated(req, updatedGroup.id, { name, description });

        res.json({ success: true, data: updatedGroup });
    } catch (error) { next(error); }
};

exports.deleteGroup = async (req, res, next) => {
    try {
        const group = await prisma.group.findUnique({ where: { id: req.params.id } });
        if (!group) throw createError('RBAC_004');

        await prisma.group.delete({ where: { id: req.params.id } });
        await auditGroup.deleted(req, group.id, group.name);

        res.json({ success: true, message: 'Group deleted' });
    } catch (error) { next(error); }
};

exports.addMember = async (req, res, next) => {
    try {
        const { userId } = req.body;
        const { id: groupId } = req.params;

        const existing = await prisma.userGroup.findUnique({
            where: { userId_groupId: { userId, groupId } }
        });
        if (existing) return res.status(400).json({ success: false, error: 'User already in group' });

        await prisma.userGroup.create({ data: { userId, groupId } });
        await auditGroup.memberAdded(req, groupId, userId);

        res.json({ success: true, message: 'Member added to group' });
    } catch (error) { next(error); }
};

exports.removeMember = async (req, res, next) => {
    try {
        const { id: groupId, userId } = req.params;
        const ug = await prisma.userGroup.findUnique({ where: { userId_groupId: { userId, groupId } } });
        if (ug) {
            await prisma.userGroup.delete({ where: { userId_groupId: { userId, groupId } } });
            await auditGroup.memberRemoved(req, groupId, userId);
        }
        res.json({ success: true, message: 'Member removed from group' });
    } catch (error) { next(error); }
};

exports.attachRole = async (req, res, next) => {
    try {
        const { roleId } = req.body;
        const { id: groupId } = req.params;

        await prisma.groupRole.create({ data: { groupId, roleId } });
        await auditGroup.roleAttached(req, groupId, roleId);

        res.json({ success: true, message: 'Role attached to group' });
    } catch (error) {
        if (error.code === 'P2002') return res.status(400).json({ success: false, error: 'Role already attached to group' });
        next(error);
    }
};

exports.detachRole = async (req, res, next) => {
    try {
        const { id: groupId, roleId } = req.params;
        const gr = await prisma.groupRole.findUnique({ where: { groupId_roleId: { groupId, roleId } } });
        if (gr) {
            await prisma.groupRole.delete({ where: { groupId_roleId: { groupId, roleId } } });
            await auditGroup.roleDetached(req, groupId, roleId);
        }
        res.json({ success: true, message: 'Role detached from group' });
    } catch (error) { next(error); }
};
