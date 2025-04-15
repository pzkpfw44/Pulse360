// backend/controllers/results.controller.js

const { Response, Campaign, CampaignParticipant, Employee, Question, Template, sequelize } = require('../models');

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
      
      // Track participants by relationship type
      const participantsByType = {
        self: participants.filter(p => p.relationshipType === 'self'),
        manager: participants.filter(p => p.relationshipType === 'manager'),
        peer: participants.filter(p => p.relationshipType === 'peer'),
        direct_report: participants.filter(p => p.relationshipType === 'direct_report'),
        external: participants.filter(p => p.relationshipType === 'external')
      };
      
      // Get all responses for the campaign
      const responses = await Response.findAll({
        where: { campaignId },
        include: [
          { model: Question, attributes: ['id', 'text', 'type', 'category', 'perspective', 'order'] }
        ]
      });
      
      console.log(`Found ${responses.length} responses for campaign ${campaignId}`);
      
      // Group responses by relationship type
      const responsesByType = {
        self: [],
        manager: [],
        peer: [],
        direct_report: [],
        external: []
      };
      
      // Map participants to their relationship types for easy reference
      const participantMap = {};
      participants.forEach(participant => {
        participantMap[participant.id] = participant.relationshipType;
      });
      
      // Count unique participants who have submitted responses
      const participantsWithResponses = {
        self: new Set(),
        manager: new Set(),
        peer: new Set(),
        direct_report: new Set(),
        external: new Set()
      };
      
      // Process responses and group by relationship type
      responses.forEach(response => {
        const type = participantMap[response.participantId];
        if (type && responsesByType[type]) {
          responsesByType[type].push(response.toJSON());
          participantsWithResponses[type].add(response.participantId);
        }
      });
      
      // Calculate counts
      const typeCounts = {
        self: participantsWithResponses.self.size,
        manager: participantsWithResponses.manager.size,
        peer: participantsWithResponses.peer.size,
        directReport: participantsWithResponses.direct_report.size,
        external: participantsWithResponses.external.size
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