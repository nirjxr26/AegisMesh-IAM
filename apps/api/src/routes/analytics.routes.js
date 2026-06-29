const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const analyticsController = require('../controllers/analytics.controller');

// Overview metrics for the 'War Room' dashboard
router.get('/overview', authenticate, authorize('audit:read', 'overview'), analyticsController.getOverviewMetrics);

module.exports = router;
