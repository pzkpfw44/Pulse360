// backend/routes/campaigns.routes.js

const express = require('express');
const router = express.Router();
const campaignsController = require('../controllers/campaigns.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Special endpoints that might conflict with /:id routes should be defined first
router.post('/suggest-assessors', campaignsController.suggestAssessors);
router.post('/generate-email-templates', campaignsController.generateEmailTemplates);
router.post('/send-reminders', campaignsController.sendReminders); 

// Get all campaigns
router.get('/', campaignsController.getAllCampaigns);

// Get campaign by ID
router.get('/:id', campaignsController.getCampaignById);

// Create new campaign
router.post('/', campaignsController.createCampaign);

// Update campaign
router.put('/:id', campaignsController.updateCampaign);

// Launch campaign
router.post('/:id/launch', campaignsController.launchCampaign);

// Cancel campaign
router.post('/:id/cancel', campaignsController.cancelCampaign);

// Delete campaign
router.delete('/:id', campaignsController.deleteCampaign);

module.exports = router;