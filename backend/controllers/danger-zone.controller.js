// backend/controllers/danger-zone.controller.js

const { Campaign, CampaignParticipant } = require('../models');

/**
 * Controller for handling dangerous system-wide operations
 */
class DangerZoneController {
  /**
   * Disable AI for all campaigns, including active ones
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async disableAiForAllCampaigns(req, res) {
    try {
      // Only admin users can perform this operation
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          message: 'Only administrators can perform this operation'
        });
      }
      
      // Update all campaigns to use fallback AI
      // We need to use raw SQL for SQLite because Sequelize's update may not work correctly
      const [updatedCount] = await Campaign.sequelize.query(
        "UPDATE campaigns SET useFullAiSupport = 0;",
        { type: Campaign.sequelize.QueryTypes.UPDATE }
      );
      
      console.log(`Updated all campaigns to use fallback AI mode`);
      
      // Log this action for audit purposes
      console.log(`User ${req.user.id} (${req.user.email}) disabled AI for all campaigns at ${new Date().toISOString()}`);
      
      // Return success
      return res.status(200).json({
        message: 'Successfully disabled AI for all campaigns',
        affectedCampaigns: updatedCount || 'all'
      });
    } catch (error) {
      console.error('Error disabling AI for campaigns:', error);
      
      return res.status(500).json({
        message: 'An error occurred while disabling AI for campaigns',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new DangerZoneController();