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

      try {
        const checkResults = await sequelize.query(
          'DESCRIBE responses;',
          { type: sequelize.QueryTypes.RAW }
        );
        console.log('Responses table structure:', JSON.stringify(checkResults));
        
        const responseCount = await sequelize.query(
          'SELECT COUNT(*) as count FROM responses;',
          { type: sequelize.QueryTypes.SELECT }
        );
        console.log('Total responses in database:', responseCount);
        
        if (responseCount[0].count > 0) {
          const sampleResponses = await sequelize.query(
            'SELECT * FROM responses LIMIT 5;',
            { type: sequelize.QueryTypes.SELECT }
          );
          console.log('Sample responses:', JSON.stringify(sampleResponses));
        }
      } catch (diagError) {
        console.error('Diagnostic check failed:', diagError);
      }
      
      console.log(`Fetching results for campaign: ${campaignId}`);
      
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
      
      // Get all participants for the campaign
      const participants = await CampaignParticipant.findAll({
        where: { campaignId },
        include: [
          { model: Employee, as: 'employee' }
        ]
      });
      
      console.log(`Found ${participants.length} participants for campaign`);
      
      // Direct database query to get all responses with their relationship types
      const [responseData] = await sequelize.query(
        `SELECT r.*, cp.relationshipType 
         FROM responses r
         JOIN campaign_participants cp ON r.participantId = cp.id
         WHERE r.campaignId = ?`,
        {
          replacements: [campaignId],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      console.log(`Found ${responseData ? responseData.length : 0} responses with direct query`);
      
      // If no responses found with direct query, try the model approach
      let responses = [];
      if (!responseData || responseData.length === 0) {
        responses = await Response.findAll({
          where: { campaignId },
          include: [
            { model: Question, attributes: ['id', 'text', 'type', 'category', 'perspective', 'order'] }
          ]
        });
        
        console.log(`Found ${responses.length} responses with model approach`);
      }
      
      // Group participants by type
      const participantsByType = {};
      participants.forEach(participant => {
        const type = participant.relationshipType;
        if (!participantsByType[type]) {
          participantsByType[type] = [];
        }
        participantsByType[type].push(participant);
      });
      
      // Map participants to their relationship types for easy lookup
      const participantMap = {};
      participants.forEach(p => {
        participantMap[p.id] = p.relationshipType;
      });
      
      // Group responses by relationship type
      const responsesByType = {
        self: [],
        manager: [],
        peer: [],
        direct_report: [],
        external: []
      };
      
      // Use either the direct query results or model results
      const responsesToProcess = responseData && responseData.length > 0 
        ? responseData 
        : responses.map(r => {
            const json = r.toJSON();
            json.relationshipType = participantMap[r.participantId] || 'unknown';
            return json;
          });
      
      // Process and group responses
      responsesToProcess.forEach(response => {
        const type = response.relationshipType;
        if (responsesByType[type]) {
          // Find the question data for this response
          const question = campaign.template.questions.find(q => q.id === response.questionId);
          if (question) {
            // Attach question data if needed
            if (!response.Question) {
              response.Question = {
                id: question.id,
                text: question.text,
                type: question.type,
                category: question.category,
                perspective: question.perspective,
                order: question.order
              };
            }
            responsesByType[type].push(response);
          }
        }
      });
      
      // Count unique participants with responses by type
      const responseCountsByType = {
        self: new Set(),
        manager: new Set(),
        peer: new Set(),
        direct_report: new Set(),
        external: new Set()
      };
      
      responsesToProcess.forEach(response => {
        const type = response.relationshipType;
        if (responseCountsByType[type]) {
          responseCountsByType[type].add(response.participantId);
        }
      });
      
      // Convert sets to counts
      const typeCounts = {
        self: responseCountsByType.self.size,
        manager: responseCountsByType.manager.size,
        peer: responseCountsByType.peer.size,
        directReport: responseCountsByType.direct_report.size,
        external: responseCountsByType.external.size
      };
      
      console.log("Response counts by type:", typeCounts);
      
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
  const result = {
    byQuestion: {},
    byCategory: {}
  };
  
  // Group responses by question
  questions.forEach(question => {
    const questionResponses = responses.filter(r => r.questionId === question.id);
    
    if (questionResponses.length > 0) {
      // For rating questions, calculate statistics
      if (question.type === 'rating') {
        const ratingValues = questionResponses
          .map(r => r.ratingValue)
          .filter(v => v !== null && v !== undefined);
        
        if (ratingValues.length > 0) {
          const sum = ratingValues.reduce((acc, val) => acc + val, 0);
          const avg = sum / ratingValues.length;
          
          // Count ratings by value
          const ratingCounts = {};
          ratingValues.forEach(value => {
            ratingCounts[value] = (ratingCounts[value] || 0) + 1;
          });
          
          result.byQuestion[question.id] = {
            questionText: question.text,
            questionType: question.type,
            questionCategory: question.category,
            average: avg,
            count: ratingValues.length,
            distribution: ratingCounts
          };
        }
      } 
      // For open-ended questions, include anonymized text responses
      else if (question.type === 'open_ended') {
        const textResponses = questionResponses
          .map(r => r.textResponse)
          .filter(t => t && t.trim() !== '');
        
        if (textResponses.length > 0) {
          result.byQuestion[question.id] = {
            questionText: question.text,
            questionType: question.type,
            questionCategory: question.category,
            count: textResponses.length,
            responses: textResponses
          };
        }
      }
    }
  });
  
  // Also aggregate by category
  const categories = [...new Set(questions.map(q => q.category))];
  
  categories.forEach(category => {
    const categoryQuestions = questions.filter(q => q.category === category);
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
  
  return result;
}

module.exports = new ResultsController();