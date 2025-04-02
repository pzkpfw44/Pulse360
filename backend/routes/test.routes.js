// backend/routes/test.routes.js

const express = require('express');
const router = express.Router();
const axios = require('axios');
const fluxAiConfig = require('../config/flux-ai');

// Test Flux AI API connectivity
router.get('/flux-api', async (req, res) => {
  try {
    console.log('Testing Flux AI API connectivity...');
    console.log('Flux config:', {
      baseUrl: fluxAiConfig.baseUrl,
      apiKeyPresent: !!fluxAiConfig.apiKey,
      apiKeyLength: fluxAiConfig.apiKey ? fluxAiConfig.apiKey.length : 0,
      model: fluxAiConfig.model,
      endpoints: fluxAiConfig.endpoints
    });
    
    // First, try to get available models
    let modelsResponse;
    try {
      modelsResponse = await axios.get(
        `${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.llms}`,
        {
          headers: {
            'X-API-KEY': fluxAiConfig.apiKey
          }
        }
      );
      console.log('Models API response:', modelsResponse.data);
    } catch (modelsError) {
      console.error('Models API error:', modelsError.message);
      
      // Try with different auth
      try {
        modelsResponse = await axios.get(
          `${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.llms}`,
          {
            headers: {
              'Authorization': `Bearer ${fluxAiConfig.apiKey}`
            }
          }
        );
        console.log('Models API response with Bearer auth:', modelsResponse.data);
      } catch (bearerError) {
        console.error('Models API error with Bearer auth:', bearerError.message);
      }
    }
    
    // Second, try to get balance
    let balanceResponse;
    try {
      balanceResponse = await axios.get(
        `${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.balance}`,
        {
          headers: {
            'X-API-KEY': fluxAiConfig.apiKey
          }
        }
      );
      console.log('Balance API response:', balanceResponse.data);
    } catch (balanceError) {
      console.error('Balance API error:', balanceError.message);
      
      // Try with different auth
      try {
        balanceResponse = await axios.get(
          `${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.balance}`,
          {
            headers: {
              'Authorization': `Bearer ${fluxAiConfig.apiKey}`
            }
          }
        );
        console.log('Balance API response with Bearer auth:', balanceResponse.data);
      } catch (bearerError) {
        console.error('Balance API error with Bearer auth:', bearerError.message);
      }
    }
    
    // Third, make a simple chat request without files
    let chatResponse;
    try {
      chatResponse = await axios.post(
        `${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.chat}`,
        {
          messages: [
            {
              role: "user",
              content: "Hello, can you tell me how to attach files to API requests?"
            }
          ],
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': fluxAiConfig.apiKey
          }
        }
      );
      console.log('Chat API response:', chatResponse.data);
    } catch (chatError) {
      console.error('Chat API error:', chatError.message);
      
      // Try with different auth
      try {
        chatResponse = await axios.post(
          `${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.chat}`,
          {
            messages: [
              {
                role: "user",
                content: "Hello, can you tell me how to attach files to API requests?"
              }
            ],
            stream: false
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${fluxAiConfig.apiKey}`
            }
          }
        );
        console.log('Chat API response with Bearer auth:', chatResponse.data);
      } catch (bearerError) {
        console.error('Chat API error with Bearer auth:', bearerError.message);
      }
    }
    
    // Return results
    res.status(200).json({
      message: 'API test completed',
      config: {
        baseUrl: fluxAiConfig.baseUrl,
        apiKeyPresent: !!fluxAiConfig.apiKey,
        apiKeyLength: fluxAiConfig.apiKey ? fluxAiConfig.apiKey.length : 0,
        model: fluxAiConfig.model
      },
      endpoints: {
        models: modelsResponse?.data || null,
        balance: balanceResponse?.data || null,
        chat: chatResponse?.data || null
      }
    });
  } catch (error) {
    console.error('API test error:', error);
    res.status(500).json({ 
      message: 'API test failed', 
      error: error.message 
    });
  }
});

module.exports = router;