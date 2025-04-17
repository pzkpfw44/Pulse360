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

// Complete campaign
router.post('/:id/complete', campaignsController.completeCampaign);

// Auto-complete all campaigns with 100% completion rate
router.post('/auto-complete', campaignsController.autoCompleteFullCampaigns);

// Debug endpoint to fix campaigns stuck at 100% but still active
router.post('/fix-completed', async (req, res) => {
    try {
      // Find all active campaigns with 100% completion
      const campaigns = await Campaign.findAll({
        where: {
          status: 'active',
          completionRate: 100
        }
      });
      
      if (campaigns.length === 0) {
        return res.status(200).json({
          message: 'No campaigns need fixing',
          count: 0
        });
      }
      
      // Update them to completed
      const campaignIds = campaigns.map(c => c.id);
      await Campaign.update(
        { status: 'completed' },
        { where: { id: campaignIds } }
      );
      
      res.status(200).json({
        message: `Fixed ${campaigns.length} campaigns`,
        campaignIds
      });
    } catch (error) {
      res.status(500).json({
        message: 'Error fixing campaigns',
        error: error.message
      });
    }
  });

module.exports = router;