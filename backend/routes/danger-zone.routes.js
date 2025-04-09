// backend/routes/danger-zone.routes.js

const express = require('express');
const router = express.Router();
const dangerZoneController = require('../controllers/danger-zone.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Danger zone routes
router.post('/disable-ai-for-all-campaigns', dangerZoneController.disableAiForAllCampaigns);

module.exports = router;