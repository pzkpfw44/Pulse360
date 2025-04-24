// backend/services/flux-ai.service.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fluxAiConfig = require('../config/flux-ai');

/**
 * Uploads a file to Flux AI
 * @param {string} filePath - Path to the file to upload
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
        
        // Try ALL known header combinations to ensure we authenticate properly
        const headers = {
            ...form.getHeaders(),
            'X-API-KEY': fluxAiConfig.apiKey,
            'Authorization': `Bearer ${fluxAiConfig.apiKey}`
        };
        
        console.log(`Uploading file with explicit model: ${fluxAiConfig.model}`);
        
        const response = await axios.post(
            fluxAiConfig.getEndpointUrl('files'),
            form,
            { headers }
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
 * Makes a chat request to Flux AI with aggressive model enforcement
 * @param {Object} requestBody - The request body
 * @returns {Promise<Object>} - AI response
 */
async function makeAiChatRequest(requestBody) {
    try {
        // FORCE the model parameter in EVERY request
        const finalRequestBody = {
            ...requestBody,
            model: fluxAiConfig.model,
            // Add additional parameters to explicitly override model selection
            override_model: fluxAiConfig.model,
            use_model: fluxAiConfig.model
        };
        
        console.log(`Making AI request with FORCED model: ${finalRequestBody.model}`);
        console.log('Request body:', JSON.stringify(finalRequestBody, null, 2));
        
        // Try BOTH header formats to ensure one works
        const headers = {
            'Content-Type': 'application/json',
            'X-API-KEY': fluxAiConfig.apiKey,
            'Authorization': `Bearer ${fluxAiConfig.apiKey}`
        };
        
        const response = await axios.post(
            fluxAiConfig.getEndpointUrl('chat'),
            finalRequestBody,
            { headers }
        );
        
        console.log(`AI response received. Claimed model: ${response.data.model || 'unknown'}`);
        
        return response.data;
    } catch (error) {
        console.error('Error making AI chat request:', error);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
}

module.exports = {
  uploadFileToFluxAi,
  makeAiChatRequest
};