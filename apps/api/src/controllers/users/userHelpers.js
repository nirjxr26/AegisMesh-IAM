const prisma = require('../../config/database');

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
    const { ...safeUser } = user;
    Reflect.deleteProperty(safeUser, 'passwordHash');
    Reflect.deleteProperty(safeUser, 'mfaSecret');
    Reflect.deleteProperty(safeUser, 'mfaBackupCodes');
    Reflect.deleteProperty(safeUser, 'passwordResetToken');
    Reflect.deleteProperty(safeUser, 'emailVerifyToken');
    return safeUser;
}

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

function uniqueIds(ids = []) {
    return [...new Set((ids || []).map((id) => String(id).trim()).filter(Boolean))];
}

function toCsvCell(value) {
    return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

module.exports = {
    parsePagination,
    sanitizeUser,
    validateUserUpdate,
    sanitizeUpdateRoleIds,
    uniqueIds,
    toCsvCell,
};
