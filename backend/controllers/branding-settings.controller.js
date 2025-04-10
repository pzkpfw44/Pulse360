// backend/controllers/branding-settings.controller.js

const { BrandingSettings } = require('../models');

// Get branding settings
exports.getBrandingSettings = async (req, res) => {
  try {
    // Try to find settings for this user
    let settings = await BrandingSettings.findOne({
      where: { userId: req.user.id }
    });
    
    // If not found, return default settings
    if (!settings) {
      return res.status(200).json({
        companyName: '',
        industry: '',
        keyValues: '',
        tone: 'professional',
        formality: 'formal',
        personality: 'helpful'
      });
    }
    
    res.status(200).json(settings);
  } catch (error) {
    console.error('Error fetching branding settings:', error);
    res.status(500).json({ message: 'Failed to fetch branding settings', error: error.message });
  }
};

// Update branding settings
exports.updateBrandingSettings = async (req, res) => {
  try {
    const { companyName, industry, keyValues, tone, formality, personality } = req.body;
    
    // Try to find existing settings for this user
    let settings = await BrandingSettings.findOne({
      where: { userId: req.user.id }
    });
    
    if (settings) {
      // Update existing settings
      await settings.update({
        companyName,
        industry,
        keyValues,
        tone,
        formality,
        personality
      });
    } else {
      // Create new settings
      settings = await BrandingSettings.create({
        companyName,
        industry, 
        keyValues,
        tone,
        formality,
        personality,
        userId: req.user.id
      });
    }
    
    res.status(200).json(settings);
  } catch (error) {
    console.error('Error updating branding settings:', error);
    res.status(500).json({ message: 'Failed to update branding settings', error: error.message });
  }
};