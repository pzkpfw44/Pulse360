// backend/controllers/feedback.controller.js

const aiFeedbackService = require('../services/ai-feedback-service');
const { Response, CampaignParticipant } = require('../models');

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
      const { responses, assessorType, targetEmployeeId } = req.body;
      
      if (!responses || responses.length === 0) {
        return res.status(400).json({ 
          message: 'No feedback provided for evaluation' 
        });
      }
      
      const evaluation = await aiFeedbackService.evaluateFeedback(
        responses, 
        assessorType || 'peer', 
        targetEmployeeId
      );
      
      return res.status(200).json(evaluation);
    } catch (error) {
      console.error('Error in feedback evaluation:', error);
      
      return res.status(500).json({
        message: 'An error occurred while evaluating the feedback',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
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