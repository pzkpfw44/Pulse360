// backend/controllers/campaigns.controller.js

const { 
    Campaign, 
    CampaignParticipant, 
    Template, 
    Employee, 
    Question,
    EmailSettings
  } = require('../models');
  const { v4: uuidv4 } = require('uuid');
  const emailService = require('../services/email.service');
  
  // Get all campaigns
  exports.getAllCampaigns = async (req, res) => {
    try {
      const campaigns = await Campaign.findAll({
        where: { createdBy: req.user.id },
        include: [
          { 
            model: Template, 
            as: 'template',
            attributes: ['id', 'name', 'documentType']
          },
          { 
            model: Employee, 
            as: 'targetEmployee',
            attributes: ['id', 'firstName', 'lastName', 'email', 'jobTitle']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
      
      res.status(200).json({
        count: campaigns.length,
        campaigns
      });
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({ 
        message: 'Failed to fetch campaigns', 
        error: error.message 
      });
    }
  };
  
  // Get campaign by ID
  exports.getCampaignById = async (req, res) => {
    try {
      const campaign = await Campaign.findOne({
        where: { 
          id: req.params.id,
          createdBy: req.user.id
        },
        include: [
          { 
            model: Template, 
            as: 'template',
            include: [
              { model: Question, as: 'questions' }
            ]
          },
          { 
            model: Employee, 
            as: 'targetEmployee'
          },
          { 
            model: CampaignParticipant, 
            as: 'participants',
            include: [
              { model: Employee, as: 'employee' }
            ]
          }
        ]
      });
      
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }
      
      res.status(200).json(campaign);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      res.status(500).json({ 
        message: 'Failed to fetch campaign', 
        error: error.message 
      });
    }
  };
  
// Create new campaign
exports.createCampaign = async (req, res) => {
    try {
      const { 
        name, 
        description, 
        startDate,
        endDate,
        templateId, 
        targetEmployeeId,
        participants,
        status = 'draft',
        settings
      } = req.body;
      
      // Validate fields only for non-draft campaigns
      if (status !== 'draft' && (!name || !templateId || !targetEmployeeId)) {
        return res.status(400).json({ 
          message: 'Name, template ID, and target employee ID are required for non-draft campaigns' 
        });
      }
      
      // Check if template exists (if provided)
      if (templateId) {
        const template = await Template.findByPk(templateId);
        if (!template) {
          return res.status(404).json({ message: 'Template not found' });
        }
      }
      
      // Check if target employee exists (only if an ID is provided)
      if (targetEmployeeId && targetEmployeeId.trim() !== '') {
        const targetEmployee = await Employee.findByPk(targetEmployeeId);
        if (!targetEmployee) {
          return res.status(404).json({ message: 'Target employee not found' });
        }
      }
      
      // Create the campaign
      const campaign = await Campaign.create({
        name,
        description,
        startDate,
        endDate,
        templateId,
        targetEmployeeId: targetEmployeeId && targetEmployeeId.trim() !== '' ? targetEmployeeId : null,
        status,
        settings,
        createdBy: req.user.id,
        completionRate: 0
      });
      
      // Add participants if provided
      if (participants && Array.isArray(participants)) {
        for (const participant of participants) {
          // Validate participant data
          if (!participant.employeeId || !participant.relationshipType) {
            continue; // Skip invalid participants
          }
          
          // Generate unique invitation token
          const invitationToken = uuidv4();
          
          await CampaignParticipant.create({
            campaignId: campaign.id,
            employeeId: participant.employeeId,
            relationshipType: participant.relationshipType,
            status: 'pending',
            invitationToken,
            customMessage: participant.customMessage,
            aiSuggested: participant.aiSuggested || false
          });
        }
      }
      
      // Return the created campaign with its participants
      const createdCampaign = await Campaign.findOne({
        where: { id: campaign.id },
        include: [
          { 
            model: Template, 
            as: 'template',  // Changed to lowercase
            attributes: ['id', 'name', 'documentType']
          },
          { 
            model: Employee, 
            as: 'targetEmployee',
            attributes: ['id', 'firstName', 'lastName', 'email', 'jobTitle']
          },
          { 
            model: CampaignParticipant, 
            as: 'participants',
            include: [
              { model: Employee, as: 'employee' }
            ]
          }
        ]
      });
      
      res.status(201).json(createdCampaign);
    } catch (error) {
      console.error('Error creating campaign:', error);
      res.status(500).json({ 
        message: 'Failed to create campaign', 
        error: error.message 
      });
    }
  };
  
  // Update campaign
  exports.updateCampaign = async (req, res) => {
    try {
      const { 
        name, 
        description, 
        startDate,
        endDate,
        templateId, 
        targetEmployeeId,
        participants,
        status,
        settings
      } = req.body;
      
      // Find the campaign
      const campaign = await Campaign.findOne({
        where: { 
          id: req.params.id,
          createdBy: req.user.id
        }
      });
      
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }
      
      // Check if campaign can be updated
      if (campaign.status !== 'draft' && status !== 'canceled') {
        return res.status(400).json({ 
          message: 'Only draft campaigns can be updated' 
        });
      }
      
      // Update campaign fields
      await campaign.update({
        name: name || campaign.name,
        description: description !== undefined ? description : campaign.description,
        startDate: startDate || campaign.startDate,
        endDate: endDate || campaign.endDate,
        templateId: templateId || campaign.templateId,
        targetEmployeeId: targetEmployeeId || campaign.targetEmployeeId,
        status: status || campaign.status,
        settings: settings || campaign.settings
      });
      
      // Update participants if provided
      if (participants && Array.isArray(participants)) {
        // Get existing participants
        const existingParticipants = await CampaignParticipant.findAll({
          where: { campaignId: campaign.id }
        });
        
        const existingParticipantIds = existingParticipants.map(p => p.id);
        
        // Identify participants to add, update, or remove
        const participantsToKeep = participants.filter(p => p.id);
        const participantIdsToKeep = participantsToKeep.map(p => p.id);
        const participantsToAdd = participants.filter(p => !p.id);
        const participantIdsToRemove = existingParticipantIds.filter(
          id => !participantIdsToKeep.includes(id)
        );
        
        // Remove participants
        if (participantIdsToRemove.length > 0) {
          await CampaignParticipant.destroy({
            where: { 
              id: participantIdsToRemove,
              campaignId: campaign.id
            }
          });
        }
        
        // Update existing participants
        for (const participant of participantsToKeep) {
          await CampaignParticipant.update(
            {
              relationshipType: participant.relationshipType || 'peer',
              customMessage: participant.customMessage,
              status: participant.status || 'pending'
            },
            { where: { id: participant.id, campaignId: campaign.id } }
          );
        }
        
        // Add new participants
        for (const participant of participantsToAdd) {
          if (!participant.employeeId || !participant.relationshipType) {
            continue; // Skip invalid participants
          }
          
          // Generate unique invitation token
          const invitationToken = uuidv4();
          
          await CampaignParticipant.create({
            campaignId: campaign.id,
            employeeId: participant.employeeId,
            relationshipType: participant.relationshipType,
            status: 'pending',
            invitationToken,
            customMessage: participant.customMessage,
            aiSuggested: participant.aiSuggested || false
          });
        }
      }
      
      // Return the updated campaign with its participants
      const updatedCampaign = await Campaign.findOne({
        where: { id: campaign.id },
        include: [
          { 
            model: Template, 
            as: 'template',
            attributes: ['id', 'name', 'documentType']
          },
          { 
            model: Employee, 
            as: 'targetEmployee',
            attributes: ['id', 'firstName', 'lastName', 'email', 'jobTitle']
          },
          { 
            model: CampaignParticipant, 
            as: 'participants',
            include: [
              { model: Employee, as: 'employee' }
            ]
          }
        ]
      });
      
      res.status(200).json(updatedCampaign);
    } catch (error) {
      console.error('Error updating campaign:', error);
      res.status(500).json({ 
        message: 'Failed to update campaign', 
        error: error.message 
      });
    }
  };
  
  // Launch campaign
  exports.launchCampaign = async (req, res) => {
    try {
      const campaign = await Campaign.findOne({
        where: { 
          id: req.params.id,
          createdBy: req.user.id
        },
        include: [
          { 
            model: Template, 
            as: 'template' 
          },
          {
            model: Employee,
            as: 'targetEmployee'
          },
          {
            model: CampaignParticipant,
            as: 'participants',
            include: [
              { model: Employee, as: 'employee' }
            ]
          }
        ]
      });
      
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }
      
      // Check if campaign can be launched
      if (campaign.status !== 'draft') {
        return res.status(400).json({ 
          message: 'Only draft campaigns can be launched' 
        });
      }
      
      // Validate campaign has required participants
      const participants = campaign.participants || [];
      const relationshipTypes = participants.map(p => p.relationshipType);
      
      // Check for self-assessment
      if (!relationshipTypes.includes('self')) {
        return res.status(400).json({ 
          message: 'Campaign must include self-assessment' 
        });
      }
      
      // Check for manager
      if (!relationshipTypes.includes('manager')) {
        return res.status(400).json({ 
          message: 'Campaign must include at least one manager' 
        });
      }
      
      // Check for minimum peers
      const peerCount = relationshipTypes.filter(type => type === 'peer').length;
      if (peerCount < 3) {
        return res.status(400).json({ 
          message: 'Campaign must include at least three peers' 
        });
      }
      
      // Check if dates are set
      if (!campaign.startDate || !campaign.endDate) {
        return res.status(400).json({ 
          message: 'Campaign start and end dates must be set' 
        });
      }
      
      // Update campaign status
      await campaign.update({
        status: 'active',
        lastReminderSent: new Date() // Record when invitations are sent
      });
      
      // Send invitation emails to all participants
      try {
        const emailSettings = await EmailSettings.findOne();
        
        if (emailSettings && !emailSettings.devMode) {
          for (const participant of participants) {
            // Set participant status to invited
            await participant.update({ 
              status: 'invited',
              lastInvitedAt: new Date()
            });
            
            // Create feedback URL with token
            const feedbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/feedback/${participant.invitationToken}`;
            
            // Get appropriate email template
            const emailTemplate = getEmailTemplate(participant.relationshipType, 'invitation');
            
            // Replace placeholders in template
            const emailContent = replaceEmailPlaceholders(emailTemplate, {
              assessorName: participant.employee.firstName,
              targetName: campaign.targetEmployee.firstName + ' ' + campaign.targetEmployee.lastName,
              campaignName: campaign.name,
              deadline: new Date(campaign.endDate).toLocaleDateString(),
              feedbackUrl
            });
            
            // Send email
            await emailService.sendEmail({
              to: participant.employee.email,
              subject: `360 Feedback Request: ${campaign.name}`,
              html: emailContent
            });
          }
        } else {
          // In development mode, just update status without sending emails
          for (const participant of participants) {
            await participant.update({ 
              status: 'invited',
              lastInvitedAt: new Date()
            });
          }
          
          console.log('Development mode: Emails not sent, but participant status updated');
        }
      } catch (emailError) {
        console.error('Error sending invitation emails:', emailError);
        // Continue with launch even if emails fail
      }
      
      // Return the updated campaign
      const updatedCampaign = await Campaign.findOne({
        where: { id: campaign.id },
        include: [
          { 
            model: Template, 
            as: 'template',
            attributes: ['id', 'name', 'documentType']
          },
          { 
            model: Employee, 
            as: 'targetEmployee',
            attributes: ['id', 'firstName', 'lastName', 'email', 'jobTitle']
          },
          { 
            model: CampaignParticipant, 
            as: 'participants',
            include: [
              { model: Employee, as: 'employee' }
            ]
          }
        ]
      });
      
      res.status(200).json({
        message: 'Campaign launched successfully',
        campaign: updatedCampaign
      });
    } catch (error) {
      console.error('Error launching campaign:', error);
      res.status(500).json({ 
        message: 'Failed to launch campaign', 
        error: error.message 
      });
    }
  };
  
  // Cancel campaign
  exports.cancelCampaign = async (req, res) => {
    try {
      const campaign = await Campaign.findOne({
        where: { 
          id: req.params.id,
          createdBy: req.user.id
        }
      });
      
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }
      
      // Check if campaign can be canceled
      if (campaign.status === 'completed' || campaign.status === 'canceled') {
        return res.status(400).json({ 
          message: 'Campaign cannot be canceled' 
        });
      }
      
      // Update campaign status
      await campaign.update({
        status: 'canceled'
      });
      
      res.status(200).json({ 
        message: 'Campaign canceled successfully' 
      });
    } catch (error) {
      console.error('Error canceling campaign:', error);
      res.status(500).json({ 
        message: 'Failed to cancel campaign', 
        error: error.message 
      });
    }
  };
  
  // Delete campaign
  exports.deleteCampaign = async (req, res) => {
    try {
      const campaign = await Campaign.findOne({
        where: { 
          id: req.params.id,
          createdBy: req.user.id
        }
      });
      
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }
      
      // Check if campaign can be deleted (only draft or canceled)
      if (campaign.status !== 'draft' && campaign.status !== 'canceled') {
        return res.status(400).json({ 
          message: 'Only draft or canceled campaigns can be deleted' 
        });
      }
      
      // Delete participants first (cascade would handle this, but being explicit)
      await CampaignParticipant.destroy({
        where: { campaignId: campaign.id }
      });
      
      // Delete the campaign
      await campaign.destroy();
      
      res.status(200).json({ 
        message: 'Campaign deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting campaign:', error);
      res.status(500).json({ 
        message: 'Failed to delete campaign', 
        error: error.message 
      });
    }
  };
  
  // Suggest assessors for a campaign
  exports.suggestAssessors = async (req, res) => {
    try {
      const { templateId, employeeId } = req.body;
      
      if (!templateId || !employeeId) {
        return res.status(400).json({ 
          message: 'Template ID and employee ID are required' 
        });
      }
      
      // Get the template to check enabled perspective types
      const template = await Template.findByPk(templateId);
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }
      
      // Get the target employee
      const targetEmployee = await Employee.findByPk(employeeId);
      if (!targetEmployee) {
        return res.status(404).json({ message: 'Target employee not found' });
      }
      
      // Get all employees for suggestion
      const allEmployees = await Employee.findAll({
        where: { status: 'active' }
      });
      
      const suggestions = {
        self: [],
        manager: [],
        direct_report: [],
        peer: [],
        external: []
      };
      
      // Always suggest the employee themselves for self assessment
      suggestions.self.push({
        id: targetEmployee.id,
        name: `${targetEmployee.firstName} ${targetEmployee.lastName}`,
        email: targetEmployee.email,
        jobTitle: targetEmployee.jobTitle || '',
        confidence: 1.0,
        reason: 'Self-assessment'
      });
      
      // Suggest manager if available
      if (targetEmployee.managerId) {
        const manager = allEmployees.find(e => e.employeeId === targetEmployee.managerId);
        if (manager) {
          suggestions.manager.push({
            id: manager.id,
            name: `${manager.firstName} ${manager.lastName}`,
            email: manager.email,
            jobTitle: manager.jobTitle || '',
            confidence: 1.0,
            reason: 'Direct manager'
          });
        }
      }
      
      // Suggest second-level manager if available
      if (targetEmployee.secondLevelManagerId) {
        const secondLevelManager = allEmployees.find(e => e.employeeId === targetEmployee.secondLevelManagerId);
        if (secondLevelManager) {
          suggestions.manager.push({
            id: secondLevelManager.id,
            name: `${secondLevelManager.firstName} ${secondLevelManager.lastName}`,
            email: secondLevelManager.email,
            jobTitle: secondLevelManager.jobTitle || '',
            confidence: 0.9,
            reason: 'Second-level manager'
          });
        }
      }
      
      // Find direct reports (employees who have this person as their manager)
      const directReports = allEmployees.filter(e => 
        e.managerId === targetEmployee.employeeId && e.id !== targetEmployee.id
      );
      
      directReports.forEach(dr => {
        suggestions.direct_report.push({
          id: dr.id,
          name: `${dr.firstName} ${dr.lastName}`,
          email: dr.email,
          jobTitle: dr.jobTitle || '',
          confidence: 1.0,
          reason: 'Direct report'
        });
      });
      
      // For peers, look at employees with:
      // 1. Same manager
      // 2. Same department/function
      const peers = allEmployees.filter(e => {
        if (e.id === targetEmployee.id) return false; // Exclude self
        
        const sameManager = e.managerId === targetEmployee.managerId && targetEmployee.managerId;
        const sameFunction = e.mainFunction === targetEmployee.mainFunction && targetEmployee.mainFunction;
        
        return sameManager || sameFunction;
      });
      
      peers.forEach(peer => {
        const sameManager = peer.managerId === targetEmployee.managerId && targetEmployee.managerId;
        const sameFunction = peer.mainFunction === targetEmployee.mainFunction && targetEmployee.mainFunction;
        let confidence = 0.6;
        let reason = '';
        
        if (sameManager && sameFunction) {
          confidence = 0.9;
          reason = 'Same manager and function';
        } else if (sameManager) {
          confidence = 0.8;
          reason = 'Same manager';
        } else if (sameFunction) {
          confidence = 0.7;
          reason = 'Same function';
        }
        
        suggestions.peer.push({
          id: peer.id,
          name: `${peer.firstName} ${peer.lastName}`,
          email: peer.email,
          jobTitle: peer.jobTitle || '',
          confidence,
          reason
        });
      });
      
      // Sort suggestions by confidence
      for (const type in suggestions) {
        suggestions[type] = suggestions[type].sort((a, b) => b.confidence - a.confidence);
      }
      
      // Check if we have enough suggestions
      const hasSufficientData = {
        self: suggestions.self.length > 0,
        manager: suggestions.manager.length > 0,
        direct_report: suggestions.direct_report.length >= 3,
        peer: suggestions.peer.length >= 3,
        external: false // We don't have a way to suggest external reviewers
      };
      
      res.status(200).json({
        suggestions,
        hasSufficientData,
        targetEmployee: {
          id: targetEmployee.id,
          name: `${targetEmployee.firstName} ${targetEmployee.lastName}`,
          email: targetEmployee.email,
          jobTitle: targetEmployee.jobTitle || '',
          function: targetEmployee.mainFunction || ''
        }
      });
    } catch (error) {
      console.error('Error suggesting assessors:', error);
      res.status(500).json({ 
        message: 'Failed to suggest assessors', 
        error: error.message 
      });
    }
  };
  
  // Generate email templates
  exports.generateEmailTemplates = async (req, res) => {
    try {
      // This is a placeholder for where you'd integrate with Flux AI
      // For now, we'll return some basic templates
      
      const templates = {
        invitation: {
          general: `
            <p>Hello {assessorName},</p>
            <p>You've been invited to provide feedback for {targetName} as part of the "{campaignName}" feedback campaign.</p>
            <p>Please complete your feedback by {deadline}. Your insights are valuable for {targetName}'s professional development.</p>
            <p>To provide your feedback, please click on the link below:</p>
            <p><a href="{feedbackUrl}">Complete your feedback</a></p>
            <p>Thank you for your participation!</p>
          `,
          self: `
            <p>Hello {assessorName},</p>
            <p>As part of the "{campaignName}" feedback campaign, you're invited to complete a self-assessment.</p>
            <p>Your self-reflection is an important part of the 360-degree feedback process.</p>
            <p>Please complete your self-assessment by {deadline}.</p>
            <p>To begin, please click on the link below:</p>
            <p><a href="{feedbackUrl}">Complete your self-assessment</a></p>
            <p>Thank you for your participation!</p>
          `
        },
        reminder: {
          general: `
            <p>Hello {assessorName},</p>
            <p>This is a friendly reminder that your feedback for {targetName} as part of the "{campaignName}" campaign is due by {deadline}.</p>
            <p>Your input is valuable, and we appreciate you taking the time to provide thoughtful feedback.</p>
            <p>To complete your feedback, please click on the link below:</p>
            <p><a href="{feedbackUrl}">Complete your feedback</a></p>
            <p>Thank you for your participation!</p>
          `
        },
        thankYou: {
          general: `
            <p>Hello {assessorName},</p>
            <p>Thank you for completing your feedback for {targetName} as part of the "{campaignName}" campaign.</p>
            <p>Your insights will help support {targetName}'s professional development.</p>
            <p>We appreciate your time and thoughtful contribution.</p>
          `
        }
      };
      
      res.status(200).json({
        templates
      });
    } catch (error) {
      console.error('Error generating email templates:', error);
      res.status(500).json({ 
        message: 'Failed to generate email templates', 
        error: error.message 
      });
    }
  };
  
  // Helper function to get appropriate email template
  function getEmailTemplate(relationshipType, templateType) {
    // This is a placeholder - in a production environment, you would:
    // 1. Retrieve templates from the database
    // 2. Select based on relationship type and template type
    
    const defaultTemplate = `
      <p>Hello {assessorName},</p>
      <p>You've been invited to provide feedback for {targetName} as part of the "{campaignName}" feedback campaign.</p>
      <p>Please complete your feedback by {deadline}.</p>
      <p>To provide your feedback, please click on the link below:</p>
      <p><a href="{feedbackUrl}">Complete your feedback</a></p>
      <p>Thank you for your participation!</p>
    `;
    
    if (templateType === 'invitation' && relationshipType === 'self') {
      return `
        <p>Hello {assessorName},</p>
        <p>As part of the "{campaignName}" feedback campaign, you're invited to complete a self-assessment.</p>
        <p>Your self-reflection is an important part of the 360-degree feedback process.</p>
        <p>Please complete your self-assessment by {deadline}.</p>
        <p>To begin, please click on the link below:</p>
        <p><a href="{feedbackUrl}">Complete your self-assessment</a></p>
        <p>Thank you for your participation!</p>
      `;
    }
    
    return defaultTemplate;
  }
  
  // Helper function to replace placeholders in email templates
  function replaceEmailPlaceholders(template, data) {
    let content = template;
    
    for (const [key, value] of Object.entries(data)) {
      content = content.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    
    return content;
  }