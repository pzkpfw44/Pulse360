// services/ai-feedback-service.js
const axios = require('axios');
require('dotenv').config();

/**
 * Service for evaluating feedback quality using FluxAI
 */
class AiFeedbackService {
  constructor() {
    // Self-contained FluxAI configuration
    this.fluxAiConfig = {
      baseUrl: process.env.FLUX_AI_BASE_URL || 'https://ai.runonflux.com',
      apiKey: process.env.FLUX_AI_API_KEY,
      model: process.env.FLUX_AI_MODEL || 'DeepSeek R1 Distill Qwen 32B',
      
      endpoints: {
        balance: '/v1/balance',
        llms: '/v1/llms',
        chat: '/v1/chat/completions',
        files: '/v1/files'
      }
    };
    
    console.log(`FluxAI configured with baseUrl: ${this.fluxAiConfig.baseUrl}`);
    console.log(`FluxAI model: ${this.fluxAiConfig.model}`);
  }

  /**
   * Evaluate feedback for quality using FluxAI
   */
  async evaluateFeedback(responses, assessorType, targetEmployeeId) {
    try {
      console.log('Evaluating feedback using FluxAI');
      
      // IMPORTANT: First perform our own rule-based check for clearly inappropriate content
      // This ensures we catch obvious issues even if AI fails
      const quickAnalysis = this.analyzeFeedback(responses);
      if (quickAnalysis.hasOffensiveLanguage || quickAnalysis.nonConstructivePhrases.length > 0) {
        console.log('Rule-based pre-check found offensive content - skipping AI evaluation');
        return this.fallbackEvaluation(responses, assessorType);
      }
      
      // Check if API key is configured
      if (!this.fluxAiConfig.apiKey) {
        console.warn('FluxAI API key not configured. Falling back to rule-based evaluation.');
        return this.fallbackEvaluation(responses, assessorType);
      }
      
      // Format the feedback in a simple text format
      const formattedFeedback = this.formatFeedbackForAI(responses, assessorType);
      console.log('Formatted feedback (sample):', formattedFeedback.substring(0, 200) + '...');
      
      // Create a detailed, structured prompt for analysis
      const prompt = this.createAIPrompt(responses, assessorType);
      
      console.log('Calling FluxAI API with improved structured prompt...');
      
      try {
        // Create the request data
        const requestData = {
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          stream: false
        };
        
        // Include model if specified
        if (this.fluxAiConfig.model) {
          requestData.model = this.fluxAiConfig.model;
        }
        
        // Make the API call with proper headers
        const response = await axios({
          method: 'POST',
          url: `${this.fluxAiConfig.baseUrl}${this.fluxAiConfig.endpoints.chat}`,
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': this.fluxAiConfig.apiKey
          },
          data: requestData
        });
        
        // Log information for debugging
        console.log('FluxAI API status code:', response.status);
        
        if (response.data && response.data.choices && response.data.choices.length > 0) {
          // Extract the content from the response, handling different possible formats
          let aiContent = null;
          const choice = response.data.choices[0];
          
          if (typeof choice.message === 'object' && choice.message.content) {
            // Standard format: choice.message is an object with content property
            aiContent = choice.message.content;
          } else if (typeof choice.message === 'string') {
            // Alternative format: choice.message is a string directly
            aiContent = choice.message;
          } else if (choice.content) {
            // Another alternative: content directly on choice
            aiContent = choice.content;
          } else {
            // If we can't find content in expected places, try to extract from choice as a string
            aiContent = JSON.stringify(choice);
          }
          
          if (aiContent) {
            console.log('AI response content:', aiContent);
            
            // Check for refusal patterns or very short responses - these often indicate the AI detected inappropriate content
            if (aiContent.includes('**QUALITY:') || aiContent.includes('QUALITY:')) {
              console.log('AI provided a proper structured analysis');
              
              // Extract structured information from AI response
              const quality = this.extractQualityFromAIResponse(aiContent);
              const suggestions = this.extractSuggestionsFromAIResponse(aiContent);
              const questionFeedback = this.extractQuestionFeedbackFromAIResponse(aiContent, responses);
              
              // Generate appropriate message based on quality assessment
              const message = this.generateMessageFromQuality(quality);
              
              return {
                quality,
                message,
                suggestions,
                questionFeedback,
                analysisDetails: { 
                  aiResponse: aiContent,
                  extractedQuality: quality,
                  usedAI: true
                }
              };
            } 
            // Only fall back if the response is very short or contains explicit refusal language
            else if (aiContent.length < 50 || 
                     aiContent.match(/i (cannot|can't|am unable to) (analyze|evaluate|review|provide)/i) ||
                     aiContent.match(/would not be (appropriate|ethical|responsible)/i)) {
              console.log('AI likely refused to analyze the content');
              return this.fallbackEvaluation(responses, assessorType);
            }
            
            // Extract structured information from AI response
            const quality = this.extractQualityFromAIResponse(aiContent);
            const suggestions = this.extractSuggestionsFromAIResponse(aiContent);
            const questionFeedback = this.extractQuestionFeedbackFromAIResponse(aiContent, responses);
            
            // Generate appropriate message based on quality assessment
            const message = this.generateMessageFromQuality(quality);
            
            return {
              quality,
              message,
              suggestions,
              questionFeedback,
              analysisDetails: { 
                aiResponse: aiContent,
                extractedQuality: quality,
                usedAI: true
              }
            };
          } else {
            console.warn('Could not extract content from AI response');
            console.log('Raw response data:', JSON.stringify(response.data, null, 2));
          }
        } else {
          console.warn('No choices in API response:', JSON.stringify(response.data, null, 2));
        }
        
        // If we reach this point, something went wrong with parsing the response
        console.warn('Could not properly parse FluxAI response. Falling back to rule-based evaluation.');
        return this.fallbackEvaluation(responses, assessorType);
        
      } catch (apiError) {
        console.error('Error calling FluxAI API:', apiError.message);
        
        if (apiError.response) {
          console.error('FluxAI API error status:', apiError.response.status);
          console.error('FluxAI API error data:', JSON.stringify(apiError.response.data, null, 2));
        }
        
        if (apiError.request) {
          console.error('Request was made but no response received');
        }
        
        return this.fallbackEvaluation(responses, assessorType);
      }
      
    } catch (error) {
      console.error('Error in feedback evaluation:', error.message);
      return this.fallbackEvaluation(responses, assessorType);
    }
  }
  
  // Create a more improved prompt for AI analysis
  createAIPrompt(responses, assessorType) {
    const formattedFeedback = this.formatFeedbackForAI(responses, assessorType);
    
    return `You are a feedback analysis expert. Review this 360-degree feedback carefully and provide a high-quality assessment:

${formattedFeedback}

Please analyze this feedback for ALL of the following aspects and be specific:
1. QUALITY: Is the overall feedback quality 'good', 'needs_improvement', or 'poor'?
2. SPECIFICITY: Does the feedback include specific examples or is it too general?
3. BALANCE: Is there a good balance of positive and constructive feedback?
4. PROFESSIONALISM: Is the language professional and respectful?
5. LENGTH: Are responses appropriately detailed (not too short or too long)?
6. ACTIONABILITY: Does the feedback provide actionable advice?
7. CONFIDENTIALITY: Does the feedback avoid sharing confidential or overly specific information?

Please provide:
- Overall assessment of the feedback quality
- 2-3 specific recommendations for improvement
- Any issues with individual responses (identify by question number)

FORMAT your response like this:
"QUALITY: [your assessment]
SPECIFICITY: [your assessment]
BALANCE: [your assessment]
PROFESSIONALISM: [your assessment]
LENGTH: [your assessment]
ACTIONABILITY: [your assessment]
CONFIDENTIALITY: [your assessment]

OVERALL: [brief overall assessment]

RECOMMENDATIONS:
1. [recommendation 1]
2. [recommendation 2]
3. [recommendation 3]

QUESTION-SPECIFIC FEEDBACK:
Question X: [specific feedback]
Question Y: [specific feedback]"`;
  }
  
  // Extract quality assessment from AI response
  extractQualityFromAIResponse(aiResponse) {
    // Look for a structured quality assessment first
    const qualityMatch = aiResponse.match(/\*\*QUALITY:\s*(\w+)\*\*/i) || 
                         aiResponse.match(/QUALITY:\s*(\w+)/i);
    
    if (qualityMatch && qualityMatch[1]) {
      const explicitQuality = qualityMatch[1].toLowerCase().trim();
      console.log(`AI explicitly rated quality as: ${explicitQuality}`);
      
      // Map the AI's quality assessment to our quality levels
      if (explicitQuality === 'poor' || explicitQuality === 'bad') {
        return 'poor';
      } else if (explicitQuality === 'needs_improvement' || 
                 explicitQuality === 'needs improvement' || 
                 explicitQuality === 'fair' ||
                 explicitQuality === 'average') {
        return 'needs_improvement';
      } else if (explicitQuality === 'good' || 
                 explicitQuality === 'excellent' || 
                 explicitQuality === 'great') {
        return 'good';
      }
    }
    
    // Fallback to text analysis if no structured quality found
    const lowerResponse = aiResponse.toLowerCase();
    
    // Check for AI refusal patterns which indicate inappropriate content
    if (lowerResponse.includes('cannot provide') || 
        lowerResponse.includes('cannot analyze') || 
        lowerResponse.includes('cannot review') ||
        lowerResponse.includes('cannot evaluate') ||
        lowerResponse.includes('i cannot') ||
        lowerResponse.includes('unable to') ||
        lowerResponse.includes('would not be appropriate')) {
      console.log('AI refused to analyze feedback - treating as poor quality');
      return 'poor';
    }
    
    // Explicit checks for feedback quality indicators
    if (lowerResponse.includes('offensive') || 
        lowerResponse.includes('inappropriate') || 
        lowerResponse.includes('unprofessional') ||
        lowerResponse.includes('derogatory') ||
        lowerResponse.includes('lack of specificity') ||
        lowerResponse.includes('lacks specificity') ||
        lowerResponse.includes('too general')) {
      return 'poor';
    } else if (lowerResponse.includes('needs improvement') || 
               lowerResponse.includes('could be more') || 
               lowerResponse.includes('lacks detail') ||
               lowerResponse.includes('too brief')) {
      return 'needs_improvement';
    } else {
      // If we can't determine quality from the content, default to good
      return 'good';
    }
  }
  
  // Extract suggestions from AI response
  extractSuggestionsFromAIResponse(aiResponse) {
    const suggestions = [];
    
    // Look for recommendations or suggestions section
    let recommendationsSection = "";
    const recSectionMatches = aiResponse.match(/recommendations for improvement:[\s\S]*?((?=\*\*action plan|\*\*specific|$))/i);
    if (recSectionMatches && recSectionMatches[0]) {
      recommendationsSection = recSectionMatches[0];
    }

    // Find numbered or bulleted items in the recommendations section
    const bulletRegex = /(?:\d+\.\s*|\*\*?\s*|\•\s*)([^•\*\d\n][^\n]+)/gi;
    let match;
    
    const sectionToSearch = recommendationsSection || aiResponse;
    while ((match = bulletRegex.exec(sectionToSearch)) !== null) {
      if (match[1]) {
        // Clean up the suggestion text
        let suggestion = match[1].trim()
          // Remove markdown formatting
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          // Remove any trailing periods, colons, or numbers
          .replace(/[:.]$/, '')
          .replace(/\d+\.?$/, '')
          .replace(/following:$/, '')
          .replace(/following:?\s*\d*\.?$/, '')
          .trim();
        
        // Only add if it's not too short and makes sense as a complete suggestion
        if (suggestion.length > 10 && suggestion.split(' ').length > 3 && !(/^\d+$/.test(suggestion))) {
          suggestions.push(suggestion);
        }
      }
    }
    
    // If no good suggestions found from bullet points, try to extract from paragraph text
    if (suggestions.length === 0) {
      // Look for suggestions after phrases like "suggestions:" or "recommendations:"
      const suggestionPatterns = [
        /suggestions?:([^.]*\.)/gi,
        /recommendations?:([^.]*\.)/gi,
        /improvements?:([^.]*\.)/gi,
        /could improve by([^.]*\.)/gi
      ];
      
      for (const pattern of suggestionPatterns) {
        const matches = aiResponse.matchAll(pattern);
        for (const match of matches) {
          if (match[1] && match[1].trim().length > 0) {
            // Clean markdown formatting
            const cleanSuggestion = match[1].trim()
              .replace(/\*\*/g, '')
              .replace(/\*/g, '')
              .replace(/\d+\.?$/, '')
              .replace(/following:$/, '')
              .replace(/following:?\s*\d*\.?$/, '')
              .trim();
            
            if (cleanSuggestion.length > 10 && cleanSuggestion.split(' ').length > 3) {
              suggestions.push(cleanSuggestion);
            }
          }
        }
      }
    }
    
    // If still no suggestions, add generic ones based on quality
    if (suggestions.length === 0) {
      const quality = this.extractQualityFromAIResponse(aiResponse);
      if (quality === 'poor') {
        suggestions.push('Offer specific, actionable suggestions for improvement, rather than dismissive comments');
        suggestions.push('Focus on professional and respectful language');
      } else if (quality === 'needs_improvement') {
        suggestions.push('Provide more specific examples and actionable advice');
        suggestions.push('Balance critical feedback with recognition of strengths');
      } else {
        suggestions.push('Continue to provide balanced and specific feedback');
        suggestions.push('Include concrete examples to illustrate your points');
      }
    }
    
    return suggestions;
  }
  
  /**
   * Extract question-specific feedback from AI response
   */
  extractQuestionFeedbackFromAIResponse(aiResponse, responses) {
    const questionFeedback = {};
    
    // Look for question-specific feedback section
    const questionFeedbackSection = aiResponse.match(/question[\s\-]specific feedback:[\s\S]*?(?=(\n\n|\n\*\*|\n#|$))/i);
    
    if (questionFeedbackSection && questionFeedbackSection[0]) {
      // Extract individual question feedback using regex
      const feedbackLines = questionFeedbackSection[0].match(/question\s+\d+:?\s*([^\n]+)/gi);
      
      if (feedbackLines && feedbackLines.length > 0) {
        feedbackLines.forEach(line => {
          // Extract question number and feedback
          const match = line.match(/question\s+(\d+):?\s*(.*)/i);
          if (match && match[1] && match[2]) {
            const questionNumber = parseInt(match[1]);
            const feedbackText = match[2].trim();
            
            // Find the question ID corresponding to this number
            const targetQuestion = responses.find((r, index) => index + 1 === questionNumber);
            if (targetQuestion && targetQuestion.questionId) {
              questionFeedback[targetQuestion.questionId] = feedbackText;
            }
          }
        });
      }
    }
    
    // If no question-specific feedback was found in the AI response,
    // check for issues in the responses and generate targeted feedback
    if (Object.keys(questionFeedback).length === 0) {
      responses.forEach(response => {
        if (!response.questionId) return;
        
        const text = (response.text || '').toLowerCase();
        const questionText = (response.questionText || '').toLowerCase();
        
        // Check for offensive language
        const offensiveTerms = ['moron', 'idiot', 'stupid', 'incompetent', 'useless', 'hopeless', 'beyond hope'];
        for (const term of offensiveTerms) {
          if (text.includes(term)) {
            questionFeedback[response.questionId] = 'Consider using more professional language in this response.';
            break;
          }
        }
        
        // Check for very short responses on open-ended questions
        if (response.questionType === 'open_ended' && text && text.split(/\s+/).length < 5) {
          questionFeedback[response.questionId] = 'This response is brief. Consider providing more details or examples.';
        }
        
        // Check for non-constructive suggestions
        const nonConstructivePatterns = ['change company', 'quit', 'resign', 'find another job'];
        for (const pattern of nonConstructivePatterns) {
          if (text.includes(pattern)) {
            questionFeedback[response.questionId] = 'Focus on actionable improvements within their current role.';
            break;
          }
        }
      });
    }
    
    return questionFeedback;
  }
  
  // Generate a message based on extracted quality
  generateMessageFromQuality(quality) {
    switch (quality) {
      case 'poor':
        return 'Your feedback contains language that may be inappropriate. Please revise to ensure it is respectful and constructive.';
      case 'needs_improvement':
        return 'Your feedback could be more effective with additional details and specific examples.';
      case 'good':
        return 'Your feedback is well-balanced and provides constructive insights.';
      default:
        return 'Thank you for your feedback.';
    }
  }
  
  // Format feedback in a simplified format for AI analysis
  formatFeedbackForAI(responses, assessorType) {
    let result = `Assessor Type: ${assessorType}\n\n`;
    
    // Process rating questions
    const ratingQuestions = responses.filter(r => r.questionType === 'rating');
    if (ratingQuestions.length > 0) {
      result += "RATINGS:\n";
      ratingQuestions.forEach((response, index) => {
        result += `- Question ${index + 1}: ${response.questionText}\n  Rating: ${response.rating || 'Not provided'}/5\n`;
      });
      result += "\n";
    }
    
    // Process open-ended questions
    const openEndedQuestions = responses.filter(r => r.questionType === 'open_ended');
    if (openEndedQuestions.length > 0) {
      result += "COMMENTS:\n";
      openEndedQuestions.forEach((response, index) => {
        const questionIndex = ratingQuestions.length + index + 1;
        result += `- Question ${questionIndex}: ${response.questionText}\n  Response: "${response.text || 'Not provided'}"\n\n`;
      });
    }
    
    return result;
  }
  
  /**
   * Analyze feedback for various quality factors (comprehensive analysis)
   */
  analyzeFeedback(responses) {
    const analysis = {
      hasOffensiveLanguage: false,
      offensivePhrases: [],
      nonConstructivePhrases: [],
      incompleteResponses: [],
      shortResponses: [],
      longResponses: [], // New: check for overly verbose responses
      noExamples: [], // New: check for lack of concrete examples
      tooSpecific: [], // New: check for potentially confidential information
      feedbackBalance: {
        positive: 0,
        negative: 0,
        neutral: 0,
        tooPositive: false,
        tooNegative: false
      },
      totalResponseCount: 0,
      totalOpenEndedCount: 0,
      totalRatingCount: 0,
      averageRating: 0
    };
    
    // Lists for detection - EXPANDED to catch more offensive and non-constructive patterns
    const offensiveTerms = [
      'moron', 'idiot', 'stupid', 'incompetent', 'useless', 'hopeless', 'beyond hope', 
      'terrible', 'awful', 'worst', 'never', 'always fails', 'disaster', 'mess', 'worthless',
      'joke', 'waste', 'pathetic', 'clueless', 'fool', 'annoying', 'unbearable', 'hate'
    ];
    
    const nonConstructivePatterns = [
      'change company', 'quit', 'resign', 'find another job', 'give up', 'fire', 'fired',
      'not suited', 'wrong profession', 'wrong job', 'not cut out', 'leave the company',
      'should be let go', 'get out', 'move on', 'leave the team', 'not a good fit'
    ];
    
    const positiveTerms = ['good', 'great', 'excellent', 'outstanding', 'impressive', 'fantastic', 
                         'amazing', 'superb', 'exceptional', 'perfect', 'strength', 'brilliant'];
    
    const negativeTerms = ['bad', 'poor', 'weak', 'inadequate', 'disappointing', 'terrible', 'horrible', 
                         'awful', 'fails', 'struggling', 'needs work', 'insufficient'];
    
    const specificityFlags = ['in the meeting on', 'during the call with', 'when speaking to client', 
                          'confidential', 'secret', 'private', 'told me privately', 'mentioned to me only'];
    
    let totalRatings = 0;
    let sumRatings = 0;
    
    // Analyze each response
    responses.forEach(response => {
      analysis.totalResponseCount++;
      
      // Track response type counts
      if (response.questionType === 'rating') {
        analysis.totalRatingCount++;
        if (response.rating) {
          totalRatings++;
          sumRatings += parseInt(response.rating);
        }
      } else if (response.questionType === 'open_ended') {
        analysis.totalOpenEndedCount++;
      }
      
      // Skip further analysis for empty responses
      if (!response.text) {
        if (response.questionType === 'open_ended') {
          analysis.incompleteResponses.push(response.questionId);
        }
        return;
      }
      
      const text = response.text.toLowerCase();
      const wordCount = text.split(/\s+/).filter(word => word.trim() !== '').length;
      
      // Check for offensive language - directly mark as offensive
      offensiveTerms.forEach(term => {
        // Using word boundary check to match whole words only
        const regex = new RegExp(`\\b${term}\\b`, 'i');
        if (regex.test(text)) {
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
      
      // Check for response length issues
      if (response.questionType === 'open_ended') {
        // Too short
        if (wordCount < 5) {
          analysis.shortResponses.push(response.questionId);
        }
        // Too long
        else if (wordCount > 200) {
          analysis.longResponses.push(response.questionId);
        }
        
        // Check for examples (good)
        const hasExamples = text.includes('example') || 
                           text.includes('instance') || 
                           text.includes('such as') || 
                           text.includes('e.g.') || 
                           text.includes('for instance') || 
                           text.includes('demonstrated') ||
                           text.includes('showed') ||
                           text.includes('when');
                           
        if (!hasExamples && wordCount > 20) {
          analysis.noExamples.push(response.questionId);
        }
        
        // Check for potentially too specific/confidential details
        specificityFlags.forEach(flag => {
          if (text.includes(flag)) {
            // Only flag if not already flagged
            if (!analysis.tooSpecific.find(item => item.questionId === response.questionId)) {
              analysis.tooSpecific.push({
                questionId: response.questionId,
                phrase: flag
              });
            }
          }
        });
        
        // Sentiment analysis
        let positiveCount = 0;
        let negativeCount = 0;
        
        positiveTerms.forEach(term => {
          const regex = new RegExp('\\b' + term + '\\b', 'gi');
          const matches = text.match(regex);
          if (matches) positiveCount += matches.length;
        });
        
        negativeTerms.forEach(term => {
          const regex = new RegExp('\\b' + term + '\\b', 'gi');
          const matches = text.match(regex);
          if (matches) negativeCount += matches.length;
        });
        
        // Adjust feedback balance metrics
        if (positiveCount > negativeCount * 2) {
          analysis.feedbackBalance.positive++;
        } else if (negativeCount > positiveCount * 2) {
          analysis.feedbackBalance.negative++;
        } else {
          analysis.feedbackBalance.neutral++;
        }
      }
    });
    
    // Calculate average rating
    if (totalRatings > 0) {
      analysis.averageRating = sumRatings / totalRatings;
    }
    
    // Check feedback balance
    if (analysis.totalOpenEndedCount > 0) {
      const positivePercentage = (analysis.feedbackBalance.positive / analysis.totalOpenEndedCount) * 100;
      const negativePercentage = (analysis.feedbackBalance.negative / analysis.totalOpenEndedCount) * 100;
      
      analysis.feedbackBalance.tooPositive = positivePercentage > 90;
      analysis.feedbackBalance.tooNegative = negativePercentage > 90;
    }
    
    return analysis;
  }
  
  /**
   * Fallback evaluation using comprehensive rule-based analysis
   */
  fallbackEvaluation(responses, assessorType) {
    console.log('Using fallback evaluation method');
    
    // Perform comprehensive analysis on the feedback
    const analysisResults = this.analyzeFeedback(responses);
    
    // Basic rule-based evaluation
    let quality = 'good';
    let message = 'Your feedback is well-balanced and constructive.';
    const suggestions = [];
    const questionFeedback = {};
    
    // Start collecting issues for suggestion generation
    const issues = [];
    
    // Check for offensive language
    if (analysisResults.hasOffensiveLanguage) {
      quality = 'poor';
      message = 'Your feedback contains language that may be inappropriate. Please revise to ensure it is respectful.';
      issues.push('offensive_language');
      
      // Add feedback for offensive phrases
      analysisResults.offensivePhrases.forEach(({ questionId }) => {
        questionFeedback[questionId] = 'This response contains potentially inappropriate language.';
      });
    }
    
    // Check for non-constructive suggestions
    if (analysisResults.nonConstructivePhrases.length > 0) {
      quality = 'poor';
      message = 'Your feedback contains suggestions that are not constructive for professional development.';
      issues.push('non_constructive');
      
      // Add feedback for non-constructive phrases
      analysisResults.nonConstructivePhrases.forEach(({ questionId }) => {
        questionFeedback[questionId] = 'This response is not constructive for professional development.';
      });
    }
    
    // Check for incomplete or short responses
    if (analysisResults.incompleteResponses.length > 0 || analysisResults.shortResponses.length > 0) {
      quality = quality === 'poor' ? 'poor' : 'needs_improvement';
      message = 'Some of your responses are too brief or incomplete. More detailed feedback will be more helpful.';
      issues.push('too_brief');
      
      // Add feedback for incomplete responses
      analysisResults.incompleteResponses.forEach(questionId => {
        questionFeedback[questionId] = 'Please provide a complete response to this question.';
      });
      
      // Add feedback for short responses
      analysisResults.shortResponses.forEach(questionId => {
        questionFeedback[questionId] = 'This response is too brief. Please provide more details.';
      });
    }
    
    // Check for overly long responses
    if (analysisResults.longResponses.length > 0) {
      if (quality === 'good') {
        quality = 'needs_improvement';
        message = 'Some responses are quite lengthy. Consider being more concise while keeping helpful details.';
      }
      issues.push('too_long');
      
      // Add feedback for long responses
      analysisResults.longResponses.forEach(questionId => {
        questionFeedback[questionId] = 'Consider making this response more concise while keeping the key insights.';
      });
    }
    
    // Check for lack of examples
    if (analysisResults.noExamples.length > 0) {
      if (quality === 'good') {
        quality = 'needs_improvement';
        message = 'Your feedback would be more helpful with specific examples.';
      }
      issues.push('no_examples');
      
      // Add feedback for responses without examples
      analysisResults.noExamples.forEach(questionId => {
        questionFeedback[questionId] = 'Include specific examples to make this feedback more actionable.';
      });
    }
    
    // Check for potentially confidential information
    if (analysisResults.tooSpecific.length > 0) {
      if (quality === 'good') {
        quality = 'needs_improvement';
      }
      issues.push('too_specific');
      
      // Add feedback for overly specific responses
      analysisResults.tooSpecific.forEach(({ questionId }) => {
        questionFeedback[questionId] = 'This may contain overly specific or confidential information. Consider generalizing.';
      });
    }
    
    // Check for imbalanced feedback
    if (analysisResults.feedbackBalance.tooPositive) {
      if (quality === 'good') {
        quality = 'needs_improvement';
        message = 'Your feedback is very positive, but lacks constructive areas for development.';
      }
      issues.push('too_positive');
    } else if (analysisResults.feedbackBalance.tooNegative) {
      if (quality === 'good') {
        quality = 'needs_improvement';
        message = 'Your feedback focuses heavily on negative aspects. Consider balancing with strengths as well.';
      }
      issues.push('too_negative');
    }
    
    // Generate suggestions based on identified issues
    if (issues.includes('offensive_language')) {
      suggestions.push('Replace unprofessional language with constructive, respectful feedback');
    }
    
    if (issues.includes('non_constructive')) {
      suggestions.push('Focus on actionable improvements within their current role');
    }
    
    if (issues.includes('too_brief')) {
      suggestions.push('Provide more detailed responses with specific examples');
    }
    
    if (issues.includes('too_long')) {
      suggestions.push('Be more concise while retaining important insights');
    }
    
    if (issues.includes('no_examples')) {
      suggestions.push('Include concrete examples to illustrate your points');
    }
    
    if (issues.includes('too_specific')) {
      suggestions.push('Avoid sharing confidential information or details that could identify specific situations');
    }
    
    if (issues.includes('too_positive')) {
      suggestions.push('Include constructive areas for growth and development');
    }
    
    if (issues.includes('too_negative')) {
      suggestions.push('Balance critical feedback with recognition of strengths');
    }
    
    // If no suggestions were generated (no issues found), add a general one
    if (suggestions.length === 0) {
      suggestions.push('Continue providing balanced feedback with specific examples');
    }
    
    return {
      quality,
      message,
      suggestions,
      questionFeedback,
      analysisDetails: {
        ...analysisResults,
        usedAI: false
      }
    };
  }
  
  // Create a test request to diagnose issues with FluxAI
  async testFluxAiDirectly() {
    console.log('Testing FluxAI connection directly...');
    
    try {
      // Try a simple check of the API first
      const response = await axios({
        method: 'GET',
        url: `${this.fluxAiConfig.baseUrl}${this.fluxAiConfig.endpoints.llms}`,
        headers: {
          'X-API-KEY': this.fluxAiConfig.apiKey
        }
      });
      
      console.log('FluxAI models endpoint response:', JSON.stringify(response.data, null, 2));
      
      // Now test the chat endpoint with a very simple request
      const chatResponse = await axios({
        method: 'POST',
        url: `${this.fluxAiConfig.baseUrl}${this.fluxAiConfig.endpoints.chat}`,
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.fluxAiConfig.apiKey
        },
        data: {
          messages: [
            {
              role: "user",
              content: "Hello, this is a test message. Can you reply with a simple greeting?"
            }
          ],
          stream: false
        }
      });
      
      console.log('FluxAI chat response status:', chatResponse.status);
      console.log('FluxAI chat response data:', JSON.stringify(chatResponse.data, null, 2));
      
      return {
        success: true,
        llmsResponse: response.data,
        chatResponse: chatResponse.data
      };
      
    } catch (error) {
      console.error('Error in direct FluxAI test:', error.message);
      
      if (error.response) {
        console.error('API error response:', error.response.status, JSON.stringify(error.response.data, null, 2));
      }
      
      return {
        success: false,
        error: error.message,
        response: error.response?.data
      };
    }
  }
}

module.exports = new AiFeedbackService();