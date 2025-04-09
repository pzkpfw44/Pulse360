// backend/controllers/feedback.controller.js

const aiFeedbackService = require('../services/ai-feedback-service');
const { Response, CampaignParticipant, Campaign } = require('../models');

/**
 * Controller for handling feedback-related operations
 */
class FeedbackController {
  /**
   * Evaluate feedback using AI
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async evaluateFeedback(req, res) {
    try {
      const { responses, assessorType, targetEmployeeId, campaignId } = req.body;
      
      if (!responses || responses.length === 0) {
        return res.status(400).json({ 
          message: 'No feedback provided for evaluation' 
        });
      }
      
      // Check if campaign has full AI support enabled
      if (campaignId) {
        try {
          const campaign = await Campaign.findByPk(campaignId);
          
          // If campaign exists and doesn't have full AI support, use fallback evaluation
          if (campaign && campaign.useFullAiSupport === false) {
            console.log('Using fallback evaluation for campaign:', campaignId);
            
            // Generate basic evaluation without calling the AI service
            const fallbackEvaluation = this.generateFallbackEvaluation(responses);
            return res.status(200).json(fallbackEvaluation);
          }
        } catch (error) {
          console.error('Error checking campaign AI setting:', error);
          // Continue with normal AI evaluation if there's an error
        }
      }
      
      // Proceed with full AI evaluation
      const evaluation = await aiFeedbackService.evaluateFeedback(
        responses, 
        assessorType || 'peer', 
        targetEmployeeId
      );
      
      return res.status(200).json(evaluation);
    } catch (error) {
      console.error('Error in feedback evaluation:', error);
      
      // If AI evaluation fails, fall back to basic evaluation
      const fallbackEvaluation = this.generateFallbackEvaluation(req.body.responses || []);
      
      return res.status(200).json({
        ...fallbackEvaluation,
        message: 'Using fallback evaluation due to an error processing AI feedback.'
      });
    }
  }
  
  /**
   * Generate a basic fallback evaluation without using AI
   * @param {Array} responses - The feedback responses
   * @returns {Object} - Basic evaluation
   */
  generateFallbackEvaluation(responses) {
    // Create a simple evaluation based on basic rules
    const openEndedResponses = responses.filter(r => 
      r.questionType === 'open_ended' && r.text
    );
    
    const ratingResponses = responses.filter(r => 
      r.questionType === 'rating' && r.rating !== undefined
    );
    
    // Check for very short responses
    const shortResponses = openEndedResponses.filter(r => 
      r.text.length < 20
    );
    
    // Determine quality based on basic criteria
    let quality = 'good';
    const suggestions = [];
    const questionFeedback = {};
    
    if (shortResponses.length > 0) {
      quality = 'needs_improvement';
      suggestions.push('Provide more detailed responses for open-ended questions');
      
      // Add feedback for specific short responses
      shortResponses.forEach(response => {
        if (response.questionId) {
          questionFeedback[response.questionId] = 
            'This response is quite brief. Consider adding more details.';
        }
      });
    }
    
    // Check for empty responses on required questions
    const emptyRequiredResponses = responses.filter(r => 
      r.required && 
      ((r.questionType === 'open_ended' && (!r.text || r.text.trim() === '')) ||
       (r.questionType === 'rating' && r.rating === undefined))
    );
    
    if (emptyRequiredResponses.length > 0) {
      quality = 'incomplete';
      suggestions.push('Complete all required questions before submitting');
      
      // Add feedback for empty required responses
      emptyRequiredResponses.forEach(response => {
        if (response.questionId) {
          questionFeedback[response.questionId] = 'This question requires a response.';
        }
      });
    }
    
    return {
      quality,
      message: quality === 'good' 
        ? 'Your feedback looks good.' 
        : 'Please review and improve your feedback.',
      suggestions,
      questionFeedback,
      isFallback: true // Flag to indicate this is a fallback evaluation
    };
  }
  
  /**
   * Submit completed feedback
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async submitFeedback(req, res) {
    try {
      const { 
        campaignId, 
        assessorToken, 
        targetEmployeeId, 
        responses, 
        bypassedAiRecommendations,
        aiEvaluationResults
      } = req.body;
      
      // Validation
      if (!campaignId || !assessorToken || !targetEmployeeId || !responses) {
        return res.status(400).json({ 
          message: 'Missing required fields for feedback submission' 
        });
      }
      
      // Ensure responses is an array
      if (!Array.isArray(responses)) {
        return res.status(400).json({
          message: 'Responses must be provided as an array'
        });
      }
      
      // Store responses
      const savedResponses = [];
      
      for (const response of responses) {
        // Skip invalid responses
        if (!response.questionId) continue;
        
        const savedResponse = await Response.create({
          campaignId,
          questionId: response.questionId,
          participantToken: assessorToken,
          targetEmployeeId,
          rating: response.rating,
          text: response.text,
          bypassedAiRecommendations: bypassedAiRecommendations || false,
          aiEvaluationData: aiEvaluationResults ? JSON.stringify(aiEvaluationResults) : null
        });
        
        savedResponses.push(savedResponse);
      }
      
      // Try to update participant status if using the actual model
      try {
        await CampaignParticipant.update(
          { status: 'completed', completedAt: new Date() },
          { where: { token: assessorToken, campaignId: campaignId } }
        );
      } catch (err) {
        // Just log the error, don't fail the request if this part fails
        console.log('Could not update participant status:', err.message);
      }
      
      return res.status(200).json({
        message: 'Feedback submitted successfully',
        responseCount: savedResponses.length
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      
      return res.status(500).json({
        message: 'An error occurred while submitting feedback',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new FeedbackController();