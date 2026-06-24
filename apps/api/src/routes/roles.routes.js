const express = require('express');
const router = express.Router();
const rolesController = require('../controllers/roles.controller');
const { authenticate } = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const { validate } = require('../middleware/validate');
const schemas = require('../config/validationSchemas');

router.use(authenticate);

router.get('/', authorize('roles:read', 'roles/*'), rolesController.getRoles);
router.post('/', authorize('roles:write', 'roles/*'), validate(schemas.role), rolesController.createRole);
router.get('/templates', authorize('roles:read', 'roles/*'), rolesController.getRoleTemplates);
router.post('/templates/:templateId/apply', authorize('roles:write', 'roles/*'), validate(schemas.roleTemplateApply), rolesController.applyTemplate);
router.get('/:id', authorize('roles:read', 'roles/*'), rolesController.getRole);
router.put('/:id', authorize('roles:write', 'roles/*'), validate(schemas.role), rolesController.updateRole);
router.delete('/:id', authorize('roles:delete', 'roles/*'), rolesController.deleteRole);

router.post('/:id/policies', authorize('roles:write', 'roles/*'), validate(schemas.rolePolicy), rolesController.attachPolicy);
router.delete('/:id/policies/:policyId', authorize('roles:write', 'roles/*'), rolesController.detachPolicy);
router.get('/:id/users', authorize('roles:read', 'roles/*'), rolesController.getRoleUsers);


module.exports = router;
