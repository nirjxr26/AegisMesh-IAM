const prisma = require('../config/database');
const { audit, auditUser } = require('../utils/auditLog');
const bcrypt = require('bcryptjs');

function parsePagination(page, limit) {
    const parsedPage = Number.parseInt(page, 10);
    const parsedLimit = Number.parseInt(limit, 10);

    return {
        page: parsedPage,
        limit: parsedLimit,
        skip: (parsedPage - 1) * parsedLimit,
        take: parsedLimit,
    };
}

function sanitizeUser(user) {
    const {
        passwordHash,
        mfaSecret,
        mfaBackupCodes,
        passwordResetToken,
        emailVerifyToken,
        ...safeUser
    } = user;

    return safeUser;
}

exports.getUsers = async (req, res, next) => {
    try {
        const {
            search,
            status,
            mfaEnabled,
            roleId,
            page = 1,
            limit = 20,
        } = req.query;

        const where = {};

        if (search) {
            where.OR = [
                {
                    email: {
                        contains: search,
                        mode: 'insensitive',
                    },
                },
                {
                    firstName: {
                        contains: search,
                        mode: 'insensitive',
                    },
                },
                {
                    lastName: {
                        contains: search,
                        mode: 'insensitive',
                    },
                },
            ];
        }

        if (status) {
            where.status = status;
        }

        if (
            mfaEnabled !== undefined &&
            mfaEnabled !== ''
        ) {
            where.mfaEnabled = mfaEnabled === 'true';
        }

        if (roleId) {
            where.userRoles = {
                some: { roleId },
            };
        }

        const pagination = parsePagination(page, limit);

        const [
            users,
            total,
            totalActive,
            totalInactive,
            totalLocked,
            totalUnverified,
        ] = await Promise.all([
            prisma.user.findMany({
                where,
                skip: pagination.skip,
                take: pagination.take,
                include: {
                    userRoles: {
                        include: { role: true },
                    },
                    oauthAccounts: {
                        select: { provider: true },
                    },
                    sessions: {
                        where: {
                            expiresAt: {
                                gt: new Date(),
                            },
                        },
                        orderBy: {
                            createdAt: 'desc',
                        },
                        take: 1,
                    },
                    _count: {
                        select: {
                            sessions: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            prisma.user.count({ where }),
            prisma.user.count({
                where: {
                    ...where,
                    status: 'ACTIVE',
                },
            }),
            prisma.user.count({
                where: {
                    ...where,
                    status: 'INACTIVE',
                },
            }),
            prisma.user.count({
                where: {
                    ...where,
                    status: 'LOCKED',
                },
            }),
            prisma.user.count({
                where: {
                    ...where,
                    emailVerified: false,
                },
            }),
        ]);

        const data = users.map((user) => ({
            ...sanitizeUser(user),
            roles: user.userRoles.map(
                (ur) => ur.role
            ),
            oauthProviders: user.oauthAccounts.map(
                (oa) => oa.provider
            ),
            sessionCount: user._count.sessions,
            lastLoginAt:
                user.sessions.length > 0
                    ? user.sessions[0].createdAt
                    : null,
        }));

        res.json({
            success: true,
            data,
            pagination: {
                total,
                page: pagination.page,
                limit: pagination.limit,
                totalPages: Math.ceil(
                    total / pagination.take
                ),
                hasNext:
                    pagination.skip + pagination.take <
                    total,
                hasPrev: pagination.skip > 0,
            },
            summary: {
                total,
                active: totalActive,
                inactive: totalInactive,
                locked: totalLocked,
                unverified: totalUnverified,
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.getUserById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                userRoles: {
                    include: { role: true },
                },
                userGroups: {
                    include: { group: true },
                },
                oauthAccounts: true,
                sessions: {
                    where: {
                        expiresAt: {
                            gt: new Date(),
                        },
                    },
                },
                _count: {
                    select: {
                        sessions: true,
                    },
                },
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'USER_001',
                    message: 'User not found',
                },
            });
        }

        const safeUser = sanitizeUser(user);

        const sortedSessions = [
            ...(user.sessions || []),
        ].sort(
            (a, b) =>
                b.createdAt.getTime() -
                a.createdAt.getTime()
        );

        res.json({
            success: true,
            data: {
                ...safeUser,
                roles: user.userRoles.map(
                    (ur) => ur.role
                ),
                groups: user.userGroups.map(
                    (ug) => ug.group
                ),
                oauthProviders:
                    user.oauthAccounts.map(
                        (oa) => oa.provider
                    ),
                sessionCount:
                    user._count.sessions,
                lastLoginAt:
                    sortedSessions[0]?.createdAt ||
                    null,
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.updateUserStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['ACTIVE', 'INACTIVE', 'LOCKED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: { code: 'USER_007', message: 'Invalid status value' } });
        }

        if (req.user.id === id) {
            return res.status(400).json({ success: false, error: { code: 'USER_008', message: 'Cannot change your own status' } });
        }

        const user = await prisma.user.findUnique({ where: { id }, include: { userRoles: { include: { role: true } } } });
        if (!user) {
            return res.status(404).json({ success: false, error: { code: 'USER_001', message: 'User not found' } });
        }

        if (status === 'LOCKED') {
            const isTargetSuperAdmin = user.userRoles.some((ur) => ur.role.name === 'SuperAdmin');
            if (isTargetSuperAdmin) {
                const superAdmins = await prisma.user.count({
                    where: { userRoles: { some: { role: { name: 'SuperAdmin' } } }, status: 'ACTIVE' },
                });
                if (superAdmins <= 1) {
                    return res.status(400).json({ success: false, error: { code: 'USER_003', message: 'Cannot lock the last SuperAdmin' } });
                }
            }
        }

        const updateData = { status, updatedAt: new Date() };
        if (status === 'ACTIVE') {
            updateData.failedLoginCount = 0;
            updateData.lockedUntil = null;
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData,
        });

        if (status === 'LOCKED') {
            await prisma.session.deleteMany({ where: { userId: id } });
            await prisma.user.update({ where: { id }, data: { failedLoginCount: 0 } });
        }

        await auditUser.statusChanged(req, id, user.email, user.status, status);

        const { passwordHash, mfaSecret, mfaBackupCodes, ...safeUser } = updatedUser;
        res.json({ success: true, data: safeUser });
    } catch (error) {
        next(error);
    }
};

exports.verifyUserEmail = async (req, res, next) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ success: false, error: { code: 'USER_001', message: 'User not found' } });
        }

        if (user.emailVerified) {
            return res.status(400).json({ success: false, error: { code: 'USER_005', message: 'Email already verified' } });
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { emailVerified: true, emailVerifyToken: null, status: user.status === 'INACTIVE' ? 'ACTIVE' : user.status },
        });

        await auditUser.emailVerified(req, id, user.email);

        const { passwordHash, ...safeUser } = updatedUser;
        res.json({ success: true, data: safeUser });
    } catch (error) {
        next(error);
    }
};

