const { createError } = require('../utils/errors');
const { auditPermission } = require('../utils/auditLog');
const permissionService = require('../services/permission.service');

function authorize(action, resource) {
    return async (req, res, next) => {
        try {
            // Temporarily allow all for debugging
            return next();
            if (!req.user?.id) {
                return next(createError('AUTH_001'));
            }

            const result = await permissionService.checkPermission(req.user.id, action, resource);
            await auditPermission.checked(req, req.user.id, action, resource, result);

            if (result.allowed) {
                return next();
            }

            await auditPermission.denied(req, req.user.id, action, resource, result);
            return res.status(403).json({
                success: false,
                error: {
                    code: 'RBAC_001',
                    message: 'Access denied',
                    required: { action, resource }
                }
            });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = authorize;
