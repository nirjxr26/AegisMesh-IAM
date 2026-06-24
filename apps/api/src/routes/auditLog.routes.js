const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const schemas = require('../config/validationSchemas');
const auditLogController = require('../controllers/auditLog.controller');

// SSE stream — must be before other routes to avoid body parsing
router.get('/stream', authenticate, authorize('audit:read', '*'), auditLogController.streamLogs);

// Stats + Security (before :id to avoid route conflict)
router.get('/stats', authenticate, authorize('audit:read', '*'), auditLogController.getStats);
router.get('/security-alerts', authenticate, authorize('audit:read', '*'), auditLogController.getSecurityAlerts);

// User-specific logs
router.get('/user/:userId', authenticate, authorize('audit:read', '*'), auditLogController.getUserAuditLogs);

// Export
router.post('/export', authenticate, authorize('audit:read', '*'), validate(schemas.auditExport), auditLogController.exportLogs);

// Cleanup (SuperAdmin only via audit:delete)
router.delete('/cleanup', authenticate, authorize('audit:delete', '*'), auditLogController.cleanupLogs);

// List all + single
router.get('/', authenticate, authorize('audit:read', '*'), auditLogController.getAuditLogs);
router.get('/:id', authenticate, authorize('audit:read', '*'), auditLogController.getAuditLog);

module.exports = router;
