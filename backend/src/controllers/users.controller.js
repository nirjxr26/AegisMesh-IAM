const prisma = require('../config/database');

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