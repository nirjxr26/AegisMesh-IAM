const prisma = require('../../config/database');
const { auditUser } = require('../../utils/auditLog');

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

        const { ...safeUser } = updatedUser;
        Reflect.deleteProperty(safeUser, 'passwordHash');
        Reflect.deleteProperty(safeUser, 'mfaSecret');
        Reflect.deleteProperty(safeUser, 'mfaBackupCodes');
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

        const { ...safeUser } = updatedUser;
        Reflect.deleteProperty(safeUser, 'passwordHash');
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
