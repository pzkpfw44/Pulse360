// backend/controllers/results.controller.js

const { Response, Campaign, CampaignParticipant, Employee, Question, Template, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Controller for handling 360 feedback results operations
 */
class ResultsController {
/**
 * Get results for a specific campaign
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
async getCampaignResults(req, res) {
  try {
    const { campaignId } = req.params;
    
    if (!campaignId) {
      return res.status(400).json({ 
        message: 'Campaign ID is required' 
      });
    }

    // Add diagnostic logging to help troubleshoot
    console.log(`[RESULTS] Fetching results for campaign: ${campaignId}`);
    
    // First, verify the campaign exists and user has access
    const campaign = await Campaign.findOne({
      where: {
        id: campaignId,
        createdBy: req.user.id
      },
      include: [
        {
          model: Template,
          as: 'template',
          include: [{ model: Question, as: 'questions' }]
        },
        {
          model: Employee,
          as: 'targetEmployee'
        }
      ]
    });
    
    if (!campaign) {
      return res.status(404).json({ 
        message: 'Campaign not found or you do not have access' 
      });
    }
    
    // Get all participants for the campaign with their relationship types
    const participants = await CampaignParticipant.findAll({
      where: { campaignId },
      include: [
        { model: Employee, as: 'employee' }
      ]
    });
    
    console.log(`[RESULTS] Found ${participants.length} participants for campaign`);
    
    // Map participants to their relationship types for easy lookup
    const participantMap = {};
    participants.forEach(p => {
      participantMap[p.id] = {
        relationshipType: p.relationshipType,
        status: p.status
      };
    });
    
    // Count participants by relationship type and status
    const completedByType = {
      self: 0,
      manager: 0,
      peer: 0,
      direct_report: 0,
      external: 0
    };
    
    participants.forEach(p => {
      if (p.status === 'completed') {
        const type = p.relationshipType;
        if (completedByType.hasOwnProperty(type)) {
          completedByType[type]++;
        }
      }
    });
    
    console.log(`[RESULTS] Completed participants by type:`, completedByType);
    
    // Convert direct_report count to directReport for frontend consistency
    const typeCounts = {
      self: completedByType.self,
      manager: completedByType.manager,
      peer: completedByType.peer,
      directReport: completedByType.direct_report,
      external: completedByType.external
    };
    
    // Get all responses with a direct SQL approach to ensure we capture everything
    let responses = [];
    try {
      // First, try a direct query that joins responses with participants to get relationship types
      console.log('[RESULTS] Trying direct SQL approach to get responses with relationship types');
      
      const directSql = `
        SELECT r.*, cp.relationshipType 
        FROM responses r 
        JOIN campaign_participants cp ON r.participantId = cp.id 
        WHERE cp.campaignId = ?
      `;
      
      responses = await sequelize.query(directSql, {
        replacements: [campaignId],
        type: sequelize.QueryTypes.SELECT
      });
      
      console.log(`[RESULTS] Found ${responses.length} responses with direct SQL`);
      
      // If we found no responses with direct SQL, try the ORM approach as fallback
      if (responses.length === 0) {
        console.log('[RESULTS] No responses found with direct SQL, trying ORM approach');
        
        const ormResponses = await Response.findAll({
          where: { campaignId },
          include: [
            { model: Question, attributes: ['id', 'text', 'type', 'category', 'perspective', 'order'] }
          ]
        });
        
        console.log(`[RESULTS] Found ${ormResponses.length} responses with ORM approach`);
        
        if (ormResponses.length > 0) {
          // Transform ORM responses to match the format from direct SQL
          responses = ormResponses.map(r => {
            const json = r.toJSON();
            const partInfo = participantMap[r.participantId] || {};
            
            return {
              ...json,
              relationshipType: partInfo.relationshipType || 'unknown'
            };
          });
        }
      }
      
      // If we still have no responses, something is wrong with the database entries
      if (responses.length === 0 && (completedByType.peer > 0 || completedByType.manager > 0 || 
          completedByType.self > 0 || completedByType.direct_report > 0 || completedByType.external > 0)) {
        
        console.log('[RESULTS] Warning: Participants marked as completed but no responses found!');
        
        // Try to get any responses that might be related to this campaign but not properly linked
        const lastResortSql = `
          SELECT r.* 
          FROM responses r 
          JOIN campaign_participants cp ON r.participantId = cp.id 
          WHERE cp.campaignId = ? OR r.campaignId = ?
        `;
        
        const lastResortResponses = await sequelize.query(lastResortSql, {
          replacements: [campaignId, campaignId],
          type: sequelize.QueryTypes.SELECT
        });
        
        console.log(`[RESULTS] Last resort query found ${lastResortResponses.length} responses`);
        
        if (lastResortResponses.length > 0) {
          // Add relationship types to these responses
          responses = lastResortResponses.map(r => {
            const partInfo = participantMap[r.participantId] || {};
            return {
              ...r,
              relationshipType: partInfo.relationshipType || 'unknown'
            };
          });
        }
      }
    } catch (error) {
      console.error('[RESULTS] Error getting responses:', error);
      responses = []; // Ensure we have an empty array if all approaches fail
    }
    
    // Load questions for reference
    const questions = campaign.template?.questions || [];
    
    // Attach Question data to responses
    responses = responses.map(response => {
      // Find the corresponding question
      const question = questions.find(q => q.id === response.questionId);
      
      if (question) {
        return {
          ...response,
          Question: {
            id: question.id,
            text: question.text,
            type: question.type,
            category: question.category,
            perspective: question.perspective,
            order: question.order
          }
        };
      }
      return response;
    });
    
    // Group responses by relationship type
    const responsesByType = {
      self: [],
      manager: [],
      peer: [],
      direct_report: [],
      external: []
    };
    
    // Process responses and assign them to appropriate types
    responses.forEach(response => {
      const type = response.relationshipType;
      
      if (type && responsesByType[type]) {
        responsesByType[type].push(response);
      } else {
        console.log(`[RESULTS] Warning: Response ${response.id} has unknown relationship type: ${type}`);
      }
    });
    
    // Log counts to help with debugging
    console.log('[RESULTS] Responses by type counts:', {
      self: responsesByType.self.length,
      manager: responsesByType.manager.length,
      peer: responsesByType.peer.length,
      direct_report: responsesByType.direct_report.length,
      external: responsesByType.external.length
    });
    
    // Calculate rating averages by question and relationship type
    const ratingAverages = calculateRatingAverages(responsesByType, questions);
    
    // Prepare the results
    const results = {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        targetEmployee: campaign.targetEmployee ? {
          id: campaign.targetEmployee.id,
          name: `${campaign.targetEmployee.firstName} ${campaign.targetEmployee.lastName}`,
          jobTitle: campaign.targetEmployee.jobTitle || '',
          department: campaign.targetEmployee.mainFunction || ''
        } : null,
        template: {
          id: campaign.template.id,
          name: campaign.template.name
        },
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        status: campaign.status,
        completionRate: campaign.completionRate || 0
      },
      participantCounts: {
        total: participants.length,
        completed: participants.filter(p => p.status === 'completed').length,
        self: typeCounts.self,
        manager: typeCounts.manager,
        peer: typeCounts.peer,
        directReport: typeCounts.directReport,
        external: typeCounts.external
      },
      // Include individual responses for self and manager
      individualResponses: {
        self: responsesByType.self,
        manager: responsesByType.manager
      },
      // For other types, only include aggregated data
      aggregatedResponses: {
        peer: aggregateResponses(responsesByType.peer, questions),
        directReport: aggregateResponses(responsesByType.direct_report, questions),
        external: aggregateResponses(responsesByType.external, questions)
      },
      ratingAverages
    };
    
    return res.status(200).json(results);
  } catch (error) {
    console.error('Error getting campaign results:', error);
    
    return res.status(500).json({
      message: 'An error occurred while retrieving the campaign results',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
  
  /**
   * Get a PDF export of campaign results
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async exportCampaignResults(req, res) {
    try {
      const { campaignId } = req.params;
      
      if (!campaignId) {
        return res.status(400).json({ 
          message: 'Campaign ID is required' 
        });
      }
      
      // This would be implemented with a PDF generation library
      // For now, we'll just return a message
      return res.status(200).json({
        message: 'PDF export functionality will be implemented in a future update',
        campaignId
      });
    } catch (error) {
      console.error('Error exporting campaign results:', error);
      
      return res.status(500).json({
        message: 'An error occurred while exporting the campaign results',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

/**
 * Calculate average ratings by question and relationship type
 * @param {Object} responsesByType - Responses grouped by relationship type
 * @param {Array} questions - List of questions from the template
 * @returns {Object} - Average ratings by question and relationship type
 */
function calculateRatingAverages(responsesByType, questions) {
  const ratingQuestions = questions.filter(q => q.type === 'rating');
  const averages = {
    overall: {},
    byType: {
      self: {},
      manager: {},
      peer: {},
      direct_report: {},
      external: {}
    }
  };
  
  // Calculate averages by relationship type
  for (const [type, responses] of Object.entries(responsesByType)) {
    ratingQuestions.forEach(question => {
      const questionResponses = responses.filter(r => 
        r.questionId === question.id && r.ratingValue !== null && r.ratingValue !== undefined
      );
      
      if (questionResponses.length > 0) {
        const sum = questionResponses.reduce((acc, r) => acc + r.ratingValue, 0);
        averages.byType[type][question.id] = {
          average: sum / questionResponses.length,
          count: questionResponses.length,
          questionText: question.text,
          questionCategory: question.category
        };
      }
    });
  }
  
  // Calculate overall averages across all types
  ratingQuestions.forEach(question => {
    let totalSum = 0;
    let totalCount = 0;
    
    for (const type of Object.keys(responsesByType)) {
      const typeAverage = averages.byType[type][question.id];
      if (typeAverage) {
        totalSum += typeAverage.average * typeAverage.count;
        totalCount += typeAverage.count;
      }
    }
    
    if (totalCount > 0) {
      averages.overall[question.id] = {
        average: totalSum / totalCount,
        count: totalCount,
        questionText: question.text,
        questionCategory: question.category
      };
    }
  });
  
  return averages;
}

/**
 * Aggregate responses by question
 * @param {Array} responses - List of responses
 * @param {Array} questions - List of questions from the template
 * @returns {Object} - Aggregated responses by question
 */
function aggregateResponses(responses, questions) {
  console.log(`[AGGREGATE] Processing ${responses.length} responses`);
  
  // If no responses, return empty structure
  if (!responses || responses.length === 0) {
    console.log('[AGGREGATE] No responses to aggregate');
    return {
      byQuestion: {},
      byCategory: {}
    };
  }
  
  const result = {
    byQuestion: {},
    byCategory: {}
  };
  
  // Make sure questions is an array
  const questionsList = Array.isArray(questions) ? questions : [];
  
  // Group responses by question
  questionsList.forEach(question => {
    // Find responses for this question
    const questionResponses = responses.filter(r => {
      // Handle both direct properties and nested Question object
      const questionId = r.questionId || (r.Question && r.Question.id);
      return questionId === question.id;
    });
    
    console.log(`[AGGREGATE] Question ${question.id}: ${questionResponses.length} responses`);
    
    if (questionResponses.length > 0) {
      // For rating questions, calculate statistics
      if (question.type === 'rating') {
        // Extract rating values, handling different data structures
        const ratingValues = questionResponses
          .map(r => {
            // Try both ratingValue and traditional object structures
            return r.ratingValue !== undefined ? r.ratingValue : 
                  (r.rating !== undefined ? r.rating : null);
          })
          .filter(v => v !== null && v !== undefined);
        
        if (ratingValues.length > 0) {
          const sum = ratingValues.reduce((acc, val) => acc + val, 0);
          const avg = sum / ratingValues.length;
          
          // Count ratings by value
          const ratingCounts = {};
          ratingValues.forEach(value => {
            ratingCounts[value] = (ratingCounts[value] || 0) + 1;
          });
          
          // Default to all 5 possible rating values (1-5)
          for (let i = 1; i <= 5; i++) {
            if (!ratingCounts[i]) {
              ratingCounts[i] = 0;
            }
          }
          
          result.byQuestion[question.id] = {
            questionText: question.text,
            questionType: question.type,
            questionCategory: question.category,
            average: avg,
            count: ratingValues.length,
            distribution: ratingCounts
          };
          
          console.log(`[AGGREGATE] Rating question ${question.id}: avg=${avg.toFixed(2)}, count=${ratingValues.length}`);
        }
      } 
      // For open-ended questions, include anonymized text responses
      else if (question.type === 'open_ended' || question.type === 'text') {
        // Handle different response structures
        const textResponses = questionResponses
          .map(r => {
            // Try both textResponse and traditional object structures
            return r.textResponse !== undefined ? r.textResponse : 
                  (r.text !== undefined ? r.text : null);
          })
          .filter(t => t && t.trim() !== '');
        
        if (textResponses.length > 0) {
          result.byQuestion[question.id] = {
            questionText: question.text,
            questionType: question.type,
            questionCategory: question.category,
            count: textResponses.length,
            responses: textResponses
          };
          
          console.log(`[AGGREGATE] Text question ${question.id}: ${textResponses.length} responses`);
        }
      }
    }
  });
  
  // Also aggregate by category
  const categories = [...new Set(questionsList.map(q => q.category))];
  
  categories.forEach(category => {
    const categoryQuestions = questionsList.filter(q => q.category === category);
    const categoryQuestionIds = categoryQuestions.map(q => q.id);
    
    // Rating averages by category
    const ratingQuestions = categoryQuestions.filter(q => q.type === 'rating');
    if (ratingQuestions.length > 0) {
      let totalSum = 0;
      let totalCount = 0;
      
      ratingQuestions.forEach(question => {
        const questionStats = result.byQuestion[question.id];
        if (questionStats && questionStats.average !== undefined) {
          totalSum += questionStats.average * questionStats.count;
          totalCount += questionStats.count;
        }
      });
      
      if (totalCount > 0) {
        result.byCategory[category] = {
          average: totalSum / totalCount,
          count: totalCount,
          questionCount: ratingQuestions.length
        };
      }
    }
  });
  
  console.log(`[AGGREGATE] Result has ${Object.keys(result.byQuestion).length} questions and ${Object.keys(result.byCategory).length} categories`);
  
  return result;
}

module.exports = new ResultsController();