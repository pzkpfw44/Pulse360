// backend/routes/communication-log.routes.js

const express = require('express');
const router = express.Router();
const communicationLogController = require('../controllers/communication-log.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get communication logs for a campaign
router.get('/campaign/:campaignId', communicationLogController.getCampaignLogs);

// Create a new log entry
router.post('/', communicationLogController.createLogEntry);

module.exports = router;