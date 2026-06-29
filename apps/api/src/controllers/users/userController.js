const prisma = require('../../config/database');
const { auditUser } = require('../../utils/auditLog');
const bcrypt = require('bcryptjs');
const { parsePagination, sanitizeUser, validateUserUpdate, sanitizeUpdateRoleIds } = require('./userHelpers');

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

exports.createUser = async (req, res, next) => {
    try {
        const { email, firstName, lastName, password, status, roleIds } = req.body;

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ success: false, error: { code: 'USER_006', message: 'Email already in use' } });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const newUser = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
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
                await tx.userRole.createMany({
                    data: roleIds.map((roleId) => ({ userId: user.id, roleId, assignedBy: req.user.id })),
                    skipDuplicates: true
                });
            }

            return user;
        });

        await auditUser.created(req, newUser.id, email);

        const safeUser = { ...newUser };
        delete safeUser.passwordHash;
        res.status(201).json({ success: true, data: safeUser });
    } catch (error) {
        next(error);
    }
};

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

        const { passwordHash: _passwordHash2, mfaSecret: _mfaSecret2, mfaBackupCodes: _mfaBackupCodes2, passwordResetToken: _passwordResetToken2, emailVerifyToken: _emailVerifyToken2, ...safeUser } = updatedUser;
        res.json({ success: true, data: { ...safeUser, roles: updatedUser.userRoles.map((ur) => ur.role) } });
    } catch (error) {
        next(error);
    }
};