exports.deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (req.user.id === id) {
            return res.status(400).json({ success: false, error: { code: 'USER_002', message: 'Cannot delete your own account' } });
        }

        const user = await prisma.user.findUnique({ where: { id }, include: { userRoles: { include: { role: true } } } });
        if (!user) {
            return res.status(404).json({ success: false, error: { code: 'USER_001', message: 'User not found' } });
        }

        const isTargetSuperAdmin = user.userRoles.some((ur) => ur.role.name === 'SuperAdmin');
        if (isTargetSuperAdmin) {
            const superAdmins = await prisma.user.count({
                where: { userRoles: { some: { role: { name: 'SuperAdmin' } } } },
            });
            if (superAdmins <= 1) {
                return res.status(400).json({ success: false, error: { code: 'USER_004', message: 'Cannot delete the last SuperAdmin' } });
            }
        }

        await auditUser.deleted(req, id, user.email);

        await prisma.$transaction([
            prisma.session.deleteMany({ where: { userId: id } }),
            prisma.oAuthAccount.deleteMany({ where: { userId: id } }),
            prisma.userRole.deleteMany({ where: { userId: id } }),
            prisma.userGroup.deleteMany({ where: { userId: id } }),
            prisma.auditLog.deleteMany({ where: { userId: id } }),
            prisma.user.delete({ where: { id } }),
        ]);

        res.json({ success: true, message: 'User deleted successfully', data: { deletedId: id } });
    } catch (error) {
        next(error);
    }
};

function parseUserAgent(ua) {
    if (!ua) return { browser: 'Unknown', os: 'Unknown', device: 'desktop' };

    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'desktop';

    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';

    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Android')) os = 'Android';

    if (ua.includes('Mobile') || ua.includes('iPhone') || ua.includes('Android')) device = 'mobile';
    else if (ua.includes('iPad') || ua.includes('Tablet')) device = 'tablet';

    return { browser, os, device };
}

exports.getUserSessions = async (req, res, next) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ success: false, error: { code: 'USER_001', message: 'User not found' } });
        }

        const sessions = await prisma.session.findMany({
            where: { userId: id },
            orderBy: { createdAt: 'desc' },
        });

        const currentSessionId = req.user?.sessionId;

        const data = sessions.map((s) => {
            const parsed = parseUserAgent(s.deviceInfo);
            return {
                id: s.id,
                deviceInfo: s.deviceInfo,
                ipAddress: s.ipAddress,
                browser: parsed.browser,
                os: parsed.os,
                device: parsed.device,
                createdAt: s.createdAt,
                expiresAt: s.expiresAt,
                isCurrent: s.id === currentSessionId,
                isExpired: s.expiresAt < new Date(),
            };
        });

        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

exports.revokeUserSessions = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) {
            return res.status(404).json({ success: false, error: { code: 'USER_001', message: 'User not found' } });
        }

        const countRes = await prisma.session.count({ where: { userId: id } });

        await prisma.session.deleteMany({ where: { userId: id } });

        await auditUser.sessionsRevoked(req, id, user.email, countRes);

        res.json({ success: true, message: `${countRes} sessions revoked`, data: { revoked: countRes } });
    } catch (error) {
        next(error);
    }
};

