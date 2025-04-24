// backend/config/flux-ai.js

require('dotenv').config();

const config = {
  baseUrl: process.env.FLUX_AI_BASE_URL || 'https://ai.runonflux.com',
  apiKey: process.env.FLUX_AI_API_KEY,
  model: process.env.FLUX_AI_MODEL || 'DeepSeek R1 Distill Qwen 32B',
  maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE || '10485760', 10), // 10MB default
  forceAiInDevelopment: process.env.FORCE_AI_IN_DEV === 'true' || false,

  endpoints: {
    balance: '/v1/balance',
    llms: '/v1/llms',
    chat: '/v1/chat/completions',
    files: '/v1/files'
  },

  /**
   * Check if Flux AI is properly configured
   * @returns {Boolean}
   */
  isConfigured() {
    return !!this.apiKey && !!this.baseUrl;
  },

  isDevelopment: process.env.NODE_ENV === 'development',

  /**
   * Get the full endpoint URL
   * @param {String} endpoint - Either predefined endpoint key or custom path
   * @returns {String} - Full URL
   */
  getEndpointUrl: function(endpoint) {
    // Ensure baseUrl doesn't end with a slash
    const cleanBaseUrl = this.baseUrl.endsWith('/')
      ? this.baseUrl.substring(0, this.baseUrl.length - 1)
      : this.baseUrl;
    
    // Check if this is a predefined endpoint key
    if (this.endpoints[endpoint]) {
      return `${cleanBaseUrl}${this.endpoints[endpoint]}`;
    } 
    
    // Handle custom endpoint path
    let path = endpoint;
    
    // Ensure path starts with a slash if not already
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    // Ensure path starts with /v1/ prefix if needed
    if (!path.startsWith('/v1/') && !path.includes('/v1/')) {
      path = '/v1' + path;
    }
    
    return `${cleanBaseUrl}${path}`;
  },

  // Make sure we explicitly set the model in API calls
  getChatRequestBody: function(messages, options = {}) {
    return {
      model: this.model, // Ensure correct model is used
      messages: messages,
      temperature: options.temperature || 0.3,
      max_tokens: options.max_tokens || 2048,
      ...options
    };
  },

  getSystemPrompt: function(task) {
    const prompts = {
      document_analysis: "You are a specialized AI assistant for creating 360-degree feedback assessment questions. Your only job is to generate structured, relevant questions based on document analysis. DO NOT provide general explanations or summaries. ONLY generate specific feedback questions in the exact format requested.",
      
      question_generation: "You are an expert in designing 360-degree feedback questions. Your task is ONLY to create questions that are specific, actionable, and relevant to the perspective of the respondent. Follow the exact format provided in the prompt. DO NOT explain concepts or provide general information.",
      
      feedback_assistance: "You are an AI assistant helping provide constructive feedback...",
      
      report_generation: "You are an expert in analyzing 360-degree feedback data...",
      
      template_generation: "You are an expert in writing effective email templates for 360-degree feedback systems. Your goal is to create professional, clear, and well-structured emails that encourage participation and reflect the specified company voice. Your templates should be concise, effective, and follow HTML format."
    };
  
    return prompts[task] || prompts.document_analysis;
  }
};

module.exports = config;