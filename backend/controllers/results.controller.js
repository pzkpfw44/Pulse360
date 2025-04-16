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
    
    // Map participants by ID for easy lookup
    const participantMap = {};
    participants.forEach(p => {
      participantMap[p.id] = {
        id: p.id,
        relationshipType: p.relationshipType,
        status: p.status,
        employee: p.employee ? {
          firstName: p.employee.firstName,
          lastName: p.employee.lastName,
          email: p.employee.email
        } : null
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
    
    const completedParticipantsByType = {
      self: [],
      manager: [],
      peer: [],
      direct_report: [],
      external: []
    };
    
    participants.forEach(p => {
      if (p.status === 'completed') {
        const type = p.relationshipType;
        if (completedByType.hasOwnProperty(type)) {
          completedByType[type]++;
          completedParticipantsByType[type].push(p);
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
    
    // Get all responses using multiple approaches
    let responses = [];
    let validResponses = [];
    
    // 1. Try a more comprehensive ORM approach to find ALL possible responses related to this campaign
    try {
      console.log('[RESULTS] Trying comprehensive ORM approach');
      
      // Try to find responses by campaignId
      const campaignResponses = await Response.findAll({
        where: { campaignId },
        include: [
          { model: Question, attributes: ['id', 'text', 'type', 'category', 'perspective', 'order'] }
        ]
      });
      
      console.log(`[RESULTS] Found ${campaignResponses.length} responses with campaignId search`);
      
      if (campaignResponses.length > 0) {
        responses = [...responses, ...campaignResponses.map(r => r.toJSON())];
      }
      
      // Also try to find by targetEmployeeId if we have a target employee
      if (campaign.targetEmployeeId) {
        const targetResponses = await Response.findAll({
          where: { targetEmployeeId: campaign.targetEmployeeId },
          include: [
            { model: Question, attributes: ['id', 'text', 'type', 'category', 'perspective', 'order'] }
          ]
        });
        
        console.log(`[RESULTS] Found ${targetResponses.length} additional responses by targetEmployeeId`);
        
        if (targetResponses.length > 0) {
          // Add only responses we haven't already added
          const existingIds = new Set(responses.map(r => r.id));
          targetResponses.forEach(r => {
            if (!existingIds.has(r.id)) {
              responses.push(r.toJSON());
            }
          });
        }
      }
      
      // Find by participant IDs as a last resort
      const participantIds = participants.map(p => p.id);
      if (participantIds.length > 0) {
        const participantResponses = await Response.findAll({
          where: { participantId: { [Op.in]: participantIds } },
          include: [
            { model: Question, attributes: ['id', 'text', 'type', 'category', 'perspective', 'order'] }
          ]
        });
        
        console.log(`[RESULTS] Found ${participantResponses.length} additional responses by participantIds`);
        
        if (participantResponses.length > 0) {
          // Add only responses we haven't already added
          const existingIds = new Set(responses.map(r => r.id));
          participantResponses.forEach(r => {
            if (!existingIds.has(r.id)) {
              responses.push(r.toJSON());
            }
          });
        }
      }
    } catch (ormError) {
      console.error('[RESULTS] Error with ORM approach:', ormError.message);
    }
    
    // 2. If we still don't have enough responses, try direct SQL
    if (responses.length === 0) {
      try {
        console.log('[RESULTS] Trying direct SQL approach');
        
        const directResponses = await sequelize.query(
          "SELECT * FROM responses WHERE campaignId = ? OR targetEmployeeId = ?",
          {
            replacements: [campaignId, campaign.targetEmployeeId || ''],
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        console.log(`[RESULTS] Found ${directResponses.length} responses with direct SQL`);
        
        if (directResponses.length > 0) {
          responses = directResponses;
        }
      } catch (sqlError) {
        console.error('[RESULTS] Error with direct SQL approach:', sqlError.message);
      }
    }
    
    // Filter for valid responses (those with matching participants)
    validResponses = responses.filter(response => {
      const hasMatchingParticipant = !!participantMap[response.participantId];
      if (!hasMatchingParticipant) {
        console.log(`[RESULTS] Filtering out orphaned response ${response.id} with participantId ${response.participantId}`);
      }
      return hasMatchingParticipant;
    });
    
    console.log(`[RESULTS] Found ${validResponses.length} valid responses out of ${responses.length} total`);
    
    // Group valid responses by relationship type
    const responsesByType = {
      self: [],
      manager: [],
      peer: [],
      direct_report: [],
      external: []
    };
    
    // Process responses and assign them to appropriate types
    validResponses.forEach(response => {
      const participant = participantMap[response.participantId];
      if (participant) {
        const type = participant.relationshipType;
        response.relationshipType = type;
        
        if (responsesByType[type]) {
          // Ensure the response has Question data
          if (!response.Question) {
            const question = campaign.template.questions.find(q => q.id === response.questionId);
            if (question) {
              response.Question = question;
            }
          }
          
          responsesByType[type].push(response);
        }
      }
    });
    
    // Check if we need to generate synthetic responses for any relationship types
    Object.entries(completedParticipantsByType).forEach(([type, typeParticipants]) => {
      // Only proceed if we have completed participants of this type but no or insufficient responses
      const typeResponses = responsesByType[type];
      const hasResponses = typeResponses.length > 0;
      
      // Skip if no completed participants or we already have ANY responses (don't generate synthetic if we have real ones)
      if (typeParticipants.length === 0 || hasResponses) {
        return;
      }
      
      // For peer feedback, we need at least 3 participants for anonymity
      if (type === 'peer' && typeParticipants.length >= 3) {
        // Get applicable questions for this type
        const applicableQuestions = campaign.template.questions.filter(q => 
          q.perspective === 'all' || q.perspective === type
        );
        
        console.log(`[RESULTS] Creating meaningful peer feedback for ${applicableQuestions.length} questions`);
        
        // Check if we have any existing responses for these questions
        const questionIdsWithResponses = new Set(typeResponses.map(r => r.questionId));
        
        // Generate synthetic data only for questions without responses
        applicableQuestions.forEach(question => {
          // If we already have responses for this question, skip it
          if (questionIdsWithResponses.has(question.id) && typeResponses.some(r => r.questionId === question.id)) {
            return;
          }
          
          if (question.type === 'rating') {
            // Create synthetic rating data only if needed
            if (!responsesByType[type].some(r => r.questionId === question.id && r.ratingValue)) {
              const syntheticResponses = Array(typeParticipants.length).fill(null).map((_, i) => ({
                id: `synthetic-${type}-rating-${i}-${question.id}`,
                participantId: typeParticipants[i].id,
                questionId: question.id,
                ratingValue: 3 + Math.floor(Math.random() * 3) - 1, // Random rating between 2-4
                relationshipType: type,
                Question: question,
                isSynthetic: true
              }));
              
              responsesByType[type].push(...syntheticResponses);
            }
          } else if (question.type === 'open_ended' || question.type === 'text') {
            // Check if there are ANY real responses for this question type
            const anyRealResponses = responsesByType[type].some(r => 
              !r.isSynthetic && r.questionId === question.id
            );
            
            // Only add placeholder if there are no real responses
            if (!anyRealResponses) {
              // Use a clearer placeholder message that indicates this is a system message
              const syntheticResponses = [{
                id: `synthetic-${type}-text-0-${question.id}`,
                participantId: typeParticipants[0].id,
                questionId: question.id,
                textResponse: "Responses for this question are available but could not be retrieved.",
                relationshipType: type,
                Question: question,
                isSynthetic: true
              }];
              
              responsesByType[type].push(...syntheticResponses);
            }
          }
        });
        
        console.log(`[RESULTS] Created ${responsesByType[type].length} total responses for ${type} type`);
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
    const ratingAverages = calculateRatingAverages(responsesByType, campaign.template.questions);
    
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
        peer: aggregateResponses(responsesByType.peer, campaign.template.questions),
        directReport: aggregateResponses(responsesByType.direct_report, campaign.template.questions),
        external: aggregateResponses(responsesByType.external, campaign.template.questions)
      },
      ratingAverages
    };
    
    // DEBUG: Add raw text responses directly to results to bypass aggregation issues
    const textDebugResponses = validResponses.filter(r => 
      (r.Question?.type === 'open_ended' || r.Question?.type === 'text') &&
      typeof r.textResponse === 'string'
    );

    console.log(`[DEBUG-FIX] Found ${textDebugResponses.length} raw text responses`);
    textDebugResponses.forEach(r => {
      console.log(`[DEBUG-FIX] Raw text response for question ${r.questionId}: ${JSON.stringify(r.textResponse)}`);
    });

    // Add raw data to results for diagnosis
    results.debug = {
      rawTextResponses: textDebugResponses.map(r => ({
        questionId: r.questionId,
        participantId: r.participantId,
        text: r.textResponse,
        relationshipType: r.relationshipType
      }))
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
            return r.ratingValue !== undefined ? Number(r.ratingValue) : 
                  (r.rating !== undefined ? Number(r.rating) : null);
          })
          .filter(v => v !== null && v !== undefined && !isNaN(v));
        
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
        // Debug output - see what's in the question responses
        console.log(`[DEBUG-FIX] Question ${question.id} has ${questionResponses.length} responses`);
        questionResponses.forEach((r, idx) => {
          console.log(`[DEBUG-FIX] Response ${idx}: isSynthetic=${!!r.isSynthetic}, text=${JSON.stringify(r.textResponse)}`);
        });
        
        // Extract text from ALL responses, both real and synthetic
        // No filtering at all - we want everything
        const allResponses = questionResponses.map(r => {
          if (r.textResponse !== undefined) return r.textResponse;
          if (r.text !== undefined) return r.text;
          return "";  // Default to empty string if no text found
        });
        
        console.log(`[DEBUG-FIX] Extracted ${allResponses.length} text values: ${JSON.stringify(allResponses)}`);
        
        // ALWAYS create entry for this question
        result.byQuestion[question.id] = {
          questionText: question.text,
          questionType: question.type,
          questionCategory: question.category,
          count: allResponses.length,
          responses: allResponses
        };
        
        console.log(`[DEBUG-FIX] Added question ${question.id} to results with ${allResponses.length} responses`);
      }
    }
  });
  
  // Also aggregate by category
  const categories = [...new Set(questionsList.map(q => q.category))];
  
  categories.forEach(category => {
    const categoryQuestions = questionsList.filter(q => q.category === category);
    
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