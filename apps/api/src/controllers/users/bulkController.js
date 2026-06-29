const prisma = require('../../config/database');
const { audit } = require('../../utils/auditLog');
const { uniqueIds, toCsvCell } = require('./userHelpers');

exports.bulkUpdateStatus = async (req, res, next) => {
    try {
        const { userIds = [], status } = req.body || {};
        const requestedIds = uniqueIds(userIds);

        const results = {
            success: [],
            failed: [],
            skipped: [],
        };

        const filteredIds = [];
        requestedIds.forEach((userId) => {
            if (userId === req.user.id) {
                results.skipped.push({ userId, reason: 'Cannot change your own status' });
                return;
            }

            filteredIds.push(userId);
        });

        let safeIds = [...filteredIds];

        if (status === 'LOCKED' && safeIds.length > 0) {
            const superAdminAssignments = await prisma.userRole.findMany({
                where: {
                    userId: { in: safeIds },
                    role: { name: 'SuperAdmin' },
                },
                include: {
                    role: true,
                },
            });

            const targetSuperAdminIds = [...new Set(superAdminAssignments.map((assignment) => assignment.userId))];
            const totalSuperAdmins = await prisma.userRole.count({
                where: {
                    role: { name: 'SuperAdmin' },
                },
            });

            if (targetSuperAdminIds.length > 0 && targetSuperAdminIds.length >= totalSuperAdmins) {
                safeIds = safeIds.filter((id) => !targetSuperAdminIds.includes(id));
                targetSuperAdminIds.forEach((userId) => {
                    results.skipped.push({ userId, reason: 'Cannot lock last SuperAdmin account' });
                });
            }
        }

        if (safeIds.length > 0) {
            const updateData = {
                status,
                ...(status === 'ACTIVE' ? {
                    failedLoginCount: 0,
                    lockedUntil: null,
                } : {}),
            };

            try {
                await prisma.user.updateMany({
                    where: { id: { in: safeIds } },
                    data: updateData,
                });

                if (status === 'LOCKED') {
                    await prisma.session.deleteMany({
                        where: {
                            userId: { in: safeIds },
                        },
                    });
                }

                results.success = safeIds;
            } catch (error) {
                results.failed = safeIds.map((userId) => ({ userId, reason: error.message }));
            }
        }

        await audit({
            req,
            userId: req.user.id,
            action: 'BULK_STATUS_CHANGE',
            category: 'USER_MANAGEMENT',
            resource: 'users/bulk/status',
            result: 'SUCCESS',
            metadata: {
                targetCount: safeIds.length,
                newStatus: status,
                skippedCount: results.skipped.length,
                bulk: true,
            },
        });

        res.json({
            success: true,
            data: {
                processed: requestedIds.length,
                succeeded: results.success.length,
                failed: results.failed.length,
                skipped: results.skipped.length,
                details: results,
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.bulkAssignRoles = async (req, res, next) => {
    try {
        const { userIds = [], roleIds = [], action } = req.body || {};
        const requestedUserIds = uniqueIds(userIds);
        const requestedRoleIds = uniqueIds(roleIds);

        const roles = await prisma.role.findMany({
            where: { id: { in: requestedRoleIds } },
            select: { id: true, name: true },
        });

        if (roles.length !== requestedRoleIds.length) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'One or more roles not found',
                },
            });
        }

        let affectedCount = 0;

        if (action === 'assign') {
            const data = [];
            requestedUserIds.forEach((userId) => {
                requestedRoleIds.forEach((roleId) => {
                    data.push({ userId, roleId, assignedBy: req.user.id });
                });
            });

            const created = await prisma.userRole.createMany({
                data,
                skipDuplicates: true,
            });
            affectedCount = created.count;
        } else {
            const removed = await prisma.userRole.deleteMany({
                where: {
                    userId: { in: requestedUserIds },
                    roleId: { in: requestedRoleIds },
                },
            });
            affectedCount = removed.count;
        }

        await audit({
            req,
            userId: req.user.id,
            action: 'BULK_ROLE_ASSIGN',
            category: 'ROLE_MANAGEMENT',
            resource: 'users/bulk/roles',
            result: 'SUCCESS',
            metadata: {
                userCount: requestedUserIds.length,
                roleIds: requestedRoleIds,
                roleNames: roles.map((role) => role.name),
                action,
                affectedCount,
                bulk: true,
            },
        });

        res.json({
            success: true,
            data: {
                users: requestedUserIds.length,
                roles: requestedRoleIds.length,
                affected: affectedCount,
                action,
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.bulkAssignGroups = async (req, res, next) => {
    try {
        const { userIds = [], groupIds = [], action } = req.body || {};
        const requestedUserIds = uniqueIds(userIds);
        const requestedGroupIds = uniqueIds(groupIds);

        const groups = await prisma.group.findMany({
            where: { id: { in: requestedGroupIds } },
            select: { id: true, name: true },
        });

        if (groups.length !== requestedGroupIds.length) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'One or more groups not found',
                },
            });
        }

        let affectedCount = 0;

        if (action === 'add') {
            const data = [];
            requestedUserIds.forEach((userId) => {
                requestedGroupIds.forEach((groupId) => {
                    data.push({ userId, groupId });
                });
            });

            const created = await prisma.userGroup.createMany({
                data,
                skipDuplicates: true,
            });
            affectedCount = created.count;
        } else {
            const removed = await prisma.userGroup.deleteMany({
                where: {
                    userId: { in: requestedUserIds },
                    groupId: { in: requestedGroupIds },
                },
            });
            affectedCount = removed.count;
        }

        await audit({
            req,
            userId: req.user.id,
            action: 'BULK_GROUP_ASSIGN',
            category: 'GROUP_MANAGEMENT',
            resource: 'users/bulk/groups',
            result: 'SUCCESS',
            metadata: {
                userCount: requestedUserIds.length,
                groupIds: requestedGroupIds,
                groupNames: groups.map((group) => group.name),
                action,
                affectedCount,
                bulk: true,
            },
        });

        res.json({
            success: true,
            data: {
                users: requestedUserIds.length,
                groups: requestedGroupIds.length,
                affected: affectedCount,
                action,
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.bulkDelete = async (req, res, next) => {
    try {
        const { userIds = [], confirmPhrase } = req.body || {};
        if (confirmPhrase !== 'DELETE') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Type DELETE to confirm',
                },
            });
        }

        const requestedIds = uniqueIds(userIds);
        const results = {
            success: [],
            failed: [],
            skipped: [],
        };

        const filteredIds = [];
        requestedIds.forEach((userId) => {
            if (userId === req.user.id) {
                results.skipped.push({ userId, reason: 'Cannot delete your own account' });
                return;
            }

            filteredIds.push(userId);
        });

        let safeIds = [...filteredIds];

        if (safeIds.length > 0) {
            const superAdminAssignments = await prisma.userRole.findMany({
                where: {
                    userId: { in: safeIds },
                    role: { name: 'SuperAdmin' },
                },
                select: { userId: true },
            });

            const targetSuperAdminIds = [...new Set(superAdminAssignments.map((assignment) => assignment.userId))];
            const totalSuperAdmins = await prisma.userRole.count({
                where: {
                    role: { name: 'SuperAdmin' },
                },
            });

            if (targetSuperAdminIds.length > 0 && targetSuperAdminIds.length >= totalSuperAdmins) {
                safeIds = safeIds.filter((id) => !targetSuperAdminIds.includes(id));
                targetSuperAdminIds.forEach((userId) => {
                    results.skipped.push({ userId, reason: 'Cannot delete last SuperAdmin account' });
                });
            }
        }

        for (const userId of safeIds) {
            try {
                await prisma.$transaction(async (tx) => {
                    await tx.session.deleteMany({ where: { userId } });
                    await tx.oAuthAccount.deleteMany({ where: { userId } });
                    await tx.userRole.deleteMany({ where: { userId } });
                    await tx.userGroup.deleteMany({ where: { userId } });
                    await tx.apiToken.deleteMany({ where: { userId } });
                    await tx.notificationLog.deleteMany({ where: { userId } });
                    await tx.user.delete({ where: { id: userId } });
                });

                results.success.push(userId);
            } catch (error) {
                results.failed.push({ userId, reason: error.message });
            }
        }

        await audit({
            req,
            userId: req.user.id,
            action: 'BULK_DELETE',
            category: 'USER_MANAGEMENT',
            resource: 'users/bulk/delete',
            result: 'SUCCESS',
            metadata: {
                deletedCount: results.success.length,
                skippedCount: results.skipped.length,
                failedCount: results.failed.length,
                bulk: true,
            },
        });

        res.json({
            success: true,
            data: {
                processed: requestedIds.length,
                succeeded: results.success.length,
                failed: results.failed.length,
                skipped: results.skipped.length,
                details: results,
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.bulkExport = async (req, res, next) => {
    try {
        const { userIds = [], format = 'csv' } = req.body || {};
        const requestedIds = uniqueIds(userIds);

        const users = await prisma.user.findMany({
            where: { id: { in: requestedIds } },
            include: {
                userRoles: {
                    include: { role: true },
                },
                userGroups: {
                    include: { group: true },
                },
                sessions: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });

        const exportData = users.map((user) => ({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            status: user.status,
            mfaEnabled: user.mfaEnabled,
            emailVerified: user.emailVerified,
            roles: user.userRoles.map((ur) => ur.role.name).join(', '),
            groups: user.userGroups.map((ug) => ug.group.name).join(', '),
            createdAt: user.createdAt.toISOString(),
            lastLogin: user.sessions[0]?.createdAt?.toISOString() || 'Never',
        }));

        await audit({
            req,
            userId: req.user.id,
            action: 'BULK_EXPORT',
            category: 'DATA_ACCESS',
            resource: 'users/bulk/export',
            result: 'SUCCESS',
            metadata: {
                count: users.length,
                format,
                bulk: true,
            },
        });

        const date = new Date().toISOString().split('T')[0];

        if (format === 'json') {
            res.setHeader('Content-Disposition', `attachment; filename="users-${date}.json"`);
            return res.json(exportData);
        }

        const headers = [
            'ID', 'Email', 'First Name', 'Last Name', 'Status', 'MFA', 'Email Verified', 'Roles', 'Groups', 'Created', 'Last Login',
        ];

        const rows = exportData.map((user) => [
            user.id,
            user.email,
            user.firstName,
            user.lastName,
            user.status,
            user.mfaEnabled,
            user.emailVerified,
            user.roles,
            user.groups,
            user.createdAt,
            user.lastLogin,
        ].map((value) => toCsvCell(value)).join(','));

        const csv = [headers.join(','), ...rows].join('\n');

        res.setHeader('Content-Disposition', `attachment; filename="users-${date}.csv"`);
        res.setHeader('Content-Type', 'text/csv');
        return res.send(csv);
    } catch (error) {
        next(error);
    }
};
