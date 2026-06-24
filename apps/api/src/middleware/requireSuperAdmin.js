const prisma = require('../config/database');

module.exports = async function requireSuperAdmin(req, res, next) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({
                success: false,
                error: { code: 'AUTH_007', message: 'Token invalid' },
            });
        }

        if (req.user.role === 'SuperAdmin') {
            return next();
        }

        const count = await prisma.userRole.count({
            where: {
                userId: req.user.id,
                role: { name: 'SuperAdmin' },
            },
        });

        if (count === 0) {
            return res.status(403).json({
                success: false,
                error: { code: 'RBAC_001', message: 'SuperAdmin access required' },
            });
        }

        req.user.role = 'SuperAdmin';
        return next();
    } catch (error) {
        return next(error);
    }
};
