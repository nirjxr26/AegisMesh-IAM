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

    const {
        userRoles: _userRoles,
        passwordHash,
        backupCodes,
        mfaBackupCodes,
        ...safeUser
    } = user;

    return {
        ...safeUser,
        role,
        hasBackupCodes: hasConfiguredBackupCodes({ backupCodes, mfaBackupCodes }),
        hasPassword: Boolean(passwordHash),
    };
}

module.exports = { getProfile, hasConfiguredBackupCodes };
