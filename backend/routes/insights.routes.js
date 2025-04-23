// backend/routes/insights.routes.js

const express = require('express');
const router = express.Router();
const insightsController = require('../controllers/insights.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get available campaigns for insights
router.get('/campaigns', insightsController.getAvailableCampaigns);

// Get all insights for the user
router.get('/', insightsController.getUserInsights);

// Get a specific insight
router.get('/:id', insightsController.getInsightById);

// Generate a new insight
router.post('/generate', insightsController.generateInsight);

// Update an insight
router.put('/:id', insightsController.updateInsight);

// Delete an insight
router.delete('/:id', insightsController.deleteInsight);

// Export insight as PDF
router.get('/:id/export-pdf', insightsController.exportInsightPdf);

router.post('/:id/regenerate', insightsController.regenerateInsight);

module.exports = router;