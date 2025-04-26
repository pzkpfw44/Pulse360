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
    // Check available storage space before uploading
    const spaceCheck = await checkStorageBeforeUpload(filePath);
    if (!spaceCheck.success) {
      return spaceCheck; // Return the error response
    }

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
      
      // Check if error is related to storage space
      if (error.response.data.error && 
          error.response.data.error.includes('storage')) {
        return {
          success: false,
          errorType: 'storage_limit',
          error: 'Insufficient storage space in Flux AI account',
          details: error.response.data
        };
      }
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

/**
 * Get storage information from the Flux AI API
 * @returns {Promise<Object>} - The storage info response
 */
async function getStorageInfo() {
  try {
    const filesEndpoint = fluxAiConfig.getEndpointUrl('files');
    
    // Try both possible endpoints
    try {
      const response = await axios.get(filesEndpoint, {
        headers: {
          'Authorization': `Bearer ${fluxAiConfig.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      return {
        success: true,
        totalStorage: response.data.storage_total || 0,
        usedStorage: response.data.storage_used || 0,
        availableStorage: response.data.storage_available || 0,
        files: response.data.data || []
      };
    } catch (err) {
      // If first endpoint fails, try the alternative chat/files endpoint
      console.log('Primary files endpoint failed, trying alternate endpoint');
      const altEndpoint = fluxAiConfig.baseUrl + '/v1/chat/files';
      
      const response = await axios.get(altEndpoint, {
        headers: {
          'Authorization': `Bearer ${fluxAiConfig.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      return {
        success: true,
        totalStorage: response.data.storage_total || 0,
        usedStorage: response.data.storage_used || 0,
        availableStorage: response.data.storage_available || 0,
        files: response.data.data || []
      };
    }
  } catch (error) {
    console.error('Error getting storage info:', error.message);
    return { 
      success: false, 
      error: error.message,
      totalStorage: 0,
      usedStorage: 0,
      availableStorage: 0,
      files: []
    };
  }
}

/**
 * List all files in the Flux AI account
 * @returns {Promise<Array>} - Array of file objects
 */
async function listFluxAiFiles() {
  try {
    const storageInfo = await getStorageInfo();
    return {
      success: storageInfo.success,
      files: storageInfo.files || []
    };
  } catch (error) {
    console.error('Error listing Flux AI files:', error.message);
    return { success: false, error: error.message, files: [] };
  }
}

/**
 * Delete a file from the Flux AI account
 * @param {string} fileId - The ID of the file to delete
 * @returns {Promise<Object>} - The deletion response
 */
async function deleteFluxAiFile(fileId) {
  try {
    if (!fileId) {
      return { success: false, error: 'No file ID provided' };
    }
    
    const filesEndpoint = `${fluxAiConfig.getEndpointUrl('files')}/${fileId}`;
    
    // Try the primary endpoint first
    try {
      await axios.delete(filesEndpoint, {
        headers: {
          'Authorization': `Bearer ${fluxAiConfig.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      return { success: true, message: 'File deleted successfully' };
    } catch (err) {
      // If primary endpoint fails, try alternate endpoint
      console.log('Primary delete endpoint failed, trying alternate endpoint');
      const altEndpoint = `${fluxAiConfig.baseUrl}/v1/chat/files/${fileId}`;
      
      await axios.delete(altEndpoint, {
        headers: {
          'Authorization': `Bearer ${fluxAiConfig.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      return { success: true, message: 'File deleted successfully' };
    }
  } catch (error) {
    console.error('Error deleting Flux AI file:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Check if there's enough storage space before uploading a file
 * @param {string} filePath - Path to the file to upload
 * @returns {Promise<Object>} - Check result with success status
 */
async function checkStorageBeforeUpload(filePath) {
  try {
    // Get file size
    const stats = await fs.stat(filePath);
    const fileSize = stats.size;
    
    // Get storage info
    const storageInfo = await getStorageInfo();
    
    if (!storageInfo.success) {
      return { 
        success: false, 
        error: 'Unable to check storage space. Storage info not available.',
        errorType: 'storage_check_failed'
      };
    }
    
    // Check if there's enough space
    if (fileSize > storageInfo.availableStorage) {
      return {
        success: false,
        errorType: 'insufficient_space',
        error: 'Insufficient storage space',
        details: {
          fileSize,
          availableStorage: storageInfo.availableStorage,
          usedStorage: storageInfo.usedStorage,
          totalStorage: storageInfo.totalStorage
        }
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error checking storage space:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  uploadFileToFluxAi,
  makeAiChatRequest,
  getStorageInfo,
  listFluxAiFiles,
  deleteFluxAiFile,
  checkStorageBeforeUpload
};