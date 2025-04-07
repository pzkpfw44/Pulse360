// File: frontend/src/utils/formatAiFeedback.js

/**
 * Formats AI feedback for display in the UI
 * @param {Object} aiFeedback - Raw AI feedback response
 * @param {Array} responses - User's feedback responses
 * @returns {Object} - Formatted feedback data
 */
export const formatAiFeedback = (aiFeedback, responses) => {
    if (!aiFeedback) return null;
  
    // Extract the raw AI analysis if available
    const rawAnalysis = aiFeedback.analysisDetails?.aiResponse || '';
    
    // Determine the overall quality
    let quality = aiFeedback.quality || 'good';
    
    // Extract message
    let message = aiFeedback.message || 'Your feedback has been evaluated.';
    
    // Check content of responses to detect mismatch between ratings and text
    const hasRatingTextMismatch = detectRatingTextMismatch(responses);
    
    // If there's a mismatch but AI didn't catch it, override the quality
    if (hasRatingTextMismatch && quality === 'good') {
      quality = 'needs_improvement';
      message = 'Your ratings and text feedback seem inconsistent. Please review to ensure alignment.';
    }
    
    // Get suggestions
    const suggestions = aiFeedback.suggestions || [];
    
    // Add standard suggestion if none provided and quality isn't good
    if (suggestions.length === 0 && quality !== 'good') {
      suggestions.push('Provide more specific examples and details in your responses');
      suggestions.push('Ensure your feedback is balanced with both strengths and areas for improvement');
    }
    
    // Process question-specific feedback
    const questionFeedback = {};
    
    // Check if there's question feedback in the AI response
    if (aiFeedback.questionFeedback && Object.keys(aiFeedback.questionFeedback).length > 0) {
      // Use the AI-provided feedback directly
      Object.assign(questionFeedback, aiFeedback.questionFeedback);
    } else if (quality !== 'good') {
      // Generate some question feedback based on content analysis
      responses.forEach(response => {
        if (!response.questionId) return;
        
        const text = (response.text || '').toLowerCase();
        const questionText = (response.questionText || '').toLowerCase();
        
        // Check for very short responses on open-ended questions
        if (response.questionType === 'open_ended' && text) {
          if (text.length < 30) {
            questionFeedback[response.questionId] = 'This response is quite brief. Consider adding more details and specific examples.';
          } else if (text.includes('rockstar') || text.includes('perfect') || text.includes('all strengths')) {
            questionFeedback[response.questionId] = 'This response is very general. Provide specific examples of strengths or behaviors.';
          }
        }
        
        // Check for rating of 1 or 5 without explanation
        if (response.questionType === 'rating' && (response.rating === 1 || response.rating === 5)) {
          // Find paired open-ended question that might explain this rating
          const relatedOpenQuestion = responses.find(r => 
            r.questionType === 'open_ended' && 
            (r.category === response.category || 
             r.questionText.toLowerCase().includes(response.category.toLowerCase()))
          );
          
          if (!relatedOpenQuestion || !relatedOpenQuestion.text || relatedOpenQuestion.text.length < 50) {
            questionFeedback[response.questionId] = `You gave a ${response.rating === 1 ? 'very low' : 'very high'} rating. Please ensure this is explained with specific examples in your comments.`;
          }
        }
      });
    }
    
    return {
      quality,
      message,
      suggestions,
      questionFeedback,
      rawAnalysis
    };
  };
  
  /**
   * Detects mismatches between ratings and text feedback
   * @param {Array} responses - User's feedback responses
   * @returns {Boolean} - Whether a mismatch was detected
   */
  const detectRatingTextMismatch = (responses) => {
    // Check if there are extremely low ratings but extremely positive text feedback or vice versa
    const ratingResponses = responses.filter(r => r.questionType === 'rating' && r.rating);
    const textResponses = responses.filter(r => r.questionType === 'open_ended' && r.text);
    
    if (ratingResponses.length === 0 || textResponses.length === 0) {
      return false;
    }
    
    // Calculate average rating
    const avgRating = ratingResponses.reduce((sum, r) => sum + (r.rating || 3), 0) / ratingResponses.length;
    
    // Check text for sentiment
    const positiveTerms = ['excellent', 'outstanding', 'amazing', 'great', 'perfect', 'rockstar', 
                          'superb', 'fantastic', 'incredible', 'exceptional', 'all strengths'];
    
    const negativeTerms = ['poor', 'terrible', 'awful', 'horrible', 'bad', 'weak', 'needs significant', 
                          'struggling', 'fails', 'inadequate'];
    
    let positiveTextCount = 0;
    let negativeTextCount = 0;
    
    textResponses.forEach(response => {
      const text = response.text.toLowerCase();
      
      // Count positive and negative language
      positiveTerms.forEach(term => {
        if (text.includes(term)) positiveTextCount++;
      });
      
      negativeTerms.forEach(term => {
        if (text.includes(term)) negativeTextCount++;
      });
    });
    
    // Check for mismatches
    const isVeryPositiveText = positiveTextCount > 0 && negativeTextCount === 0;
    const isVeryNegativeText = negativeTextCount > 0 && positiveTextCount === 0;
    
    // Return true if there's a significant mismatch
    return (avgRating <= 2 && isVeryPositiveText) || (avgRating >= 4 && isVeryNegativeText);
  };