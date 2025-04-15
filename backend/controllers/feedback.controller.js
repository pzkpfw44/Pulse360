// backend/controllers/feedback.controller.js

const aiFeedbackService = require('../services/ai-feedback-service');
const { Response, CampaignParticipant, Campaign, Template, Question, Employee, sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

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
        responses 
      } = req.body;
      
      console.log(`[SUBMIT] Processing feedback for campaign ${campaignId} with token ${assessorToken}`);
      
      // Validation
      if (!campaignId || !assessorToken || !targetEmployeeId || !responses) {
        return res.status(400).json({ 
          message: 'Missing required fields for feedback submission' 
        });
      }
      
      // Get the participant
      const participant = await CampaignParticipant.findOne({
        where: { invitationToken: assessorToken },
        include: [{ model: Campaign, as: 'campaign' }]
      });
  
      if (!participant) {
        console.log(`[SUBMIT] Participant not found for token ${assessorToken}`);
        return res.status(404).json({ 
          message: 'Participant not found with the provided token',
          error: 'invalid_token'
        });
      }
      
      console.log(`[SUBMIT] Found participant ${participant.id} with relationship ${participant.relationshipType}`);
      console.log(`[SUBMIT] Campaign from participant: ${participant.campaign ? participant.campaign.id : 'null'}`);
      
      // Delete existing responses to prevent duplicates
      await sequelize.query(
        'DELETE FROM responses WHERE participantId = ?',
        { 
          replacements: [participant.id],
          type: sequelize.QueryTypes.DELETE 
        }
      );
      
      console.log(`[SUBMIT] Cleared previous responses for participant ${participant.id}`);
      
      // Save new responses
      let saveCount = 0;
      
      for (const response of responses) {
        if (!response.questionId) continue;
        
        try {
          // Insert response directly with SQL to ensure proper values
          await sequelize.query(
            `INSERT INTO responses 
             (id, participantId, questionId, ratingValue, textResponse, targetEmployeeId, campaignId, createdAt, updatedAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            {
              replacements: [
                uuidv4(),
                participant.id,
                response.questionId,
                response.rating || null,
                response.text || '',
                targetEmployeeId,
                campaignId  // Explicitly use the campaignId from req.body
              ],
              type: sequelize.QueryTypes.INSERT
            }
          );
          
          saveCount++;
        } catch (err) {
          console.error(`[SUBMIT] Error saving response for question ${response.questionId}:`, err);
        }
      }
      
      console.log(`[SUBMIT] Saved ${saveCount} responses for campaign ${campaignId}`);
      
      // Mark participant as completed
      await participant.update({ 
        status: 'completed', 
        completedAt: new Date() 
      });
      
      console.log(`[SUBMIT] Updated participant status to completed`);
      
      // Update campaign completion rate
      try {
        const allParticipants = await CampaignParticipant.findAll({
          where: { campaignId }
        });
        
        const completedCount = allParticipants.filter(p => 
          p.status === 'completed'
        ).length;
        
        const newCompletionRate = Math.round((completedCount / allParticipants.length) * 100);
        
        await Campaign.update(
          { completionRate: newCompletionRate },
          { where: { id: campaignId } }
        );
        
        console.log(`[SUBMIT] Updated campaign ${campaignId} completion rate to ${newCompletionRate}%`);
      } catch (rateError) {
        console.error('[SUBMIT] Error updating completion rate:', rateError);
      }
      
      return res.status(200).json({
        message: 'Feedback submitted successfully',
        responseCount: saveCount
      });
    } catch (error) {
      console.error('[SUBMIT] Error submitting feedback:', error);
      return res.status(500).json({
        message: 'An error occurred while submitting feedback',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get assessment data by token
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async getAssessmentByToken(req, res) {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ 
          message: 'Assessment token is required' 
        });
      }
      
      // Find the participant by token
      const participant = await CampaignParticipant.findOne({
        where: { invitationToken: token },
        include: [
          { 
            model: Campaign, 
            as: 'campaign',
            include: [
              { 
                model: Template, 
                as: 'template',
                include: [
                  { model: Question, as: 'questions' }
                ]
              },
              { model: Employee, as: 'targetEmployee' }
            ]
          },
          { model: Employee, as: 'employee' }
        ]
      });
      
      if (!participant) {
        return res.status(404).json({ 
          message: 'Assessment not found',
          error: 'invalid_token'
        });
      }
      
      // Check if the campaign is still active
      if (participant.campaign.status !== 'active') {
        return res.status(400).json({ 
          message: 'This campaign is no longer active',
          error: 'campaign_inactive',
          status: participant.campaign.status
        });
      }
      
      // Check if the participant has already completed the assessment
      if (participant.status === 'completed') {
        return res.status(400).json({ 
          message: 'You have already completed this assessment',
          error: 'already_completed',
          completedAt: participant.completedAt
        });
      }
      
      // Check if campaign is past its deadline
      const now = new Date();
      const endDate = new Date(participant.campaign.endDate);
      if (now > endDate) {
        return res.status(400).json({ 
          message: 'This campaign has ended',
          error: 'campaign_ended',
          endDate: participant.campaign.endDate
        });
      }
      
      // Find any existing draft responses using raw SQL to avoid foreign key issues
      let existingResponses = [];
      try {
        existingResponses = await sequelize.query(
          `SELECT id, questionId, ratingValue, textResponse FROM responses 
           WHERE participantId = ?`,
          {
            replacements: [participant.id],
            type: sequelize.QueryTypes.SELECT
          }
        );
      } catch (err) {
        console.error('Error fetching existing responses:', err);
        // Continue even if this fails
      }

      // Update participant status to 'in_progress' if it was 'pending' or 'invited'
      if (['pending', 'invited'].includes(participant.status)) {
        await participant.update({ 
          status: 'in_progress',
          lastAccessedAt: new Date()
        });
      }
      
      // Format question data with any existing responses
      const assessorType = participant.relationshipType;
      const questions = participant.campaign.template.questions
        .filter(question => {
          // Match questions with matching perspective, or those marked for 'all' perspectives
          return question.perspective === assessorType || question.perspective === 'all';
        })
        .map(question => {
          const existingResponse = existingResponses.find(r => r.questionId === question.id);
          
          return {
            id: question.id,
            text: question.text,
            type: question.type,
            category: question.category,
            required: question.required,
            order: question.order,
            // Include existing response data if available
            response: existingResponse ? {
              rating: existingResponse.ratingValue,
              text: existingResponse.textResponse
            } : null
          };
        })
        .sort((a, b) => a.order - b.order); // Sort by question order
      
      // Generate a custom introduction based on the assessor type
      let introMessage = 'Your feedback will help understand strengths and areas for growth.';
      const targetName = `${participant.campaign.targetEmployee.firstName} ${participant.campaign.targetEmployee.lastName}`;

      if (assessorType === 'self') {
        introMessage = `This self-assessment will help you reflect on your performance and development areas.`;
      } else if (assessorType === 'manager') {
        introMessage = `As ${targetName}'s manager, your feedback will provide valuable insights for their development.`;
      } else if (assessorType === 'peer') {
        introMessage = `Your peer feedback will help ${targetName} understand their collaboration strengths and growth areas.`;
      } else if (assessorType === 'direct_report') {
        introMessage = `Your feedback as a direct report will help ${targetName} improve their leadership skills.`;
      }

      // Format and return the assessment data
      return res.status(200).json({
        campaign: {
          id: participant.campaign.id,
          name: participant.campaign.name,
          endDate: participant.campaign.endDate
        },
        targetEmployee: {
          id: participant.campaign.targetEmployee.id,
          name: `${participant.campaign.targetEmployee.firstName} ${participant.campaign.targetEmployee.lastName}`,
          position: participant.campaign.targetEmployee.jobTitle || ''
        },
        assessorType: participant.relationshipType,
        introMessage: introMessage,
        questions,
        token
      });
    } catch (error) {
      console.error('Error getting assessment by token:', error);
      
      return res.status(500).json({
        message: 'An error occurred while retrieving the assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Save feedback draft
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async saveFeedbackDraft(req, res) {
    try {
      const { assessorToken, responses } = req.body;
      
      console.log(`[DRAFT] Saving draft for token ${assessorToken}`);
      
      if (!assessorToken || !responses || !Array.isArray(responses)) {
        return res.status(400).json({ 
          message: 'Token and responses are required' 
        });
      }
      
      // Find the participant by token
      const participant = await CampaignParticipant.findOne({
        where: { invitationToken: assessorToken },
        include: [{ model: Campaign, as: 'campaign' }]
      });
      
      if (!participant) {
        console.log(`[DRAFT] Participant not found for token ${assessorToken}`);
        return res.status(404).json({ 
          message: 'Assessment not found',
          error: 'invalid_token'
        });
      }
      
      const campaignId = participant.campaign.id;
      console.log(`[DRAFT] Found participant ${participant.id} for campaign ${campaignId}`);
      
      // Update or create responses using raw SQL
      let savedCount = 0;
      
      for (const response of responses) {
        if (!response.questionId) continue;
        
        try {
          // Check if response exists
          const existing = await sequelize.query(
            'SELECT id FROM responses WHERE participantId = ? AND questionId = ?',
            {
              replacements: [participant.id, response.questionId],
              type: sequelize.QueryTypes.SELECT
            }
          );
          
          if (existing.length > 0) {
            // Update existing
            await sequelize.query(
              `UPDATE responses 
               SET ratingValue = ?, textResponse = ?, updatedAt = NOW() 
               WHERE id = ?`,
              {
                replacements: [
                  response.rating || null,
                  response.text || '',
                  existing[0].id
                ],
                type: sequelize.QueryTypes.UPDATE
              }
            );
          } else {
            // Create new
            await sequelize.query(
              `INSERT INTO responses 
               (id, participantId, questionId, ratingValue, textResponse, campaignId, createdAt, updatedAt) 
               VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
              {
                replacements: [
                  uuidv4(),
                  participant.id,
                  response.questionId,
                  response.rating || null,
                  response.text || '',
                  campaignId
                ],
                type: sequelize.QueryTypes.INSERT
              }
            );
          }
          
          savedCount++;
        } catch (err) {
          console.error(`[DRAFT] Error saving/updating response:`, err);
        }
      }
      
      // Update participant status if it was pending or invited
      if (['pending', 'invited'].includes(participant.status)) {
        await participant.update({ 
          status: 'in_progress',
          lastAccessedAt: new Date()
        });
        console.log(`[DRAFT] Updated participant status to in_progress`);
      }
      
      return res.status(200).json({
        message: 'Draft saved successfully',
        responseCount: savedCount,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('[DRAFT] Error saving feedback draft:', error);
      
      return res.status(500).json({
        message: 'An error occurred while saving the draft',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new FeedbackController();