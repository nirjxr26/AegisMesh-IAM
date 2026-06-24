const express = require('express');
const router = express.Router();
const policiesController = require('../controllers/policies.controller');
const { authenticate } = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

const { validate } = require('../middleware/validate');
const schemas = require('../config/validationSchemas');

router.use(authenticate);

router.post('/simulate', authorize('policies:read', 'policies/*'), validate(schemas.policySimulation), policiesController.simulatePolicy);

router.get('/', authorize('policies:read', 'policies/*'), policiesController.getPolicies);
router.post('/', authorize('policies:write', 'policies/*'), validate(schemas.policy), policiesController.createPolicy);
router.get('/:id', authorize('policies:read', 'policies/*'), policiesController.getPolicy);
router.put('/:id', authorize('policies:write', 'policies/*'), validate(schemas.policy), policiesController.updatePolicy);
router.delete('/:id', authorize('policies:delete', 'policies/*'), policiesController.deletePolicy);

module.exports = router;
