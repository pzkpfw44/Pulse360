// backend/routes/results.routes.js

const express = require('express');
const router = express.Router();
const resultsController = require('../controllers/results.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get results for a specific campaign
router.get('/campaign/:campaignId', resultsController.getCampaignResults);

// Get a PDF export of campaign results
router.get('/campaign/:campaignId/export', resultsController.exportCampaignResults);

module.exports = router;