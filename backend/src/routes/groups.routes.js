const express = require('express');
const router = express.Router();
const groupsController = require('../controllers/groups.controller');
const { authenticate } = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const { validate } = require('../middleware/validate');
const schemas = require('../config/validationSchemas');

router.use(authenticate);

router.get('/', authorize('groups:read', 'groups/*'), groupsController.getGroups);
router.post('/', authorize('groups:write', 'groups/*'), validate(schemas.group), groupsController.createGroup);
router.get('/:id', authorize('groups:read', 'groups/*'), groupsController.getGroup);
router.put('/:id', authorize('groups:write', 'groups/*'), validate(schemas.group), groupsController.updateGroup);
router.delete('/:id', authorize('groups:delete', 'groups/*'), groupsController.deleteGroup);

router.post('/:id/members', authorize('groups:write', 'groups/*'), validate(schemas.groupMember), groupsController.addMember);
router.delete('/:id/members/:userId', authorize('groups:write', 'groups/*'), groupsController.removeMember);

router.post('/:id/roles', authorize('groups:write', 'groups/*'), validate(schemas.groupRole), groupsController.attachRole);
router.delete('/:id/roles/:roleId', authorize('groups:write', 'groups/*'), groupsController.detachRole);

module.exports = router;
