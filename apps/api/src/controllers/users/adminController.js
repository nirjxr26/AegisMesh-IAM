const prisma = require('../../config/database');

exports.isSuperAdmin = (userRoles = []) => {
    return userRoles.some((ur) => ur.role?.name === 'SuperAdmin');
};

exports.isLastActiveSuperAdmin = async (_userId) => {
    const superAdminCount = await prisma.user.count({
        where: { userRoles: { some: { role: { name: 'SuperAdmin' } } }, status: 'ACTIVE' },
    });
    return superAdminCount <= 1;
};

exports.filterLastSuperAdmins = async (userIds = []) => {
    if (userIds.length === 0) return { safeIds: [], removedIds: [] };

    const superAdminAssignments = await prisma.userRole.findMany({
        where: { userId: { in: userIds }, role: { name: 'SuperAdmin' } },
        select: { userId: true },
    });

    const targetSuperAdminIds = [...new Set(superAdminAssignments.map((a) => a.userId))];
    if (targetSuperAdminIds.length === 0) return { safeIds: [...userIds], removedIds: [] };

    const totalSuperAdmins = await prisma.userRole.count({
        where: { role: { name: 'SuperAdmin' } },
    });

    if (targetSuperAdminIds.length >= totalSuperAdmins) {
        return {
            safeIds: userIds.filter((id) => !targetSuperAdminIds.includes(id)),
            removedIds: targetSuperAdminIds,
        };
    }

    return { safeIds: [...userIds], removedIds: [] };
};
