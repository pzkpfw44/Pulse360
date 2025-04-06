// services/ai-feedback-service.js
const axios = require('axios');
const fluxAiConfig = require('../config/flux-ai');

/**
 * Service for evaluating feedback quality using FluxAI
 */
class AiFeedbackService {
  /**
   * Evaluate feedback for quality, constructiveness, and appropriateness using FluxAI
   * @param {Array} responses - Array of response objects
   * @param {string} assessorType - Type of assessor (manager, peer, direct_report, etc.)
   * @param {string} targetEmployeeId - ID of the target employee
   * @returns {Object} Evaluation results
   */
  async evaluateFeedback(responses, assessorType, targetEmployeeId) {
    try {
      console.log('Evaluating feedback using FluxAI');
      
      if (!fluxAiConfig.isConfigured()) {
        console.warn('FluxAI is not properly configured. Falling back to rule-based evaluation.');
        return this.fallbackEvaluation(responses, assessorType);
      }
      
      // Format the responses for better AI analysis
      const formattedFeedback = this.formatFeedbackForAI(responses, assessorType);
      
      // Create a prompt for the AI to evaluate the feedback
      const prompt = this.createEvaluationPrompt(formattedFeedback, assessorType);
      
      // Make the API call to FluxAI
      const response = await axios.post(
        `${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.chat}`,
        {
          messages: [
            {
              role: "system",
              content: "You are an expert in evaluating 360-degree feedback quality. Your task is to analyze feedback for constructiveness, specificity, professionalism, and actionability. Provide structured JSON output as specified in the prompt."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          stream: false,
          model: fluxAiConfig.model
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': fluxAiConfig.apiKey
          }
        }
      );
      
      // Extract the AI's response
      const aiResponseContent = response.data?.choices?.[0]?.message?.content;
      
      if (!aiResponseContent) {
        console.warn('FluxAI returned an empty or invalid response. Falling back to rule-based evaluation.');
        return this.fallbackEvaluation(responses, assessorType);
      }
      
      // Parse the AI's JSON response
      let evaluationResult;
      try {
        // Extract JSON from the response (handle cases where AI might wrap it in markdown code blocks)
        const jsonMatch = aiResponseContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                          aiResponseContent.match(/```\s*([\s\S]*?)\s*```/) ||
                          [null, aiResponseContent];
                          
        const jsonStr = jsonMatch[1].trim();
        evaluationResult = JSON.parse(jsonStr);
      } catch (jsonError) {
        console.error('Error parsing AI response as JSON:', jsonError);
        console.log('Raw AI response:', aiResponseContent);
        return this.fallbackEvaluation(responses, assessorType);
      }
      
      // Transform the AI evaluation into our standard format
      return this.processAIEvaluation(evaluationResult, responses);
      
    } catch (error) {
      console.error('Error in AI feedback evaluation:', error);
      // Fallback to rule-based evaluation if AI evaluation fails
      return this.fallbackEvaluation(responses, assessorType);
    }
  }
  
  /**
   * Format feedback data for AI analysis
   * @param {Array} responses - Array of response objects
   * @param {string} assessorType - Type of assessor
   * @returns {String} Formatted feedback text
   */
  formatFeedbackForAI(responses, assessorType) {
    let result = `Assessor Type: ${assessorType}\n\n`;
    
    // Group responses by type
    const ratingQuestions = responses.filter(r => r.questionType === 'rating' && r.rating);
    const openEndedQuestions = responses.filter(r => r.questionType === 'open_ended');
    
    if (ratingQuestions.length > 0) {
      result += "RATING QUESTIONS:\n";
      ratingQuestions.forEach((response, index) => {
        result += `Question ${index + 1}: ${response.questionText}\n`;
        result += `Category: ${response.category}\n`;
        result += `Rating: ${response.rating}/5\n\n`;
      });
    }
    
    if (openEndedQuestions.length > 0) {
      result += "OPEN-ENDED QUESTIONS:\n";
      openEndedQuestions.forEach((response, index) => {
        result += `Question ${index + 1}: ${response.questionText}\n`;
        result += `Category: ${response.category}\n`;
        result += `Response: "${response.text}"\n\n`;
      });
    }
    
    return result;
  }
  
  /**
   * Create a prompt for the AI to evaluate the feedback
   * @param {String} formattedFeedback - Formatted feedback text
   * @param {string} assessorType - Type of assessor
   * @returns {String} Prompt for AI evaluation
   */
  createEvaluationPrompt(formattedFeedback, assessorType) {
    return `Please evaluate the quality of this 360-degree feedback from a ${assessorType}:

${formattedFeedback}

Analyze this feedback for:
1. Professionalism and respectfulness
2. Constructiveness and actionability
3. Level of detail and specificity
4. Consistency between ratings and comments
5. Potential issues (offensive language, extremely negative feedback, etc.)

Response format: Return a JSON object with the following structure:
{
  "overall_quality": "good", // can be "good", "needs_improvement", or "poor"
  "analysis": {
    "professionalism": {
      "score": 0-10,
      "issues": [] // array of issues identified (empty if none)
    },
    "constructiveness": {
      "score": 0-10,
      "issues": [] // array of issues identified (empty if none)
    },
    "specificity": {
      "score": 0-10,
      "issues": [] // array of issues identified (empty if none)
    },
    "consistency": {
      "score": 0-10,
      "issues": [] // array of issues identified (empty if none)
    }
  },
  "issues_detected": {
    "offensive_language": false,
    "non_constructive_criticism": false,
    "vague_feedback": false,
    "inconsistent_feedback": false
  },
  "question_feedback": {
    // Optional feedback for specific questions, using question index from the input
    // For example:
    // "q1": "This response could be more specific with examples"
  },
  "improvement_suggestions": [
    // Array of suggestions for improving the feedback
  ],
  "summary_message": "A concise summary of the feedback quality and main improvement areas."
}

Only return the JSON object with no additional text, explanation, or markdown formatting.`;
  }
  
  /**
   * Process the AI evaluation and transform to our standard format
   * @param {Object} aiEvaluation - AI evaluation result
   * @param {Array} responses - Original response objects
   * @returns {Object} Standardized evaluation result
   */
  processAIEvaluation(aiEvaluation, responses) {
    // Map AI quality to our quality levels
    const qualityMap = {
      'good': 'good',
      'needs_improvement': 'needs_improvement',
      'poor': 'poor'
    };
    
    // Map AI question feedback to our response IDs
    const questionFeedback = {};
    if (aiEvaluation.question_feedback) {
      // Convert question indices to actual question IDs
      Object.entries(aiEvaluation.question_feedback).forEach(([key, value]) => {
        const index = parseInt(key.replace('q', '')) - 1;
        if (index >= 0 && index < responses.length) {
          questionFeedback[responses[index].questionId] = value;
        }
      });
    }
    
    return {
      quality: qualityMap[aiEvaluation.overall_quality] || 'needs_improvement',
      message: aiEvaluation.summary_message || 'Thank you for your feedback.',
      suggestions: aiEvaluation.improvement_suggestions || [],
      questionFeedback: questionFeedback,
      analysisDetails: {
        professionalism: aiEvaluation.analysis?.professionalism?.score || 0,
        constructiveness: aiEvaluation.analysis?.constructiveness?.score || 0,
        specificity: aiEvaluation.analysis?.specificity?.score || 0,
        consistency: aiEvaluation.analysis?.consistency?.score || 0,
        issuesDetected: aiEvaluation.issues_detected || {}
      }
    };
  }
  
  /**
   * Fallback to rule-based evaluation if AI evaluation fails
   * @param {Array} responses - Array of response objects
   * @param {string} assessorType - Type of assessor
   * @returns {Object} Evaluation results
   */
  fallbackEvaluation(responses, assessorType) {
    console.log('Using fallback evaluation method');
    
    // Perform analysis on the feedback
    const analysisResults = this.analyzeFeedback(responses);
    
    // Determine overall quality
    const overallQuality = this.determineOverallQuality(analysisResults);
    
    // Generate helpful suggestions based on analysis
    const suggestions = this.generateSuggestions(analysisResults, assessorType);
    
    // Generate question-specific feedback
    const questionFeedback = this.generateQuestionFeedback(responses, analysisResults);
    
    return {
      quality: overallQuality.quality,
      message: overallQuality.message,
      suggestions: suggestions,
      questionFeedback: questionFeedback,
      analysisDetails: analysisResults
    };
  }
  
  /**
   * Analyze feedback for various quality factors (fallback method)
   * @param {Array} responses - Array of response objects
   * @returns {Object} Analysis results
   */
  analyzeFeedback(responses) {
    const analysis = {
      hasOffensiveLanguage: false,
      hasConstructiveFeedback: true,
      incompleteResponses: [],
      shortResponses: [],
      inconsistentFeedback: false,
      missingExamples: false,
      offensivePhrases: [],
      nonConstructivePhrases: []
    };
    
    // List of offensive or non-constructive phrases to check for
    const offensiveTerms = [
      'moron', 'idiot', 'stupid', 'incompetent', 'useless', 'hopeless',
      'pathetic', 'worthless', 'terrible', 'awful', 'horrible', 'worst',
      'beyond hope', 'waste of time', 'disaster', 'failure'
    ];
    
    // Non-constructive feedback patterns
    const nonConstructivePatterns = [
      'change company', 'quit', 'resign', 'find another job', 'leave',
      'give up', 'not worth', 'no point', 'shouldn\'t be in this role',
      'wrong career', 'wrong job', 'not cut out'
    ];
    
    // Check each response
    responses.forEach(response => {
      // Skip if response doesn't have text
      if (!response.text) {
        if (response.questionType === 'open_ended') {
          analysis.incompleteResponses.push(response.questionId);
        }
        return;
      }
      
      const text = response.text.toLowerCase();
      
      // Check for offensive language
      offensiveTerms.forEach(term => {
        if (text.includes(term)) {
          analysis.hasOffensiveLanguage = true;
          analysis.offensivePhrases.push({
            questionId: response.questionId,
            phrase: term
          });
        }
      });
      
      // Check for non-constructive patterns
      nonConstructivePatterns.forEach(pattern => {
        if (text.includes(pattern)) {
          analysis.nonConstructivePhrases.push({
            questionId: response.questionId,
            phrase: pattern
          });
        }
      });
      
      // Check for single word or very short responses to open-ended questions
      if (response.questionType === 'open_ended') {
        const wordCount = text.split(/\s+/).filter(word => word.trim() !== '').length;
        if (wordCount < 3) {
          analysis.shortResponses.push(response.questionId);
        }
        
        // Check for lack of examples in "provide examples" questions
        if (response.questionText.toLowerCase().includes('example') && 
            !text.includes('example') && 
            !text.includes('instance') && 
            !text.includes('situation') &&
            !text.includes('case') &&
            wordCount < 15) {
          analysis.missingExamples = true;
        }
      }
    });
    
    // Check for inconsistency between ratings and text feedback
    const ratingResponses = responses.filter(r => r.questionType === 'rating' && r.rating);
    const textResponses = responses.filter(r => r.questionType === 'open_ended' && r.text);
    
    if (ratingResponses.length > 0 && textResponses.length > 0) {
      // Calculate average rating
      const avgRating = ratingResponses.reduce((sum, r) => sum + r.rating, 0) / ratingResponses.length;
      
      // Check if text has negative sentiment but ratings are high
      const hasNegativeText = textResponses.some(r => {
        const text = r.text.toLowerCase();
        return offensiveTerms.some(term => text.includes(term)) || 
               nonConstructivePatterns.some(pattern => text.includes(pattern));
      });
      
      if (avgRating > 3.5 && hasNegativeText) {
        analysis.inconsistentFeedback = true;
      }
      
      // Check if text has only positive sentiment but ratings are low
      const hasOnlyPositiveText = textResponses.every(r => {
        const text = r.text.toLowerCase();
        const positiveTerms = ['great', 'excellent', 'amazing', 'wonderful', 'good'];
        return positiveTerms.some(term => text.includes(term)) &&
               !offensiveTerms.some(term => text.includes(term)) && 
               !nonConstructivePatterns.some(pattern => text.includes(pattern));
      });
      
      if (avgRating < 2.5 && hasOnlyPositiveText && textResponses.length > 0) {
        analysis.inconsistentFeedback = true;
      }
    }
    
    return analysis;
  }
  
  /**
   * Determine overall quality of feedback (fallback method)
   * @param {Object} analysis - Analysis results
   * @returns {Object} Quality assessment
   */
  determineOverallQuality(analysis) {
    // Critical issues that make feedback poor quality
    if (analysis.hasOffensiveLanguage) {
      return {
        quality: 'poor',
        message: 'Your feedback contains language that may be offensive or inappropriate. Please revise to ensure it is respectful and constructive.'
      };
    }
    
    if (analysis.nonConstructivePhrases.length > 0) {
      return {
        quality: 'poor',
        message: 'Your feedback contains suggestions that are not constructive for professional development. Please focus on actionable improvements rather than career changes.'
      };
    }
    
    if (analysis.inconsistentFeedback) {
      return {
        quality: 'needs_improvement',
        message: 'There appears to be inconsistency between your ratings and written feedback. Please ensure your comments align with the ratings provided.'
      };
    }
    
    if (analysis.incompleteResponses.length > 0 || analysis.shortResponses.length > 0) {
      return {
        quality: 'needs_improvement',
        message: 'Some of your responses are too brief or incomplete. More detailed feedback will be more helpful.'
      };
    }
    
    if (analysis.missingExamples) {
      return {
        quality: 'needs_improvement',
        message: 'Your feedback would be more effective with specific examples. Please provide concrete instances where possible.'
      };
    }
    
    // If no issues found, feedback is good
    return {
      quality: 'good',
      message: 'Your feedback is well-balanced, specific, and constructive. Thank you for providing thoughtful input.'
    };
  }
  
  /**
   * Generate suggestions for improving feedback (fallback method)
   * @param {Object} analysis - Analysis results
   * @param {string} assessorType - Type of assessor
   * @returns {Array} List of suggestions
   */
  generateSuggestions(analysis, assessorType) {
    // Same implementation as before...
    const suggestions = [];
    
    if (analysis.hasOffensiveLanguage) {
      suggestions.push('Remove any potentially offensive language and focus on objective observations.');
    }
    
    if (analysis.nonConstructivePhrases.length > 0) {
      suggestions.push('Replace suggestions to leave or change jobs with constructive advice on how to improve in the current role.');
    }
    
    if (analysis.incompleteResponses.length > 0) {
      suggestions.push('Complete all required questions with thoughtful responses.');
    }
    
    if (analysis.shortResponses.length > 0) {
      suggestions.push('Provide more detailed responses with specific examples where possible.');
    }
    
    if (analysis.inconsistentFeedback) {
      suggestions.push('Ensure your ratings are consistent with your written feedback. If you give high ratings, your comments should reflect positive aspects, and vice versa.');
    }
    
    if (analysis.missingExamples) {
      suggestions.push('Include specific examples or situations that illustrate your feedback points.');
    }
    
    // Add general improvement suggestions based on assessor type
    if (assessorType === 'manager' && suggestions.length < 3) {
      suggestions.push('As a manager, consider including feedback on both performance and potential for growth.');
    } else if (assessorType === 'peer' && suggestions.length < 3) {
      suggestions.push('As a peer, consider mentioning collaborative experiences that highlight specific behaviors.');
    } else if (assessorType === 'direct_report' && suggestions.length < 3) {
      suggestions.push('Consider sharing how their leadership approach affects your work and motivation.');
    }
    
    return suggestions;
  }
  
  /**
   * Generate feedback specific to individual questions (fallback method)
   * @param {Array} responses - Array of response objects
   * @param {Object} analysis - Analysis results
   * @returns {Object} Question-specific feedback
   */
  generateQuestionFeedback(responses, analysis) {
    // Same implementation as before...
    const questionFeedback = {};
    
    // Add feedback for offensive language in specific questions
    analysis.offensivePhrases.forEach(({ questionId, phrase }) => {
      questionFeedback[questionId] = `This response contains potentially inappropriate language. Consider rephrasing to be more professional and constructive.`;
    });
    
    // Add feedback for non-constructive suggestions
    analysis.nonConstructivePhrases.forEach(({ questionId, phrase }) => {
      questionFeedback[questionId] = `This response contains suggestions that aren't helpful for professional development. Focus on actionable improvements for this role.`;
    });
    
    // Add feedback for incomplete responses
    analysis.incompleteResponses.forEach(questionId => {
      questionFeedback[questionId] = `Please provide a response to this question.`;
    });
    
    // Add feedback for short responses
    analysis.shortResponses.forEach(questionId => {
      questionFeedback[questionId] = `This response is quite brief. Adding more details or examples would make it more helpful.`;
    });
    
    // Check for responses that are just punctuation or very few characters
    responses.forEach(response => {
      if (response.text && response.text.trim().length <= 2 && !questionFeedback[response.questionId]) {
        questionFeedback[response.questionId] = `This response doesn't provide enough information. Please elaborate with more details.`;
      }
    });
    
    return questionFeedback;
  }
}

module.exports = new AiFeedbackService();