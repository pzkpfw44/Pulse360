// Create a new file: frontend/src/utils/CampaignUtils.js

/**
 * Validates email templates in a campaign to ensure all required templates are present
 * @param {Object} campaign - The campaign data
 * @returns {Object} - Validation result with success and message properties
 */
export const validateCampaignTemplates = (campaign) => {
    if (!campaign) {
      return { success: false, message: "Campaign data is missing" };
    }
    
    // Check if emailTemplates object exists and has invitation templates
    if (!campaign.emailTemplates || 
        !campaign.emailTemplates.invitation ||
        Object.keys(campaign.emailTemplates.invitation).length === 0) {
      return { 
        success: false, 
        message: "Invitation email template is required" 
      };
    }
    
    // If we've reached here, all required templates are present
    return { success: true };
  };
  
  /**
   * Prepares campaign data for backend submission
   * @param {Object} campaign - The campaign data to prepare
   * @returns {Object} - The prepared campaign data
   */
  export const prepareCampaignForSubmission = (campaign) => {
    if (!campaign) return {};
    
    // Create a clean copy
    const cleanCampaign = {...campaign};
    
    // Ensure emailTemplates is properly structured
    if (cleanCampaign.emailTemplates) {
      // If templates are structured as arrays, convert to expected objects
      if (Array.isArray(cleanCampaign.emailTemplates)) {
        const templatesObj = {};
        cleanCampaign.emailTemplates.forEach(template => {
          if (!templatesObj[template.templateType]) {
            templatesObj[template.templateType] = {};
          }
          templatesObj[template.templateType][template.recipientType] = template;
        });
        cleanCampaign.emailTemplates = templatesObj;
      }
    }
    
    return cleanCampaign;
  };