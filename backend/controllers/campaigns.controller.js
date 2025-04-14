// backend/controllers/campaigns.controller.js

const { 
  Campaign, 
  CampaignParticipant, 
  Template, 
  Employee, 
  Question,
  EmailSettings,
  sequelize,
  CommunicationTemplate
} = require('../models');
const { v4: uuidv4 } = require('uuid');
const emailService = require('../services/email.service');

// Get all campaigns
exports.getAllCampaigns = async (req, res) => {
  try {
    // Check if the useFullAiSupport column exists in the database
    let includeUseFullAiSupport = true;
    try {
      const tableDescription = await sequelize.getQueryInterface().describeTable('campaigns');
      includeUseFullAiSupport = !!tableDescription.useFullAiSupport;
    } catch (describeError) {
      console.warn('Warning: Could not describe campaigns table', describeError);
      includeUseFullAiSupport = false;
    }
    
    // Select attributes dynamically based on schema
    const attributes = [
      'id', 'name', 'description', 'startDate', 'endDate', 
      'status', 'templateId', 'targetEmployeeId', 'completionRate', 
      'lastReminderSent', 'settings', 'createdBy', 'createdAt', 'updatedAt'
    ];
    
    // Only include the useFullAiSupport attribute if it exists
    if (includeUseFullAiSupport) {
      attributes.push('useFullAiSupport');
    }
    
    const campaigns = await Campaign.findAll({
      attributes: attributes,
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
        },
        // Add this new include for participants
        { 
          model: CampaignParticipant, 
          as: 'participants',
          attributes: ['id', 'status', 'relationshipType']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // If useFullAiSupport doesn't exist, add it as true by default in the response
    if (!includeUseFullAiSupport) {
      campaigns.forEach(campaign => {
        campaign.dataValues.useFullAiSupport = true; // Default value
      });
    }
    
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
      settings,
      useFullAiSupport = true // Default to true if not provided
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
    
    // Create the campaign with the new field
    const campaign = await Campaign.create({
      name,
      description,
      startDate,
      endDate,
      templateId,
      targetEmployeeId: targetEmployeeId && targetEmployeeId.trim() !== '' ? targetEmployeeId : null,
      status,
      settings,
      useFullAiSupport, // Include the new field
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
      settings,
      useFullAiSupport
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
    
    // Update campaign fields including the new useFullAiSupport field
    await campaign.update({
      name: name || campaign.name,
      description: description !== undefined ? description : campaign.description,
      startDate: startDate || campaign.startDate,
      endDate: endDate || campaign.endDate,
      templateId: templateId || campaign.templateId,
      targetEmployeeId: targetEmployeeId || campaign.targetEmployeeId,
      status: status || campaign.status,
      settings: settings || campaign.settings,
      useFullAiSupport: useFullAiSupport !== undefined ? useFullAiSupport : campaign.useFullAiSupport
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
    console.log('\n=== LAUNCHING CAMPAIGN ===');
    console.log(`Campaign ID: ${req.params.id}`);
    console.log(`User: ${req.user.id}`);

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
      console.log('Campaign not found');
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    // Check if campaign can be launched
    if (campaign.status !== 'draft') {
      console.log('Campaign is not in draft status:', campaign.status);
      return res.status(400).json({ 
        message: 'Only draft campaigns can be launched' 
      });
    }
    
    // Validate campaign has required participants
    const participants = campaign.participants || [];
    console.log(`Campaign has ${participants.length} participants`);
    
    const relationshipTypes = participants.map(p => p.relationshipType);
    
    // Check for self-assessment
    if (!relationshipTypes.includes('self')) {
      console.log('Campaign is missing self-assessment participant');
      return res.status(400).json({ 
        message: 'Campaign must include self-assessment' 
      });
    }
    
    // Check for manager
    if (!relationshipTypes.includes('manager')) {
      console.log('Campaign is missing manager participant');
      return res.status(400).json({ 
        message: 'Campaign must include at least one manager' 
      });
    }
    
    // Check for minimum peers
    const peerCount = relationshipTypes.filter(type => type === 'peer').length;
    if (peerCount < 3) {
      console.log('Campaign has insufficient peers:', peerCount);
      return res.status(400).json({ 
        message: 'Campaign must include at least three peers' 
      });
    }
    
    // Check if dates are set
    if (!campaign.startDate || !campaign.endDate) {
      console.log('Campaign is missing dates');
      return res.status(400).json({ 
        message: 'Campaign start and end dates must be set' 
      });
    }
    
    console.log('Campaign validation passed, updating status to active');
    
    // Update campaign status
    await campaign.update({
      status: 'active',
      lastReminderSent: new Date() // Record when invitations are sent
    });
    
    // Send invitation emails to all participants
    try {
      console.log('Getting email settings');
      const emailSettings = await EmailSettings.findOne();
      
      if (!emailSettings) {
        console.log('No email settings found!');
      } else {
        console.log('Email settings found, devMode:', emailSettings.devMode);
      }
      
      console.log('Starting to process participants');
      for (const participant of participants) {
        console.log(`\nProcessing participant: ${participant.id}`);
        console.log(`Email: ${participant.employee?.email || 'Unknown'}`);
        console.log(`Type: ${participant.relationshipType}`);
        
        if (!participant.employee || !participant.employee.email) {
          console.log('Participant has no email, skipping');
          continue;
        }
        
        // Set participant status to invited
        await participant.update({ 
          status: 'invited',
          lastInvitedAt: new Date()
        });
        
        console.log('Updated participant status to invited');
        
        // Create feedback URL with token
        const feedbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/feedback/${participant.invitationToken}`;
        
        // Common email variables
        const emailVars = {
          assessorName: participant.employee.firstName,
          targetName: campaign.targetEmployee.firstName + ' ' + campaign.targetEmployee.lastName,
          campaignName: campaign.name,
          deadline: new Date(campaign.endDate).toLocaleDateString(),
          feedbackUrl,
          companyName: 'Your Company'
        };
        
        try {
          // Step 1: Get and send invitation email
          console.log('Getting invitation template for:', participant.relationshipType);
          const invitationTemplate = await getEmailTemplate(participant.relationshipType, 'invitation');
          
          if (!invitationTemplate) {
            console.log('No invitation template found!');
            continue;
          }
          
          console.log('Sending invitation email');
          // Send invitation email
          await emailService.sendEmail({
            to: participant.employee.email,
            subject: replaceEmailPlaceholders(invitationTemplate.subject, emailVars),
            html: replaceEmailPlaceholders(invitationTemplate.content, emailVars),
            devMode: false, // Force sending even in dev mode
            campaignId: campaign.id,
            participantId: participant.id,
            communicationType: 'invitation'
          });
          
          console.log('Invitation email sent successfully');
          
          // Step 2: Wait a short time before sending instructions
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          
          // Step 3: Get and send instruction email
          console.log('Getting instruction template');
          const instructionTemplate = await getEmailTemplate(participant.relationshipType, 'instruction');
          
          if (!instructionTemplate) {
            console.log('No instruction template found!');
            continue;
          }
          
          console.log('Sending instruction email');
          // Send instruction email
          await emailService.sendEmail({
            to: participant.employee.email,
            subject: replaceEmailPlaceholders(instructionTemplate.subject, emailVars),
            html: replaceEmailPlaceholders(instructionTemplate.content, emailVars),
            devMode: false, // Force sending even in dev mode
            campaignId: campaign.id,
            participantId: participant.id,
            communicationType: 'instruction'
          });
          
          console.log('Instruction email sent successfully');
        } catch (individualEmailError) {
          console.error(`Error sending emails to ${participant.employee.email}:`, individualEmailError);
          // Continue with other participants even if this one fails
        }
      }
      
      console.log('All participants processed');
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
    
    console.log('Campaign launched successfully');
    
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
    
    // Suggest manager if available (using targetEmployee.managerId)
    if (targetEmployee.managerId) {
      const manager = allEmployees.find(e => e.id === targetEmployee.managerId);
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
      const secondLevelManager = allEmployees.find(e => e.id === targetEmployee.secondLevelManagerId);
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
      e.managerId === targetEmployee.id && e.id !== targetEmployee.id
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
      
      const sameManager = targetEmployee.managerId && e.managerId === targetEmployee.managerId;
      const sameFunction = targetEmployee.mainFunction && e.mainFunction === targetEmployee.mainFunction;
      
      return sameManager || sameFunction;
    });
    
    peers.forEach(peer => {
      const sameManager = targetEmployee.managerId && peer.managerId === targetEmployee.managerId;
      const sameFunction = targetEmployee.mainFunction && peer.mainFunction === targetEmployee.mainFunction;
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
async function getEmailTemplate(relationshipType, templateType) {
  try {
    console.log(`Looking for template: ${templateType} for ${relationshipType}`);
    
    // First try to find a template specifically for this relationship type
    let template = await CommunicationTemplate.findOne({
      where: {
        templateType: templateType,
        recipientType: relationshipType,
        isDefault: true
      }
    });
    
    // If no specific template exists, fall back to the "all" recipient type
    if (!template) {
      console.log(`No specific template found, looking for 'all' type`);
      template = await CommunicationTemplate.findOne({
        where: {
          templateType: templateType,
          recipientType: 'all',
          isDefault: true
        }
      });
    }
    
    // If still no template, check for any template without isDefault requirement
    if (!template) {
      console.log(`No default template found, looking for any ${templateType} template`);
      template = await CommunicationTemplate.findOne({
        where: {
          templateType: templateType
        }
      });
    }
    
    // If no template found in database, use a hardcoded fallback
    if (!template) {
      console.log(`Using fallback template for ${templateType}-${relationshipType}`);
      
      // Fallback templates
      if (templateType === 'invitation' && relationshipType === 'self') {
        return {
          subject: 'Complete your Self-Assessment for {campaignName}',
          content: `
            <p>Hello {assessorName},</p>
            <p>As part of the <strong>{campaignName}</strong> feedback campaign, you're invited to complete a self-assessment.</p>
            <p>Self-assessment is a crucial part of the 360-degree feedback process, giving you an opportunity to reflect on your own performance.</p>
            <p>Please complete your self-assessment by {deadline}.</p>
            <p><a href="{feedbackUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Start Self-Assessment</a></p>
            <p>Thank you for your participation!</p>
          `
        };
      } else if (templateType === 'instruction' && relationshipType === 'self') {
        return {
          subject: 'Instructions for Your Self-Assessment',
          content: `
            <p>Hello {assessorName},</p>
            <p>Here are some guidelines for completing your self-assessment as part of the <strong>{campaignName}</strong> feedback campaign:</p>
            <ul>
              <li>Be honest and reflective</li>
              <li>Provide specific examples to support your assessment</li>
              <li>Consider both your strengths and areas for development</li>
              <li>Take your time to provide thoughtful responses</li>
            </ul>
            <p>Your self-assessment provides valuable context and will be considered alongside feedback from others.</p>
            <p>If you haven't completed your assessment yet, please do so by {deadline}:</p>
            <p><a href="{feedbackUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Complete Self-Assessment</a></p>
          `
        };
      } else if (templateType === 'invitation') {
        return {
          subject: 'Invitation to provide feedback for {targetName}',
          content: `
            <p>Hello {assessorName},</p>
            <p>You've been invited to provide feedback for <strong>{targetName}</strong> as part of the <strong>{campaignName}</strong> feedback campaign.</p>
            <p>Your insights are valuable for {targetName}'s professional development.</p>
            <p>Please complete your feedback by {deadline}.</p>
            <p><a href="{feedbackUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Provide Feedback</a></p>
            <p>Thank you for your participation!</p>
          `
        };
      } else if (templateType === 'instruction') {
        return {
          subject: 'Guidelines for Providing Effective Feedback',
          content: `
            <p>Hello {assessorName},</p>
            <p>Here are some guidelines for providing effective feedback for <strong>{targetName}</strong>:</p>
            <ul>
              <li>Be specific and provide examples</li>
              <li>Focus on behaviors, not personality</li>
              <li>Balance positive feedback with areas for development</li>
              <li>Be constructive and actionable</li>
            </ul>
            <p>If you haven't completed your feedback yet, please do so by {deadline}:</p>
            <p><a href="{feedbackUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Provide Feedback</a></p>
          `
        };
      } else if (templateType === 'reminder') {
        return {
          subject: 'Reminder: Complete your feedback for {targetName}',
          content: `
            <p>Hello {assessorName},</p>
            <p>This is a friendly reminder to complete your feedback for <strong>{targetName}</strong> as part of the <strong>{campaignName}</strong> campaign.</p>
            <p>Please complete your feedback by {deadline}.</p>
            <p><a href="{feedbackUrl}">Complete Feedback</a></p>
          `
        };
      } else {
        return {
          subject: '360 Feedback Request: {campaignName}',
          content: `
            <p>Hello {assessorName},</p>
            <p>Please complete your feedback for the <strong>{campaignName}</strong> campaign by {deadline}.</p>
            <p><a href="{feedbackUrl}">Provide Feedback</a></p>
          `
        };
      }
    }
    
    // If we have a template from the database, ensure it has both subject and content
    if (template && template.subject && template.content) {
      console.log('Found valid template from database:', template.id);
      return {
        subject: template.subject,
        content: template.content
      };
    }
    
    // If template is missing required fields, use a basic fallback
    console.log('Template is missing required fields, using emergency fallback');
    return {
      subject: `Feedback Request for ${templateType}`,
      content: `<p>Please provide your feedback by clicking <a href="{feedbackUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">here</a>.</p>`
    };
  } catch (error) {
    console.error('Error fetching email template:', error);
    // Return a very basic fallback
    return {
      subject: '360 Feedback Request',
      content: `<p>Please provide your feedback by clicking <a href="{feedbackUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">here</a>.</p>`
    };
  }
}

// Helper function to replace placeholders in email templates (improved version)
function replaceEmailPlaceholders(template, data) {
  if (!template) {
    console.error('Error: template is undefined in replaceEmailPlaceholders');
    return 'Error: Missing template content';
  }
  
  let content = template;
  const safeData = data || {};
  
  for (const [key, value] of Object.entries(safeData)) {
    if (typeof content === 'string') {
      content = content.replace(new RegExp(`{${key}}`, 'g'), value || '');
    }
  }
  
  return content;
}

// Send reminders to specific participants
exports.sendReminders = async (req, res) => {
  try {
    console.log('\n=== SENDING REMINDERS ===');
    console.log('Request body:', req.body);
    
    const { participantIds } = req.body;
    
    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      console.log('No participant IDs provided');
      return res.status(400).json({ 
        message: 'Participant IDs are required' 
      });
    }
    
    console.log(`Sending reminders to ${participantIds.length} participants`);
    
    // Get the campaign from the first participant
    const firstParticipant = await CampaignParticipant.findByPk(participantIds[0], {
      include: [
        { 
          model: Campaign, 
          as: 'campaign',
          include: [
            { model: Employee, as: 'targetEmployee' }
          ]
        },
        {
          model: Employee,
          as: 'employee'
        }
      ]
    });
    
    if (!firstParticipant) {
      console.log('First participant not found');
      return res.status(404).json({ message: 'Participant not found' });
    }
    
    console.log('Found campaign:', firstParticipant.campaign.id);
    
    // Check if the campaign belongs to the user
    if (firstParticipant.campaign.createdBy !== req.user.id) {
      console.log('User not authorized for this campaign');
      return res.status(403).json({ message: 'Not authorized to send reminders for this campaign' });
    }
    
    // Check if campaign is active
    if (firstParticipant.campaign.status !== 'active') {
      console.log('Campaign is not active:', firstParticipant.campaign.status);
      return res.status(400).json({ message: 'Reminders can only be sent for active campaigns' });
    }
    
    // Get all requested participants
    const participants = await CampaignParticipant.findAll({
      where: { 
        id: participantIds,
        campaignId: firstParticipant.campaignId
      },
      include: [
        { model: Employee, as: 'employee' },
        { 
          model: Campaign, 
          as: 'campaign',
          include: [
            { model: Employee, as: 'targetEmployee' }
          ]
        }
      ]
    });
    
    // Check if all participants belong to the same campaign
    if (participants.some(p => p.campaignId !== firstParticipant.campaignId)) {
      console.log('Participants from different campaigns');
      return res.status(400).json({ message: 'All participants must belong to the same campaign' });
    }
    
    // Send reminder emails
    const campaign = firstParticipant.campaign;
    const sentReminders = [];
    
    console.log('Getting email settings...');
    const emailSettings = await EmailSettings.findOne();
    
    console.log('Found email settings, devMode:', emailSettings ? emailSettings.devMode : 'unknown');
    
    // Temporarily force devMode to false for this operation
    if (emailSettings) {
      console.log('Setting devMode to false FOR THIS OPERATION ONLY');
      emailSettings.devMode = false;
    }
    
    console.log('Starting to process participants for reminders');
    for (const participant of participants) {
      console.log(`\nProcessing participant: ${participant.id}`);
      
      // Skip completed or declined participants
      if (participant.status === 'completed' || participant.status === 'declined') {
        console.log('Participant already completed or declined, skipping');
        continue;
      }
      
      if (!participant.employee || !participant.employee.email) {
        console.log('Participant has no email address, skipping');
        continue;
      }
      
      console.log(`Sending reminder to ${participant.employee.email}`);
      
      // Update participant status to invited and increment reminder count
      await participant.update({
        status: participant.status === 'pending' ? 'invited' : participant.status,
        lastInvitedAt: new Date(),
        reminderCount: (participant.reminderCount || 0) + 1
      });
      
      sentReminders.push({
        participantId: participant.id,
        email: participant.employee.email,
        timestamp: new Date()
      });
      
      try {
        // Create feedback URL with token
        const feedbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/feedback/${participant.invitationToken}`;
        
        // Common email variables
        const emailVars = {
          assessorName: participant.employee.firstName,
          targetName: campaign.targetEmployee.firstName + ' ' + campaign.targetEmployee.lastName,
          campaignName: campaign.name,
          deadline: new Date(campaign.endDate).toLocaleDateString(),
          feedbackUrl,
          companyName: 'Your Company'
        };
        
        // Get reminder template
        let reminderTemplate = await getEmailTemplate(participant.relationshipType, 'reminder');
        
        if (!reminderTemplate) {
          console.log('No reminder template found, using generic template');
          reminderTemplate = {
            subject: `Reminder: Complete feedback for ${campaign.targetEmployee.firstName}`,
            content: `
              <p>Hello ${participant.employee.firstName},</p>
              <p>This is a friendly reminder to complete your feedback for ${campaign.targetEmployee.firstName} ${campaign.targetEmployee.lastName}.</p>
              <p>Please complete your feedback by ${new Date(campaign.endDate).toLocaleDateString()}.</p>
              <p><a href="${feedbackUrl}">Click here to provide feedback</a></p>
            `
          };
        }
        
        console.log('Sending reminder email...');
        
        await emailService.sendEmail({
          to: participant.employee.email,
          subject: replaceEmailPlaceholders(reminderTemplate.subject, emailVars),
          html: replaceEmailPlaceholders(reminderTemplate.content, emailVars),
          devMode: false, // Force production mode for this email
          campaignId: campaign.id,
          participantId: participant.id,
          communicationType: 'reminder'
        });
        
        console.log('Reminder email sent successfully');
      } catch (emailError) {
        console.error('Error sending reminder email:', emailError);
        // Continue with other reminders even if this one fails
      }
    }
    
    // Update campaign's lastReminderSent timestamp
    await campaign.update({
      lastReminderSent: new Date()
    });
    
    console.log('All reminders processed');
    
    res.status(200).json({
      message: `Reminders sent to ${sentReminders.length} participants`,
      sentReminders
    });
  } catch (error) {
    console.error('Error sending reminders:', error);
    res.status(500).json({ 
      message: 'Failed to send reminders', 
      error: error.message 
    });
  }
};
