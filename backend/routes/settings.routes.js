const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const axios = require('axios');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get current settings
router.get('/', settingsController.getSettings);

// Update settings
router.put('/', settingsController.updateSettings);

// Get Flux AI models
router.get('/flux/models', settingsController.getFluxModels);

// Get Flux AI balance
router.get('/flux/balance', settingsController.getFluxBalance);

// Enhanced route to properly test Flux AI connection with a real API call
router.get('/flux/status', async (req, res) => {
  const fluxAiConfig = require('../config/flux-ai');
  
  try {
    // Check if the API key is configured
    if (!fluxAiConfig.apiKey) {
      return res.status(200).json({
        status: 'error',
        message: 'API key not configured',
        isConfigured: false,
        isDevelopment: fluxAiConfig.isDevelopment,
        baseUrl: fluxAiConfig.baseUrl
      });
    }
    
    // Make a real API call to test the connection
    const response = await axios.get(
      fluxAiConfig.getEndpointUrl('llms'),
      {
        headers: {
          'Authorization': `Bearer ${fluxAiConfig.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return res.status(200).json({
      status: 'success',
      message: 'Successfully connected to Flux AI',
      isConfigured: true,
      isDevelopment: fluxAiConfig.isDevelopment,
      baseUrl: fluxAiConfig.baseUrl,
      apiTest: true,
      models: response.data
    });
  } catch (error) {
    console.error('Flux AI connection test failed:', error.message);
    
    return res.status(200).json({
      status: 'error',
      message: `Connection failed: ${error.message}`,
      isConfigured: fluxAiConfig.isConfigured(),
      isDevelopment: fluxAiConfig.isDevelopment,
      baseUrl: fluxAiConfig.baseUrl,
      apiTest: false,
      error: error.message
    });
  }
});

module.exports = router;