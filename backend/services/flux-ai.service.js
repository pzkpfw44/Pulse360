// backend/services/flux-ai.service.js
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const fluxAiConfig = require('../config/flux-ai');

/**
 * Uploads a file to FluxAI
 * @param {string} filePath - Path to the file to upload
 * @returns {Promise<object>} - Upload response
 */
async function uploadFileToFluxAi(filePath) {
  try {
    console.log(`Uploading file to FluxAI: ${filePath}`);
    
    const formData = new FormData();
    formData.append('files', fs.createReadStream(filePath));
    
    const response = await axios.post(
      fluxAiConfig.getEndpointUrl('files'),
      formData,
      {
        headers: {
          'Authorization': `Bearer ${fluxAiConfig.apiKey}`,
          ...formData.getHeaders()
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error uploading file to FluxAI:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Makes a chat request to FluxAI
 * @param {object} requestData - The request data
 * @returns {Promise<object>} - AI response
 */
async function makeAiChatRequest(requestData) {
  try {
    // Force the model to be the one specified in config
    requestData.model = fluxAiConfig.model;
    
    console.log(`Sending AI request with forced model: ${requestData.model}`);
    
    const response = await axios.post(
      fluxAiConfig.getEndpointUrl('chat'),
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${fluxAiConfig.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Force the model in the response to match our config
    if (response.data && response.data.model) {
      console.log(`Overriding response model from ${response.data.model} to ${fluxAiConfig.model}`);
      response.data.model = fluxAiConfig.model;
    }
    
    return response.data;
  } catch (error) {
    console.error('Error making AI chat request:', error);
    throw error;
  }
}

module.exports = {
  uploadFileToFluxAi,
  makeAiChatRequest
};