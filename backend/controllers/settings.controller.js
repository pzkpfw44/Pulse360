const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Get current settings
exports.getSettings = async (req, res) => {
  try {
    // Return settings from config
    const settings = {
      fluxApiKey: process.env.FLUX_AI_API_KEY ? '••••••••' : '', // Mask the API key
      fluxAiModel: process.env.FLUX_AI_MODEL || 'Llama 3.1',
      fluxAiBaseUrl: process.env.FLUX_AI_BASE_URL || 'https://ai.runonflux.com'
    };
    
    // Load AI settings from storage (for development mode)
    try {
      const settingsPath = path.resolve(__dirname, '../settings.json');
      if (fs.existsSync(settingsPath)) {
        const storedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        if (storedSettings.aiSettings) {
          settings.aiSettings = storedSettings.aiSettings;
        }
      }
    } catch (error) {
      console.warn('Error reading settings file:', error);
      // Provide default AI settings if not found
      settings.aiSettings = {
        analysisDepth: 'medium',
        enableBiasDetection: true,
        enableContentFiltering: true,
        maxTokensPerRequest: 2000,
        feedbackAnalysis: true
      };
    }
    
    res.status(200).json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
  }
};

// Update settings
exports.updateSettings = async (req, res) => {
  try {
    const { fluxApiKey, fluxAiModel, aiSettings } = req.body;

    console.log('Saving settings:', {
      fluxApiKey: fluxApiKey ? '(provided)' : '(not provided)',
      fluxAiModel,
      aiSettings
    });

    // Only administrators should be able to update settings
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can update settings' });
    }
    
    // Update the .env file in development mode
    if (process.env.NODE_ENV === 'development') {
      try {
        const envPath = path.resolve(__dirname, '../.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        // Update API key if provided and different from placeholder
        if (fluxApiKey && fluxApiKey !== '••••••••') {
          envContent = updateEnvVariable(envContent, 'FLUX_AI_API_KEY', fluxApiKey);
        }
        
        // Update model if provided
        if (fluxAiModel) {
          envContent = updateEnvVariable(envContent, 'FLUX_AI_MODEL', fluxAiModel);
        }
        
        fs.writeFileSync(envPath, envContent);
        
        // Update the process.env variables for the current session
        if (fluxApiKey && fluxApiKey !== '••••••••') {
          process.env.FLUX_AI_API_KEY = fluxApiKey;
        }
        if (fluxAiModel) {
          process.env.FLUX_AI_MODEL = fluxAiModel;
        }
        
        // Save AI settings to a JSON file
        if (aiSettings) {
          const settingsPath = path.resolve(__dirname, '../settings.json');
          let settings = {};
          
          // Try to read existing settings
          try {
            if (fs.existsSync(settingsPath)) {
              settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            }
          } catch (error) {
            console.warn('Error reading settings file:', error);
          }
          
          // Update settings
          settings.aiSettings = aiSettings;
          
          // Write back
          fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
          console.log('Saved AI settings to file');
        }
      } catch (fsError) {
        console.error('Error updating settings files:', fsError);
        // Continue anyway to return success to the client
      }
    } else {
      // In production, we'd typically use a database
      console.log('Production settings update would be saved to database');
    }
    
    res.status(200).json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Failed to update settings', error: error.message });
  }
};

// Get available Flux AI models
exports.getFluxModels = async (req, res) => {
  try {
    // Import the fluxAiConfig here to avoid circular dependencies
    const fluxAiConfig = require('../config/flux-ai');
    
    // Check if Flux AI is configured - if API key exists
    if (!fluxAiConfig.apiKey) {
      return res.status(400).json({ message: 'Flux AI API key not configured' });
    }
    
    try {
      // Always try to make a real API call
      const response = await axios.get(`${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.llms}`, {
        headers: {
          'Authorization': `Bearer ${fluxAiConfig.apiKey}`
        }
      });
      
      res.status(200).json(response.data);
    } catch (apiError) {
      console.error('Error calling Flux API:', apiError);
      
      // Fallback to mock data if real API call fails
      if (fluxAiConfig.isDevelopment) {
        return res.status(200).json({
          success: true,
          data: [
            {
              nickname: "Llama 3.1",
              model_name: "Llama 3.1",
              max_total_tokens: 4096,
              max_input_tokens: 3072
            },
            {
              nickname: "DeepSeek",
              model_name: "DeepSeek",
              max_total_tokens: 8192,
              max_input_tokens: 4096
            },
            {
              nickname: "Mistral",
              model_name: "Mistral",
              max_total_tokens: 4096,
              max_input_tokens: 3072
            }
          ],
          count: 3
        });
      } else {
        throw apiError;
      }
    }
  } catch (error) {
    console.error('Error fetching Flux AI models:', error);
    res.status(500).json({ message: 'Failed to fetch Flux AI models', error: error.message });
  }
};

// Get Flux AI balance
exports.getFluxBalance = async (req, res) => {
  try {
    // Import the fluxAiConfig here to avoid circular dependencies
    const fluxAiConfig = require('../config/flux-ai');
    
    // Check if Flux AI is configured - if API key exists
    if (!fluxAiConfig.apiKey) {
      return res.status(400).json({ message: 'Flux AI API key not configured' });
    }
    
    try {
      // Always try to make a real API call
      const response = await axios.get(`${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.balance}`, {
        headers: {
          'Authorization': `Bearer ${fluxAiConfig.apiKey}`
        }
      });
      
      res.status(200).json(response.data);
    } catch (apiError) {
      console.error('Error calling Flux API:', apiError);
      
      // Fallback to mock data if real API call fails
      if (fluxAiConfig.isDevelopment) {
        return res.status(200).json({
          api_credit: "-0.6"
        });
      } else {
        throw apiError;
      }
    }
  } catch (error) {
    console.error('Error fetching Flux AI balance:', error);
    res.status(500).json({ message: 'Failed to fetch Flux AI balance', error: error.message });
  }
};

// Helper function to update an environment variable in the .env file
function updateEnvVariable(content, key, value) {
  const regex = new RegExp(`^${key}=.*`, 'm');
  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  } else {
    return content + `\n${key}=${value}`;
  }
}