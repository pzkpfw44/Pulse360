// backend/services/ai-feedback-service.js

const axios = require('axios');
const fluxAiConfig = require('../config/flux-ai');
require('dotenv').config();

/**
 * Service to evaluate feedback using AI
 */
class AiFeedbackService {
  constructor() {
    this.apiKey = fluxAiConfig.apiKey;
    this.baseUrl = fluxAiConfig.baseUrl;
    this.model = fluxAiConfig.model;
  }

  /**
   * Evaluate feedback for quality, balance, confidentiality, and constructiveness
   * @param {Object} feedbackData - The feedback responses
   * @param {string} assessorType - The type of assessor (manager, peer, direct_report, self, external)
   * @param {string} targetEmployeeId - ID of the employee receiving feedback
   * @returns {Promise<Object>} - Evaluation results
   */
  async evaluateFeedback(feedbackData, assessorType, targetEmployeeId) {
    try {
      // Prepare the feedback text for evaluation
      const feedbackText = this.prepareFeedbackText(feedbackData);
      
      // Skip evaluation if no text feedback provided
      if (!feedbackText) {
        return {
          status: 'success',
          message: 'No written feedback to evaluate. You can submit your assessment.',
          suggestions: []
        };
      }
      
      // Create evaluation prompt
      const prompt = this.createEvaluationPrompt(feedbackText, assessorType);
      
      // Call AI API using FluxAI config
      const response = await axios.post(fluxAiConfig.getEndpointUrl('chat'), {
        messages: [
          {
            role: "system",
            content: "You are an expert in workplace feedback. Your role is to analyze feedback for quality, balance, constructiveness, and confidentiality."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: this.model,
        stream: false
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey
        }
      });
      
      // Parse and return the evaluation results
      return this.parseEvaluationResponse(response.data);
    } catch (error) {
      console.error('AI evaluation error:', error);
      
      // In development mode, return mock evaluation
      if (process.env.NODE_ENV === 'development') {
        return this.getMockEvaluation(feedbackData);
      }
      
      throw error;
    }
  }
  
  /**
   * Prepare the feedback text from all responses
   */
  prepareFeedbackText(feedbackData) {
    if (!feedbackData || Object.keys(feedbackData).length === 0) {
      return '';
    }
    
    let feedbackText = '';
    
    Object.entries(feedbackData).forEach(([questionId, data]) => {
      if (data.response && data.response.trim()) {
        feedbackText += `Question: ${data.question}\n`;
        feedbackText += `Response: ${data.response}\n\n`;
      }
    });
    
    return feedbackText.trim();
  }
  
  /**
   * Create the evaluation prompt for the AI
   */
  createEvaluationPrompt(feedbackText, assessorType) {
    return `
    Please evaluate the following ${assessorType} feedback for a 360-degree assessment.
    
    ${feedbackText}
    
    Analyze this feedback based on the following criteria:
    1. Specificity: Is the feedback specific with examples rather than vague generalizations?
    2. Constructiveness: Does it provide actionable insights for improvement?
    3. Balance: Does it include both strengths and areas for development?
    4. Confidentiality: Does it avoid revealing the assessor's identity or including sensitive details?
    5. Tone: Is the language respectful and professional? Flag ANY offensive language like "moron," "idiot," etc.
    6. Appropriateness: Flag any suggestions like "quit," "find another job," etc. that aren't constructive.
    
    Output format (respond in valid JSON exactly as shown):
    {
      "status": "success" or "needs_improvement",
      "message": "Brief explanation of the overall assessment",
      "suggestions": ["suggestion1", "suggestion2", "suggestion3"]
    }
    
    For any feedback with offensive language, disrespectful tone, or unprofessional comments, the status MUST be "needs_improvement" even if other criteria are met.
    `;
  }
  
  /**
   * Parse the AI response into a structured evaluation
   */
  parseEvaluationResponse(responseData) {
    try {
      // Extract the AI's response
      const aiResponse = responseData.choices[0].message.content;
      
      // Try to parse as JSON
      try {
        return JSON.parse(aiResponse);
      } catch (e) {
        // If not valid JSON, extract information manually
        const status = aiResponse.includes('success') ? 'success' : 'needs_improvement';
        
        // Extract message (first paragraph)
        const message = aiResponse.split('\n')[0].replace(/^[^a-zA-Z]+/, '');
        
        // Extract suggestions (lines starting with - or numbers)
        const suggestions = aiResponse
          .split('\n')
          .filter(line => /^[\s-]*[•\-\d]+\s/.test(line))
          .map(line => line.replace(/^[\s-]*[•\-\d]+\s/, ''));
        
        return {
          status,
          message,
          suggestions: suggestions || []
        };
      }
    } catch (error) {
      console.error('Error parsing AI evaluation response:', error);
      return {
        status: 'error',
        message: 'Unable to evaluate feedback due to technical issues. You can proceed or revise manually.',
        suggestions: []
      };
    }
  }
  
  /**
   * Get a mock evaluation for development purposes
   */
  getMockEvaluation(feedbackData) {
    const feedbackText = this.prepareFeedbackText(feedbackData);
    const wordCount = feedbackText.split(/\s+/).length;
    
    // Enhanced pattern matching for problematic content
    const containsOffensiveLanguage = /moron|idiot|stupid|incompetent|useless|dumb|sucks|terrible|awful/i.test(feedbackText);
    const containsUnprofessionalAdvice = /quit|leave|find another|fire|get rid|fired|resign/i.test(feedbackText);
    const hasMinimalResponses = /^[-.]$|^.{1,5}$/m.test(feedbackText);
    const hasIdentifiers = /I|me|my team|our|we worked together|I think|in my opinion/i.test(feedbackText);
    
    // Check for balance
    const hasPositive = /excellent|great|good|strength|well done|impressive|skilled|effective|capable/i.test(feedbackText);
    const hasNegative = /improve|could be better|challenge|difficult|struggle|weakness|limitation/i.test(feedbackText);
    const hasActionable = /suggest|try|consider|recommend|could|should|might want to|would benefit from/i.test(feedbackText);
    
    // Different response types based on feedback content
    if (containsOffensiveLanguage) {
      return {
        status: 'needs_improvement',
        message: 'Your feedback contains inappropriate or offensive language that is not constructive.',
        suggestions: [
          'Remove offensive terms like "moron" and use professional language',
          'Focus on behaviors rather than making personal judgments',
          'Describe the specific behaviors that concern you rather than using labels'
        ]
      };
    } else if (containsUnprofessionalAdvice) {
      return {
        status: 'needs_improvement',
        message: 'Your feedback contains suggestions that are not constructive for professional development.',
        suggestions: [
          'Focus on actionable improvements rather than suggesting career changes',
          'Provide specific development suggestions that can be implemented in the current role',
          'Recommend specific skills or behaviors that could be improved'
        ]
      };
    } else if (hasMinimalResponses) {
      return {
        status: 'needs_improvement',
        message: 'Some of your responses are too brief to be meaningful. Please provide more detail.',
        suggestions: [
          'Elaborate on all questions with substantive responses',
          'Provide specific examples to support your feedback',
          'Ensure all required questions have complete answers'
        ]
      };
    } else if (wordCount < 20) {
      return {
        status: 'needs_improvement',
        message: 'Your feedback is too brief to be meaningful. Consider adding more detail and specific examples.',
        suggestions: [
          'Add specific examples of observed behaviors',
          'Expand your feedback with more context',
          'Provide actionable suggestions for improvement'
        ]
      };
    } else if (!hasPositive && hasNegative) {
      return {
        status: 'needs_improvement',
        message: 'Your feedback focuses primarily on areas for improvement without acknowledging strengths.',
        suggestions: [
          'Balance criticism by acknowledging specific strengths',
          'Begin with positive observations before addressing areas for improvement',
          'Consider using the "feedback sandwich" approach: positive-improvement-positive'
        ]
      };
    } else if (hasPositive && !hasNegative) {
      return {
        status: 'needs_improvement',
        message: 'Your feedback is positive but lacks constructive areas for development.',
        suggestions: [
          'Include some areas where growth would be beneficial',
          'Suggest specific skills that could be further developed',
          'Provide balanced feedback by mentioning both strengths and areas for improvement'
        ]
      };
    } else if (!hasActionable) {
      return {
        status: 'needs_improvement',
        message: 'Your feedback lacks specific, actionable recommendations for improvement.',
        suggestions: [
          'Include specific actions the person could take to improve',
          'Suggest resources or approaches that might help them develop',
          'Be more specific about how certain behaviors could be enhanced'
        ]
      };
    } else if (hasIdentifiers) {
      return {
        status: 'needs_improvement',
        message: 'Your feedback contains details that might reveal your identity, which could compromise confidentiality.',
        suggestions: [
          'Remove personal pronouns that could identify you',
          'Focus on observed behaviors rather than your interactions',
          'Avoid mentioning specific projects or events that only you would know about'
        ]
      };
    } else {
      return {
        status: 'success',
        message: 'Your feedback is balanced, specific, and constructive. It provides clear examples and actionable suggestions for improvement.',
        suggestions: []
      };
    }
  }
}

module.exports = new AiFeedbackService();