// backend/services/flux-ai.service.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fluxAiConfig = require('../config/flux-ai');

/**
 * Uploads a file to Flux AI
 * @param {string} filePath - Path to the file to upload
 * @param {string} model - The AI model to use for analysis
 * @returns {Promise<Object>} - Upload response
 */
async function uploadFileToFluxAi(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
        }
        
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath), {
        filename: path.basename(filePath),
        contentType: 'application/octet-stream'
        });
        
        // Add model parameter explicitly
        form.append('model', fluxAiConfig.model);
        
        const response = await axios.post(
        fluxAiConfig.getEndpointUrl('files'),
        form,
        {
            headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${fluxAiConfig.apiKey}`
            }
        }
        );
        
        return {
        success: true,
        data: response.data
        };
    } catch (error) {
        console.error('Error uploading file to Flux AI:', error);
        return {
        success: false,
        error: error.message
        };
    }
    }

    /**
     * Makes a chat request to Flux AI
     * @param {Object} requestBody - The request body
     * @returns {Promise<Object>} - AI response
     */
    async function makeAiChatRequest(requestBody) {
    try {
        // Ensure model is always set
        if (!requestBody.model) {
        requestBody.model = fluxAiConfig.model;
        }
        
        console.log(`Making AI request with model: ${requestBody.model}`);
        
        const response = await axios.post(
        fluxAiConfig.getEndpointUrl('chat'),
        requestBody,
        {
            headers: {
            'Authorization': `Bearer ${fluxAiConfig.apiKey}`,
            'Content-Type': 'application/json'
            }
        }
        );
        
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