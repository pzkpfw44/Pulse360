// backend/services/flux-ai.service.js

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const FormData = require('form-data');
const fluxAiConfig = require('../config/flux-ai');

/**
 * Upload a file to the Flux AI API
 * @param {string} filePath - Path to the file to upload
 * @returns {Promise<Object>} - The response from the API
 */
async function uploadFileToFluxAi(filePath) {
  try {
    // Read the file
    const fileContent = await fs.readFile(filePath);
    
    // Create form data
    const form = new FormData();
    form.append('file', fileContent, path.basename(filePath));
    
    // Make the upload request
    const endpoint = fluxAiConfig.getEndpointUrl('files');
    
    const response = await axios.post(endpoint, form, {
      headers: {
        'Authorization': `Bearer ${fluxAiConfig.apiKey}`,
        ...form.getHeaders()
      }
    });
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error uploading file to Flux AI:', error.message);
    
    if (error.response) {
      console.error('API error details:', error.response.data);
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * Make a chat request to the Flux AI API
 * @param {Object} requestBody - The request body to send
 * @returns {Promise<Object>} - The response from the API
 */
async function makeAiChatRequest(requestBody) {
  try {
    // Force the model exactly as specified in config
    const configuredModel = fluxAiConfig.model.trim();
    console.log(`Using configured model: ${configuredModel}`);
    requestBody.model = configuredModel;
    
    // Remove any undefined parameters to avoid API issues
    Object.keys(requestBody).forEach(key => {
      if (requestBody[key] === undefined) {
        delete requestBody[key];
      }
    });
    
    // Log complete request for debugging
    console.log(`AI request payload:`, JSON.stringify({
      model: requestBody.model,
      temperature: requestBody.temperature,
      hasAttachments: !!requestBody.attachments,
      mode: requestBody.mode
    }));
    
    // Make direct API request - NO FALLBACKS
    const endpoint = fluxAiConfig.getEndpointUrl('chat');
    const response = await axios.post(endpoint, requestBody, {
      headers: {
        'Authorization': `Bearer ${fluxAiConfig.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response received, model used:', response.data?.model || 'Not specified');
    return response.data;
  } catch (error) {
    console.error('Error making AI chat request:', error.message);
    throw error; // Always throw to let caller handle
  }
}

module.exports = {
  uploadFileToFluxAi,
  makeAiChatRequest
};