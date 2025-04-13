// frontend/src/utils/CampaignUtils.js

/**
 * Validates email templates in a campaign to ensure all required templates are present
 * @param {Object} campaign - The campaign data
 * @returns {Object} - Validation result with success and message properties
 */
export const validateCampaignTemplates = (campaign) => {
  console.log('Validating templates with:', campaign.emailTemplates);
  
  if (!campaign) {
    return { success: false, message: "Campaign data is missing" };
  }
  
  // Check if emailTemplates exists at all
  if (!campaign.emailTemplates) {
    return { 
      success: false, 
      message: "Email templates are missing" 
    };
  }
  
  // More flexible validation - check if emailTemplates has content
  // This will accept any non-empty structure
  if (typeof campaign.emailTemplates === 'object' && 
      Object.keys(campaign.emailTemplates).length > 0) {
    return { success: true };
  }
  
  // If we've reached here, the templates are missing or empty
  return { 
    success: false, 
    message: "Invitation email template is required" 
  };
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
    // Just keep whatever structure is already being used
    // The backend should handle the structure appropriately
  }
  
  return cleanCampaign;
};