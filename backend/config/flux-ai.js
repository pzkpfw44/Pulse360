// config/flux-ai.js

require('dotenv').config();

const config = {
  baseUrl: process.env.FLUX_AI_BASE_URL || 'https://ai.runonflux.com',
  apiKey: process.env.FLUX_AI_API_KEY,
  model: process.env.FLUX_AI_MODEL ? process.env.FLUX_AI_MODEL.trim() : 'DeepSeek R1 Distill Qwen 32B',
  modelId: process.env.FLUX_AI_MODEL_ID || 'DeepSeek-R1-Distill-Qwen-32B',
  maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE || '10485760', 10), // 10MB default

  endpoints: {
    balance: '/v1/balance',
    llms: '/v1/llms',
    chat: '/v1/chat/completions',
    files: '/v1/files'
  },

  isConfigured: function() {
    return !!this.apiKey;
  },

  isDevelopment: process.env.NODE_ENV === 'development',

  getEndpointUrl: function(endpoint) {
    return `${this.baseUrl}${this.endpoints[endpoint]}`;
  },

  getSystemPrompt: function(task) {
    const prompts = {
      document_analysis: "You are a specialized AI assistant for creating 360-degree feedback assessment questions. Your only job is to generate structured, relevant questions based on document analysis. DO NOT provide general explanations or summaries. ONLY generate specific feedback questions in the exact format requested.",
      
      question_generation: "You are an expert in designing 360-degree feedback questions. Your task is ONLY to create questions that are specific, actionable, and relevant to the perspective of the respondent. Follow the exact format provided in the prompt. DO NOT explain concepts or provide general information.",
      
      feedback_assistance: "You are an AI assistant helping provide constructive feedback...",
      
      report_generation: "You are an expert in analyzing 360-degree feedback data..."
    };
  
    return prompts[task] || prompts.document_analysis;
  }
};

module.exports = config;
