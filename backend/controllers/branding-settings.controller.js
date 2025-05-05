// backend/controllers/branding-settings.controller.js

const { BrandingSettings } = require('../models');

// Default values defined centrally
const defaultSettings = {
  companyName: '',
  industry: '',
  keyValues: '',
  tone: 'professional',
  formality: 'formal',
  personality: 'helpful',
  primaryColor: '#3B82F6',
  secondaryColor: '#2563EB',
  fontColorDark: '#1F2937',  // gray-800
  fontColorLight: '#FFFFFF', // white
  fontColorAccent: '#3B82F6', // Default to primary blue
};

// Get branding settings
exports.getBrandingSettings = async (req, res) => {
  try {
    let settings = await BrandingSettings.findOne({
      where: { userId: req.user.id } // Assuming req.user.id contains the authenticated user's ID
    });

    if (!settings) {
      // If no settings found for the user, return the centrally defined defaults
      return res.status(200).json(defaultSettings);
    }

    // Ensure all properties exist, merging with defaults for safety (handles legacy records)
    const response = {
        ...defaultSettings, // Start with defaults
        ...settings.toJSON() // Override with saved values
    };

    // Ensure secondaryColor isn't null if retrieved from DB as such (though model default should handle)
    response.secondaryColor = response.secondaryColor || defaultSettings.secondaryColor;
    // If fontColorAccent was saved before primaryColor existed or is null, default it based on primary
    response.fontColorAccent = response.fontColorAccent || response.primaryColor || defaultSettings.primaryColor;


    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching branding settings:', error);
    res.status(500).json({ message: 'Failed to fetch branding settings', error: error.message });
  }
};

// Update branding settings
exports.updateBrandingSettings = async (req, res) => {
  try {
    // Destructure all expected fields from the request body
    const {
      companyName,
      industry,
      keyValues,
      tone,
      formality,
      personality,
      primaryColor,
      secondaryColor,
      fontColorDark,
      fontColorLight,
      fontColorAccent
    } = req.body;

    // Prepare the data object with fallbacks to defaults ONLY if the value is undefined
    // If the user sends an empty string for e.g. companyName, we should save it as empty.
    // Colors should fall back to defaults if undefined or invalid, handled by model/hooks.
    const updateData = {
      companyName: companyName !== undefined ? companyName : defaultSettings.companyName,
      industry: industry !== undefined ? industry : defaultSettings.industry,
      keyValues: keyValues !== undefined ? keyValues : defaultSettings.keyValues,
      tone: tone || defaultSettings.tone,
      formality: formality || defaultSettings.formality,
      personality: personality || defaultSettings.personality,
      primaryColor: primaryColor || defaultSettings.primaryColor,
      // Let model handle secondary default if null/empty
      secondaryColor: secondaryColor !== undefined ? secondaryColor : defaultSettings.secondaryColor,
      fontColorDark: fontColorDark || defaultSettings.fontColorDark,
      fontColorLight: fontColorLight || defaultSettings.fontColorLight,
      // Default accent to primary if not provided explicitly
      fontColorAccent: fontColorAccent || primaryColor || defaultSettings.fontColorAccent,
    };

     // Find existing settings for this user
    let settings = await BrandingSettings.findOne({
      where: { userId: req.user.id } // Assuming req.user.id is available
    });

    if (settings) {
      // Update existing settings
      await settings.update(updateData);
    } else {
      // Create new settings if none exist
      settings = await BrandingSettings.create({
        ...updateData,
        userId: req.user.id // Make sure userId is included when creating
      });
    }

    // Return the updated or newly created settings
    // Ensure response includes defaults for any fields potentially missing after DB operation
     const response = {
        ...defaultSettings,
        ...settings.toJSON()
    };
     // Recalculate defaults just in case something went wrong in DB save
     response.secondaryColor = response.secondaryColor || defaultSettings.secondaryColor;
     response.fontColorAccent = response.fontColorAccent || response.primaryColor || defaultSettings.primaryColor;

    res.status(200).json(response);
  } catch (error) {
    console.error('Error updating branding settings:', error);
    // Provide more specific error feedback if it's a validation error
    if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
             message: 'Validation error saving branding settings.',
             errors: error.errors.map(e => ({ field: e.path, message: e.message }))
         });
    }
    res.status(500).json({ message: 'Failed to update branding settings', error: error.message });
  }
};