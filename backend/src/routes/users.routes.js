const express = require('express');
const router = express.Router();
const {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    updateUserStatus,
    bulkUpdateStatus,
    bulkAssignRoles,
    bulkAssignGroups,
    bulkDelete,
    bulkExport,
    verifyUserEmail,
    deleteUser,
    getUserSessions,
    revokeUserSessions
} = require('../controllers/users.controller');
const settingsController = require('../controllers/settings.controller');
const userPermissionsController = require('../controllers/userPermissions.controller');
const { authenticate } = require('../middleware/authenticate');
const { requireReauth, SENSITIVE_ACTIONS } = require('../middleware/requireReauth');
const authorize = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const {
    createUserSchema,
    updateUserSchema,
    updateStatusSchema,
    assignRole,
    bulkStatusSchema,
    bulkRolesSchema,
    bulkGroupsSchema,
    bulkDeleteSchema,
    bulkExportSchema,
} = require('../config/validationSchemas');

// All routes require authentication
router.use(authenticate);

// GET /api/users — list all users
router.get('/',
    authorize('users:read', 'users/*'),
    getUsers
);

// POST /api/users — admin create user
router.post('/',
    authorize('users:write', 'users/*'),
    validate(createUserSchema),
    createUser
);

// POST /api/users/bulk/status
router.post('/bulk/status',
    authorize('users:write', 'users/*'),
    validate(bulkStatusSchema),
    bulkUpdateStatus
);

// POST /api/users/bulk/roles
router.post('/bulk/roles',
    authorize('users:write', 'users/*'),
    validate(bulkRolesSchema),
    bulkAssignRoles
);

// POST /api/users/bulk/groups
router.post('/bulk/groups',
    authorize('users:write', 'users/*'),
    validate(bulkGroupsSchema),
    bulkAssignGroups
);

// POST /api/users/bulk/delete
router.post('/bulk/delete',
    authorize('users:write', 'users/*'),
    validate(bulkDeleteSchema),
    bulkDelete
);

// POST /api/users/bulk/export
router.post('/bulk/export',
    authorize('users:read', 'users/*'),
    validate(bulkExportSchema),
    bulkExport
);

// GET /api/users/:id — get user details
router.get('/:id',
    authorize('users:read', 'users/*'),
    getUserById
);

// PUT /api/users/:id — update user profile/roles/status
router.put('/:id',
    authorize('users:write', 'users/*'),
    validate(updateUserSchema),
    updateUser
);

// PUT /api/users/:id/status — lock/unlock
router.put('/:id/status',
    authorize('users:write', 'users/*'),
    validate(updateStatusSchema),
    updateUserStatus
);

// PUT /api/users/:id/verify-email
router.put('/:id/verify-email',
    authorize('users:write', 'users/*'),
    verifyUserEmail
);

// DELETE /api/users/:id — delete user
router.delete('/:id',
    authorize('users:delete', 'users/*'),
    requireReauth(SENSITIVE_ACTIONS.DELETE_ACCOUNT),
    deleteUser
);

// GET /api/users/:id/sessions
router.get('/:id/sessions',
    authorize('users:read', 'users/*'),
    getUserSessions
);

// DELETE /api/users/:id/sessions
router.delete('/:id/sessions',
    authorize('users:write', 'users/*'),
    revokeUserSessions
);

router.delete('/:id/sessions/:sessionId',
    authorize('users:write', 'users/*'),
    settingsController.revokeSession
);

// ═══════════════════════════════════════
// USER ENTITY RELATIONS (userPermissions)
// ═══════════════════════════════════════

router.get('/:id/roles', authorize('users:read', 'users/*'), userPermissionsController.getUserRoles);
router.post('/:id/roles', authorize('users:write', 'users/*'), validate(assignRole), userPermissionsController.assignRole);
router.delete('/:id/roles/:roleId', authorize('users:write', 'users/*'), userPermissionsController.removeRole);

router.get('/:id/permissions', authorize('users:read', 'users/*'), userPermissionsController.getUserPermissions);
router.get('/:id/groups', authorize('users:read', 'users/*'), userPermissionsController.getUserGroups);

module.exports = router;
