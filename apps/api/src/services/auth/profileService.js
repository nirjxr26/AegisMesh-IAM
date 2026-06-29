const prisma = require('../../config/database');
const { createError } = require('../../utils/errors');

function hasConfiguredBackupCodes(user) {
    return Array.isArray(user?.backupCodes) && user.backupCodes.length > 0;
}

async function getProfile(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
            emailVerified: true,
            mfaEnabled: true,
            failedLoginCount: true,
            passwordChangedAt: true,
            passwordHash: true,
            backupCodes: true,
            mfaBackupCodes: true,
            createdAt: true,
            updatedAt: true,
            userRoles: {
                include: {
                    role: {
                        select: { name: true },
                    },
                },
            },
        },
    });

    if (!user) {
        throw createError('AUTH_007');
    }

    const roleNames = (user.userRoles || []).map((ur) => ur.role?.name).filter(Boolean);
    const role = roleNames.includes('SuperAdmin') ? 'SuperAdmin' : (roleNames[0] || null);

    const { ...safeUser } = user;
    const hasPassword = Boolean(safeUser.passwordHash);
    const hasBackupCodes = hasConfiguredBackupCodes({ backupCodes: safeUser.mfaBackupCodes, mfaBackupCodes: safeUser.mfaBackupCodes });
    Reflect.deleteProperty(safeUser, 'userRoles');
    Reflect.deleteProperty(safeUser, 'passwordHash');
    Reflect.deleteProperty(safeUser, 'backupCodes');
    Reflect.deleteProperty(safeUser, 'mfaBackupCodes');

    return {
        ...safeUser,
        role,
        hasBackupCodes,
        hasPassword,
    };
}

module.exports = { getProfile, hasConfiguredBackupCodes };