exports.createUser = async (req, res, next) => {
    try {
        const { email, firstName, lastName, password, status, roleIds } = req.body;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ success: false, error: { code: 'USER_006', message: 'Email already in use' } });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const newUser = await prisma.user.create({
            data: {
                email,
                firstName,
                lastName,
                passwordHash,
                status: status || 'ACTIVE',
                emailVerified: true,
            },
        });

        if (Array.isArray(roleIds) && roleIds.length > 0) {
            await Promise.all(
                roleIds.map((roleId) => prisma.userRole.create({ data: { userId: newUser.id, roleId } }))
            );
        }

        await auditUser.created(req, newUser.id, email);

        const { passwordHash: _ignored, ...safeUser } = newUser;
        res.status(201).json({ success: true, data: safeUser });


    } catch (error) {
        next(error);
    }
};

async function validateUserUpdate(id, status, user, email) {
    const validStatuses = ['ACTIVE', 'INACTIVE', 'LOCKED'];
    if (status && !validStatuses.includes(status)) {
        return { valid: false, code: 'USER_007', message: 'Invalid status value' };
    }

    if (status === 'LOCKED') {
        const isTargetSuperAdmin = user.userRoles.some((ur) => ur.role.name === 'SuperAdmin');
        if (isTargetSuperAdmin) {
            const activeSuperAdmins = await prisma.user.count({
                where: { userRoles: { some: { role: { name: 'SuperAdmin' } } }, status: 'ACTIVE' },
            });
            if (activeSuperAdmins <= 1) {
                return { valid: false, code: 'USER_003', message: 'Cannot lock the last SuperAdmin' };
            }
        }
    }

    if (email && email !== user.email) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing && existing.id !== id) {
            return { valid: false, code: 'USER_006', message: 'Email already in use' };
        }
    }

    return { valid: true };
}

async function sanitizeUpdateRoleIds(roleIds) {
    if (!Array.isArray(roleIds)) return null;

    const sanitized = [...new Set(roleIds)];
    if (sanitized.length === 0) return sanitized;

    const existingCount = await prisma.role.count({ where: { id: { in: sanitized } } });
    if (existingCount !== sanitized.length) {
        throw new Error('ROLE_001: One or more role IDs are invalid');
    }
    return sanitized;
}

exports.updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { email, firstName, lastName, status, roleIds } = req.body;

        const user = await prisma.user.findUnique({
            where: { id },
            include: { userRoles: { include: { role: true } } },
        });

        if (!user) {
            return res.status(404).json({ success: false, error: { code: 'USER_001', message: 'User not found' } });
        }

        if (req.user.id === id && status && status !== 'ACTIVE') {
            return res.status(400).json({ success: false, error: { code: 'USER_008', message: 'Cannot change your own status' } });
        }

        const validation = await validateUserUpdate(id, status, user, email);
        if (!validation.valid) {
            return res.status(400).json({ success: false, error: { code: validation.code, message: validation.message } });
        }

        let sanitizedRoleIds;
        try {
            sanitizedRoleIds = await sanitizeUpdateRoleIds(roleIds);
        } catch (error) {
            return res.status(400).json({ success: false, error: { code: 'ROLE_001', message: error.message.split(': ')[1] } });
        }

        const updateData = {
            updatedAt: new Date(),
            ...(email !== undefined && { email }),
            ...(firstName !== undefined && { firstName }),
            ...(lastName !== undefined && { lastName }),
            ...(status !== undefined && { status }),
            ...(status === 'ACTIVE' && { failedLoginCount: 0, lockedUntil: null })
        };

        const updatedUser = await prisma.$transaction(async (tx) => {
            if (Object.keys(updateData).length > 1) {
                await tx.user.update({ where: { id }, data: updateData });
            }

            if (sanitizedRoleIds) {
                await tx.userRole.deleteMany({ where: { userId: id } });
                if (sanitizedRoleIds.length > 0) {
                    await tx.userRole.createMany({
                        data: sanitizedRoleIds.map((roleId) => ({ userId: id, roleId, assignedBy: req.user.id })),
                        skipDuplicates: true,
                    });
                }
            }

            if (status === 'LOCKED') {
                await tx.session.deleteMany({ where: { userId: id } });
                await tx.user.update({ where: { id }, data: { failedLoginCount: 0 } });
            }

            return tx.user.findUnique({ where: { id }, include: { userRoles: { include: { role: true } } } });
        });

        if (status && status !== user.status) {
            await auditUser.statusChanged(req, id, user.email, user.status, status);
        }

        const { passwordHash, mfaSecret, mfaBackupCodes, passwordResetToken, emailVerifyToken, ...safeUser } = updatedUser;
        res.json({ success: true, data: { ...safeUser, roles: updatedUser.userRoles.map((ur) => ur.role) } });
    } catch (error) {
        next(error);
    }
};

function uniqueIds(ids = []) {
    return [...new Set((ids || []).map((id) => String(id).trim()).filter(Boolean))];
}

function toCsvCell(value) {
    return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

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