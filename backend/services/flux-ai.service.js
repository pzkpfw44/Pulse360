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
    // CRITICAL: FORCE THE MODEL TO BE THE ONE FROM CONFIG
    requestBody.model = fluxAiConfig.model;
    
    console.log(`Making AI chat request to model: ${requestBody.model}`);
    
    // Log if we have file attachments
    if (requestBody.attachments && requestBody.attachments.files && requestBody.attachments.files.length > 0) {
      console.log(`Request includes ${requestBody.attachments.files.length} file attachments`);
    }
    
    // SEND THE REQUEST DIRECTLY WITHOUT ANY FALLBACK OR ALTERNATIVE FLOW
    const endpoint = fluxAiConfig.getEndpointUrl('chat');
    const response = await axios.post(endpoint, requestBody, {
      headers: {
        'Authorization': `Bearer ${fluxAiConfig.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.data) {
      throw new Error('Empty response from AI service');
    }
    
    console.log('Response model:', response.data.model || 'Not specified in response');
    
    return response.data;
  } catch (error) {
    console.error('Error making AI chat request:', error.message);
    
    if (error.response) {
      console.error('API error details:', error.response.data);
    }
    
    throw error; // Re-throw to be handled by caller
  }
}

module.exports = {
  uploadFileToFluxAi,
  makeAiChatRequest
};