// config/flux-ai.js

require('dotenv').config();

const config = {
  baseUrl: process.env.FLUX_AI_BASE_URL || 'https://ai.runonflux.com/api',
  apiKey: process.env.FLUX_AI_API_KEY,
  model: process.env.FLUX_AI_MODEL || 'Llama 3.1',
  maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE || '10485760', 10), // 10MB default max size
  
  // Helper function to check if Flux AI is properly configured
  isConfigured: function() {
    return !!this.apiKey;
  },
  
  // Are we in development mode?
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // Helper function for generating system prompts based on task
  getSystemPrompt: function(task) {
    const prompts = {
      'document_analysis': 'You are an expert in organizational development and HR practices, specializing in 360-degree feedback. Analyze the provided documents and extract key competencies, behaviors, and expectations that should be evaluated in a 360-degree feedback assessment.',
      
      'question_generation': 'You are an expert in designing effective 360-degree feedback assessments. Based on the provided information, generate clear, specific, and actionable questions that will help evaluate the individual from multiple perspectives.',
      
      'feedback_assistance': 'You are an AI assistant helping provide constructive feedback. Help the evaluator articulate their observations clearly, focusing on specific behaviors rather than personal traits. Ensure the feedback is balanced, specific, and actionable.',
      
      'report_generation': 'You are an expert in analyzing 360-degree feedback data. Summarize the feedback in a constructive way, highlighting patterns, strengths, and development areas. Focus on actionable insights and avoid personally identifiable information from individual respondents.'
    };
    
    return prompts[task] || prompts.document_analysis;
  }
};

module.exports = config;