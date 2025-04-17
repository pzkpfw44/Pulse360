// backend/controllers/insights.controller.js

const { 
    Insight, 
    Campaign, 
    Employee, 
    Response, 
    Question, 
    CampaignParticipant,
    sequelize
  } = require('../models');
  const insightsAiService = require('../services/insights-ai-service');
  const { Op } = require('sequelize');
  const PDFDocument = require('pdfkit');
  const fs = require('fs');
  const path = require('path');
  
  /**
   * Controller for handling insights operations
   */
  class InsightsController {
    /**
     * Get available campaigns for insights
     * @param {Request} req - Express request object
     * @param {Response} res - Express response object
     */
    async getAvailableCampaigns(req, res) {
      try {
        // Get campaigns with completed status or with completed assessments
        const campaigns = await Campaign.findAll({
          where: {
            [Op.or]: [
              { status: 'completed' },
              { status: 'active' }
            ],
            createdBy: req.user.id
          },
          include: [
            { 
              model: Employee, 
              as: 'targetEmployee',
              attributes: ['id', 'firstName', 'lastName', 'email', 'jobTitle']
            },
            { 
              model: CampaignParticipant, 
              as: 'participants',
              attributes: ['id', 'status', 'relationshipType']
            }
          ]
        });
        
        // Filter to only include campaigns with at least one completed assessment
        const campaignsWithResults = campaigns.filter(campaign => {
          if (campaign.status === 'completed') return true;
          
          if (campaign.participants && campaign.participants.length > 0) {
            const completedParticipants = campaign.participants.filter(p => p.status === 'completed').length;
            return completedParticipants > 0;
          }
          
          return false;
        });
        
        // Get existing insights for these campaigns
        const campaignIds = campaignsWithResults.map(c => c.id);
        const existingInsights = await Insight.findAll({
          where: {
            campaignId: { [Op.in]: campaignIds }
          },
          attributes: ['id', 'campaignId', 'type', 'status', 'title', 'createdAt']
        });
        
        // Map insights to campaigns
        const campaignsWithInsights = campaignsWithResults.map(campaign => {
          const campaignInsights = existingInsights.filter(insight => insight.campaignId === campaign.id);
          
          return {
            id: campaign.id,
            name: campaign.name,
            targetEmployee: campaign.targetEmployee,
            status: campaign.status,
            completionRate: campaign.completionRate || 
              (campaign.participants?.length > 0 
                ? Math.round((campaign.participants.filter(p => p.status === 'completed').length / campaign.participants.length) * 100)
                : 0),
            insights: campaignInsights
          };
        });
        
        res.status(200).json({
          campaigns: campaignsWithInsights
        });
      } catch (error) {
        console.error('Error getting available campaigns for insights:', error);
        res.status(500).json({ 
          message: 'Failed to fetch available campaigns', 
          error: error.message 
        });
      }
    }
    
    /**
     * Generate a new insight
     * @param {Request} req - Express request object
     * @param {Response} res - Express response object
     */
    async generateInsight(req, res) {
      try {
        const { 
          campaignId, 
          insightType, 
          title 
        } = req.body;
        
        if (!campaignId || !insightType) {
          return res.status(400).json({ 
            message: 'Campaign ID and insight type are required' 
          });
        }
        
        // Validate insight type
        const validTypes = ['growth_blueprint', 'leadership_impact', 'team_synergy', 
                           'collaboration_patterns', 'talent_landscape', 'culture_pulse', 
                           'development_impact'];
        
        if (!validTypes.includes(insightType)) {
          return res.status(400).json({
            message: 'Invalid insight type'
          });
        }
        
        // Get campaign data
        const campaign = await Campaign.findOne({
          where: {
            id: campaignId,
            createdBy: req.user.id
          },
          include: [
            { 
              model: Employee, 
              as: 'targetEmployee' 
            }
          ]
        });
        
        if (!campaign) {
          return res.status(404).json({ message: 'Campaign not found' });
        }
        
        // Get feedback data
        const feedbackData = await this.getFeedbackDataForCampaign(campaignId);
        
        // Generate insight content based on type
        let insightContent = {};
        
        switch (insightType) {
          case 'growth_blueprint':
            insightContent = await insightsAiService.generateGrowthBlueprint(
              feedbackData,
              campaign.targetEmployee,
              campaign
            );
            break;
          // Other insight types will be added in future phases
          default:
            return res.status(400).json({ 
              message: 'Insight type not yet implemented' 
            });
        }
        
        // Create the insight record
        const insight = await Insight.create({
          title: title || `${insightType.replace('_', ' ')} for ${campaign.targetEmployee.firstName} ${campaign.targetEmployee.lastName}`,
          type: insightType,
          campaignId: campaignId,
          targetEmployeeId: campaign.targetEmployeeId,
          content: insightContent,
          originalAiContent: insightContent, // Save original AI content
          status: 'draft',
          createdBy: req.user.id
        });
        
        res.status(201).json({
          message: 'Insight generated successfully',
          insight: {
            id: insight.id,
            title: insight.title,
            type: insight.type,
            status: insight.status,
            content: insight.content,
            createdAt: insight.createdAt
          }
        });
      } catch (error) {
        console.error('Error generating insight:', error);
        res.status(500).json({ 
          message: 'Failed to generate insight', 
          error: error.message 
        });
      }
    }
    
    /**
     * Get insights for a user
     * @param {Request} req - Express request object
     * @param {Response} res - Express response object
     */
    async getUserInsights(req, res) {
      try {
        const insights = await Insight.findAll({
          where: {
            createdBy: req.user.id
          },
          include: [
            {
              model: Campaign,
              as: 'campaign',
              attributes: ['id', 'name', 'status']
            },
            {
              model: Employee,
              as: 'targetEmployee',
              attributes: ['id', 'firstName', 'lastName', 'jobTitle']
            }
          ],
          order: [['createdAt', 'DESC']]
        });
        
        res.status(200).json({
          insights
        });
      } catch (error) {
        console.error('Error getting user insights:', error);
        res.status(500).json({ 
          message: 'Failed to fetch insights', 
          error: error.message 
        });
      }
    }
    
    /**
     * Get insight by ID
     * @param {Request} req - Express request object
     * @param {Response} res - Express response object
     */
    async getInsightById(req, res) {
      try {
        const { id } = req.params;
        
        const insight = await Insight.findOne({
          where: {
            id,
            createdBy: req.user.id
          },
          include: [
            {
              model: Campaign,
              as: 'campaign',
              attributes: ['id', 'name', 'status']
            },
            {
              model: Employee,
              as: 'targetEmployee',
              attributes: ['id', 'firstName', 'lastName', 'jobTitle', 'email']
            }
          ]
        });
        
        if (!insight) {
          return res.status(404).json({ message: 'Insight not found' });
        }
        
        res.status(200).json({
          insight
        });
      } catch (error) {
        console.error('Error getting insight by ID:', error);
        res.status(500).json({ 
          message: 'Failed to fetch insight', 
          error: error.message 
        });
      }
    }
    
    /**
     * Update insight content
     * @param {Request} req - Express request object
     * @param {Response} res - Express response object
     */
    async updateInsight(req, res) {
      try {
        const { id } = req.params;
        const { 
          title, 
          content, 
          visibility, 
          status 
        } = req.body;
        
        const insight = await Insight.findOne({
          where: {
            id,
            createdBy: req.user.id
          }
        });
        
        if (!insight) {
          return res.status(404).json({ message: 'Insight not found' });
        }
        
        // Update fields if provided
        if (title) insight.title = title;
        if (content) insight.content = content;
        if (visibility) insight.visibility = visibility;
        if (status) insight.status = status;
        
        await insight.save();
        
        res.status(200).json({
          message: 'Insight updated successfully',
          insight: {
            id: insight.id,
            title: insight.title,
            status: insight.status,
            updatedAt: insight.updatedAt
          }
        });
      } catch (error) {
        console.error('Error updating insight:', error);
        res.status(500).json({ 
          message: 'Failed to update insight', 
          error: error.message 
        });
      }
    }
    
    /**
     * Delete insight
     * @param {Request} req - Express request object
     * @param {Response} res - Express response object
     */
    async deleteInsight(req, res) {
      try {
        const { id } = req.params;
        
        const insight = await Insight.findOne({
          where: {
            id,
            createdBy: req.user.id
          }
        });
        
        if (!insight) {
          return res.status(404).json({ message: 'Insight not found' });
        }
        
        await insight.destroy();
        
        res.status(200).json({
          message: 'Insight deleted successfully'
        });
      } catch (error) {
        console.error('Error deleting insight:', error);
        res.status(500).json({ 
          message: 'Failed to delete insight', 
          error: error.message 
        });
      }
    }
    
    /**
     * Export insight as PDF
     * @param {Request} req - Express request object
     * @param {Response} res - Express response object
     */
    async exportInsightPdf(req, res) {
      try {
        const { id } = req.params;
        const { visibilityLevel = 'employeeVisible' } = req.query;
        
        const insight = await Insight.findOne({
          where: {
            id,
            createdBy: req.user.id
          },
          include: [
            {
              model: Campaign,
              as: 'campaign',
              attributes: ['id', 'name', 'status']
            },
            {
              model: Employee,
              as: 'targetEmployee',
              attributes: ['id', 'firstName', 'lastName', 'jobTitle', 'email']
            }
          ]
        });
        
        if (!insight) {
          return res.status(404).json({ message: 'Insight not found' });
        }
        
        // Create a PDF document
        const doc = new PDFDocument({ 
          margin: 50,
          size: 'A4'
        });
        
        // Set the filename
        const filename = `${insight.type}_${insight.targetEmployee.firstName}_${insight.targetEmployee.lastName}_${Date.now()}.pdf`;
        const filepath = path.join(__dirname, '..', 'uploads', 'insights', filename);
        
        // Ensure directory exists
        const dir = path.dirname(filepath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Create a write stream
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);
        
        // Add content to PDF based on visibility level
        this.generatePdfContent(doc, insight, visibilityLevel);
        
        // Finalize the PDF and end the stream
        doc.end();
        
        // Wait for the stream to finish
        stream.on('finish', () => {
          // Send the file as a download
          res.download(filepath, filename, (err) => {
            if (err) {
              console.error('Error sending PDF:', err);
              res.status(500).json({ 
                message: 'Failed to download PDF', 
                error: err.message 
              });
            }
            
            // Delete the file after sending
            fs.unlink(filepath, (unlinkErr) => {
              if (unlinkErr) console.error('Error deleting temporary PDF:', unlinkErr);
            });
          });
        });
      } catch (error) {
        console.error('Error exporting insight as PDF:', error);
        res.status(500).json({ 
          message: 'Failed to export insight', 
          error: error.message 
        });
      }
    }
    
    /**
     * Generate PDF content for insight
     * @param {PDFDocument} doc - PDF document
     * @param {Object} insight - Insight data
     * @param {String} visibilityLevel - Visibility level
     */
    generatePdfContent(doc, insight, visibilityLevel) {
      // Helper function to determine if a section should be included
      const shouldIncludeSection = (sectionVisibility) => {
        if (visibilityLevel === 'hrOnly') return true; // HR sees everything
        if (visibilityLevel === 'managerOnly') return sectionVisibility !== 'hrOnly';
        if (visibilityLevel === 'employeeVisible') return sectionVisibility === 'employeeVisible';
        return false;
      };
      
      // Set title
      const title = this.formatInsightTypeForDisplay(insight.type);
      doc.font('Helvetica-Bold').fontSize(24).text(title, { align: 'center' });
      doc.moveDown();
      
      // Add employee info
      doc.font('Helvetica-Bold').fontSize(14).text('Employee Information');
      doc.font('Helvetica').fontSize(12);
      doc.text(`Name: ${insight.targetEmployee.firstName} ${insight.targetEmployee.lastName}`);
      if (insight.targetEmployee.jobTitle) {
        doc.text(`Position: ${insight.targetEmployee.jobTitle}`);
      }
      doc.moveDown(2);
      
      // Add content sections based on visibility
      Object.entries(insight.content).forEach(([sectionKey, sectionData]) => {
        if (shouldIncludeSection(sectionData.visibility)) {
          // Format section title
          const sectionTitle = sectionKey
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace(/([a-z])([A-Z])/g, '$1 $2');
          
          doc.font('Helvetica-Bold').fontSize(14).text(sectionTitle);
          doc.moveDown(0.5);
          
          // Add section content
          doc.font('Helvetica').fontSize(12).text(sectionData.content);
          doc.moveDown(2);
        }
      });
      
      // Add footer
      const date = new Date().toLocaleDateString();
      doc.font('Helvetica').fontSize(10).text(`Report generated on ${date}`, { align: 'center' });
    }
    
    /**
     * Format insight type for display
     * @param {String} type - Insight type
     * @returns {String} Formatted type
     */
    formatInsightTypeForDisplay(type) {
      const displayNames = {
        'growth_blueprint': 'Your Growth Blueprint',
        'leadership_impact': 'Leadership Impact Navigator',
        'team_synergy': 'Team Synergy Compass',
        'collaboration_patterns': 'Collaboration Patterns Analysis',
        'talent_landscape': 'Talent Landscape Panorama',
        'culture_pulse': 'Culture Pulse Monitor',
        'development_impact': 'Development Impact Scorecard'
      };
      
      return displayNames[type] || type.replace(/_/g, ' ');
    }
    
    /**
     * Get feedback data for a campaign
     * @param {String} campaignId - Campaign ID
     * @returns {Object} Aggregated feedback data
     */
    async getFeedbackDataForCampaign(campaignId) {
      // Get all responses for the campaign
      const responses = await Response.findAll({
        where: { campaignId },
        include: [
          { 
            model: Question,
            attributes: ['id', 'text', 'type', 'category', 'perspective', 'order']
          },
          {
            model: CampaignParticipant,
            as: 'participant',
            attributes: ['id', 'relationshipType', 'status'],
          }
        ]
      });
      
      // Group responses by relationship type
      const responsesByType = {
        self: [],
        manager: [],
        peer: [],
        direct_report: [],
        external: []
      };
      
      responses.forEach(response => {
        if (response.participant && response.participant.relationshipType) {
          const type = response.participant.relationshipType;
          if (responsesByType[type]) {
            responsesByType[type].push(response);
          }
        }
      });
      
      // Aggregate by category and question
      const aggregatedData = {
        byRelationshipType: {},
        byCategory: {},
        byQuestion: {},
        completedParticipantsByType: {}
      };
      
      // Count completed participants by type
      const participantCount = await CampaignParticipant.findAll({
        where: { 
          campaignId,
          status: 'completed'
        },
        attributes: ['id', 'relationshipType']
      });
      
      participantCount.forEach(p => {
        const type = p.relationshipType;
        if (!aggregatedData.completedParticipantsByType[type]) {
          aggregatedData.completedParticipantsByType[type] = 0;
        }
        aggregatedData.completedParticipantsByType[type]++;
      });
      
      // Process responses by type
      Object.entries(responsesByType).forEach(([type, typeResponses]) => {
        // Skip if no responses
        if (typeResponses.length === 0) return;
        
        aggregatedData.byRelationshipType[type] = {
          ratings: {},
          textResponses: {},
          count: aggregatedData.completedParticipantsByType[type] || 0
        };
        
        // Process responses
        typeResponses.forEach(response => {
          if (!response.Question) return;
          
          const question = response.Question;
          const questionId = question.id;
          const category = question.category;
          
          // Initialize category if not exists
          if (!aggregatedData.byCategory[category]) {
            aggregatedData.byCategory[category] = {
              ratings: {},
              textResponses: {},
              questionCount: 0
            };
          }
          
          // Initialize question if not exists
          if (!aggregatedData.byQuestion[questionId]) {
            aggregatedData.byQuestion[questionId] = {
              text: question.text,
              type: question.type,
              category: category,
              ratings: {},
              textResponses: {}
            };
          }
          
          // Process by question type
          if (question.type === 'rating' && response.ratingValue) {
            // Add to relationship type
            if (!aggregatedData.byRelationshipType[type].ratings[questionId]) {
              aggregatedData.byRelationshipType[type].ratings[questionId] = {
                values: [],
                average: 0,
                count: 0
              };
            }
            aggregatedData.byRelationshipType[type].ratings[questionId].values.push(response.ratingValue);
            
            // Add to category
            if (!aggregatedData.byCategory[category].ratings[questionId]) {
              aggregatedData.byCategory[category].ratings[questionId] = {
                values: [],
                average: 0,
                count: 0
              };
            }
            aggregatedData.byCategory[category].ratings[questionId].values.push(response.ratingValue);
            
            // Add to question
            if (!aggregatedData.byQuestion[questionId].ratings[type]) {
              aggregatedData.byQuestion[questionId].ratings[type] = {
                values: [],
                average: 0,
                count: 0
              };
            }
            aggregatedData.byQuestion[questionId].ratings[type].values.push(response.ratingValue);
          } 
          else if ((question.type === 'open_ended' || question.type === 'text') && response.textResponse) {
            // Add to relationship type
            if (!aggregatedData.byRelationshipType[type].textResponses[questionId]) {
              aggregatedData.byRelationshipType[type].textResponses[questionId] = [];
            }
            aggregatedData.byRelationshipType[type].textResponses[questionId].push(response.textResponse);
            
            // Add to category
            if (!aggregatedData.byCategory[category].textResponses[questionId]) {
              aggregatedData.byCategory[category].textResponses[questionId] = [];
            }
            aggregatedData.byCategory[category].textResponses[questionId].push(response.textResponse);
            
            // Add to question
            if (!aggregatedData.byQuestion[questionId].textResponses[type]) {
              aggregatedData.byQuestion[questionId].textResponses[type] = [];
            }
            aggregatedData.byQuestion[questionId].textResponses[type].push(response.textResponse);
          }
        });
      });
      
      // Calculate averages for ratings
      Object.keys(aggregatedData.byRelationshipType).forEach(type => {
        Object.keys(aggregatedData.byRelationshipType[type].ratings).forEach(questionId => {
          const values = aggregatedData.byRelationshipType[type].ratings[questionId].values;
          if (values.length > 0) {
            const sum = values.reduce((a, b) => a + b, 0);
            aggregatedData.byRelationshipType[type].ratings[questionId].average = sum / values.length;
            aggregatedData.byRelationshipType[type].ratings[questionId].count = values.length;
          }
        });
      });
      
      Object.keys(aggregatedData.byCategory).forEach(category => {
        Object.keys(aggregatedData.byCategory[category].ratings).forEach(questionId => {
          const values = aggregatedData.byCategory[category].ratings[questionId].values;
          if (values.length > 0) {
            const sum = values.reduce((a, b) => a + b, 0);
            aggregatedData.byCategory[category].ratings[questionId].average = sum / values.length;
            aggregatedData.byCategory[category].ratings[questionId].count = values.length;
          }
        });
      });
      
      Object.keys(aggregatedData.byQuestion).forEach(questionId => {
        Object.keys(aggregatedData.byQuestion[questionId].ratings).forEach(type => {
          const values = aggregatedData.byQuestion[questionId].ratings[type].values;
          if (values.length > 0) {
            const sum = values.reduce((a, b) => a + b, 0);
            aggregatedData.byQuestion[questionId].ratings[type].average = sum / values.length;
            aggregatedData.byQuestion[questionId].ratings[type].count = values.length;
          }
        });
      });
      
      return aggregatedData;
    }
  }
  
  module.exports = new InsightsController();