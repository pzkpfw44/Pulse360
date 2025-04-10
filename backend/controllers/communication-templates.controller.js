// backend/controllers/communication-templates.controller.js

const { CommunicationTemplate } = require('../models');
const fluxAiConfig = require('../config/flux-ai');
const axios = require('axios');

// Get all communication templates
exports.getAllTemplates = async (req, res) => {
  try {
    const templates = await CommunicationTemplate.findAll({
      where: { createdBy: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      count: templates.length,
      templates
    });
  } catch (error) {
    console.error('Error fetching communication templates:', error);
    res.status(500).json({ message: 'Failed to fetch templates', error: error.message });
  }
};

// Get template by ID
exports.getTemplateById = async (req, res) => {
  try {
    const template = await CommunicationTemplate.findOne({
      where: { 
        id: req.params.id,
        createdBy: req.user.id
      }
    });
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    res.status(200).json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ message: 'Failed to fetch template', error: error.message });
  }
};

// Create new template
exports.createTemplate = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      templateType, 
      recipientType, 
      subject,
      content,
      isDefault 
    } = req.body;
    
    if (!name || !templateType || !recipientType || !subject || !content) {
      return res.status(400).json({ 
        message: 'Name, template type, recipient type, subject, and content are required' 
      });
    }
    
    // If setting as default, first remove default status from other templates of same type
    if (isDefault) {
      await CommunicationTemplate.update(
        { isDefault: false },
        { 
          where: { 
            templateType,
            recipientType,
            createdBy: req.user.id,
            isDefault: true
          }
        }
      );
    }
    
    const template = await CommunicationTemplate.create({
      name,
      description,
      templateType,
      recipientType,
      subject,
      content,
      isDefault: isDefault || false,
      isAiGenerated: false,
      createdBy: req.user.id
    });
    
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ message: 'Failed to create template', error: error.message });
  }
};

// Update template
exports.updateTemplate = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      templateType, 
      recipientType, 
      subject,
      content,
      isDefault 
    } = req.body;
    
    const template = await CommunicationTemplate.findOne({
      where: { 
        id: req.params.id,
        createdBy: req.user.id
      }
    });
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // If setting as default, first remove default status from other templates of same type
    if (isDefault) {
      await CommunicationTemplate.update(
        { isDefault: false },
        { 
          where: { 
            templateType,
            recipientType,
            createdBy: req.user.id,
            isDefault: true,
            id: { [sequelize.Op.ne]: template.id }
          }
        }
      );
    }
    
    await template.update({
      name: name || template.name,
      description: description !== undefined ? description : template.description,
      templateType: templateType || template.templateType,
      recipientType: recipientType || template.recipientType,
      subject: subject || template.subject,
      content: content || template.content,
      isDefault: isDefault !== undefined ? isDefault : template.isDefault
    });
    
    res.status(200).json(template);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ message: 'Failed to update template', error: error.message });
  }
};

// Delete template
exports.deleteTemplate = async (req, res) => {
  try {
    const template = await CommunicationTemplate.findOne({
      where: { 
        id: req.params.id,
        createdBy: req.user.id
      }
    });
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    await template.destroy();
    
    res.status(200).json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ message: 'Failed to delete template', error: error.message });
  }
};

// Generate AI templates
exports.generateAiTemplates = async (req, res) => {
  try {
    const { templateType, recipientType, companyVoice } = req.body;
    
    if (!templateType || !recipientType) {
      return res.status(400).json({ 
        message: 'Template type and recipient type are required' 
      });
    }
    
    let templateContent;
    let templateSubject;
    
    // Use development mode placeholder if AI is not configured or in dev mode
    if (!fluxAiConfig.isConfigured() || fluxAiConfig.isDevelopment) {
      const demoTemplate = generateDemoTemplate(templateType, recipientType);
      templateContent = demoTemplate.content;
      templateSubject = demoTemplate.subject;
    } else {
      // Call the AI service to generate template
      const tone = companyVoice?.tone || 'professional';
      const formality = companyVoice?.formality || 'formal';
      
      const aiPrompt = generateAiPrompt(templateType, recipientType, tone, formality);
      
      const response = await axios.post(
        fluxAiConfig.getEndpointUrl('chat'),
        {
          model: fluxAiConfig.model,
          messages: [
            { role: 'system', content: fluxAiConfig.getSystemPrompt('template_generation') },
            { role: 'user', content: aiPrompt }
          ],
          temperature: 0.7,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${fluxAiConfig.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Parse AI response to extract template subject and content
      const aiResponse = response.data.choices[0].message.content;
      
      // Extract subject and content from AI response
      const subjectMatch = aiResponse.match(/SUBJECT:(.*?)(?=CONTENT:|$)/s);
      const contentMatch = aiResponse.match(/CONTENT:(.*?)(?=$)/s);
      
      templateSubject = subjectMatch ? subjectMatch[1].trim() : generateDefaultSubject(templateType, recipientType);
      templateContent = contentMatch ? contentMatch[1].trim() : generateDefaultContent(templateType, recipientType);
    }
    
    // Create the template
    const template = await CommunicationTemplate.create({
      name: `${formatRecipientType(recipientType)} ${formatTemplateType(templateType)} Template`,
      description: `AI-generated ${formatTemplateType(templateType).toLowerCase()} template for ${formatRecipientType(recipientType).toLowerCase()}`,
      templateType,
      recipientType,
      subject: templateSubject,
      content: templateContent,
      isDefault: false,
      isAiGenerated: true,
      createdBy: req.user.id
    });
    
    res.status(201).json(template);
  } catch (error) {
    console.error('Error generating AI template:', error);
    res.status(500).json({ message: 'Failed to generate template', error: error.message });
  }
};

// Get default templates
exports.getDefaultTemplates = async (req, res) => {
  try {
    // Create initial default templates if they don't exist
    await createInitialDefaultTemplates(req.user.id);
    
    // Return all templates for the user
    const templates = await CommunicationTemplate.findAll({
      where: { createdBy: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      count: templates.length,
      templates
    });
  } catch (error) {
    console.error('Error fetching default templates:', error);
    res.status(500).json({ message: 'Failed to fetch default templates', error: error.message });
  }
};

// Helper function to create initial default templates
async function createInitialDefaultTemplates(userId) {
  try {
    // Check if user already has templates
    const existingCount = await CommunicationTemplate.count({
      where: { createdBy: userId }
    });
    
    if (existingCount > 0) {
      return; // User already has templates
    }
    
    // Template types and recipient types
    const templateTypes = ['invitation', 'reminder', 'thank_you', 'instruction'];
    const recipientTypes = ['self', 'manager', 'peer', 'direct_report', 'external'];
    
    const defaultTemplates = [];
    
    // Create default templates for each combination
    for (const templateType of templateTypes) {
      for (const recipientType of recipientTypes) {
        // Skip instruction for self (handled separately)
        if (templateType === 'instruction' && recipientType === 'self') {
          continue;
        }
        
        const demoTemplate = generateDemoTemplate(templateType, recipientType);
        
        defaultTemplates.push({
          name: `Default ${formatRecipientType(recipientType)} ${formatTemplateType(templateType)} Template`,
          description: `Default template for ${templateType} emails to ${recipientType} assessors`,
          templateType,
          recipientType,
          subject: demoTemplate.subject,
          content: demoTemplate.content,
          isDefault: true,
          isAiGenerated: false,
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    // Add self-instruction template
    const selfInstructionTemplate = generateDemoTemplate('instruction', 'self');
    defaultTemplates.push({
      name: `Default Self-Assessment Instructions`,
      description: `Default instructions for self-assessment`,
      templateType: 'instruction',
      recipientType: 'self',
      subject: selfInstructionTemplate.subject,
      content: selfInstructionTemplate.content,
      isDefault: true,
      isAiGenerated: false,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Bulk create templates
    await CommunicationTemplate.bulkCreate(defaultTemplates);
    
    console.log(`Created ${defaultTemplates.length} default templates for user ${userId}`);
  } catch (error) {
    console.error('Error creating default templates:', error);
  }
}

// Helper function to generate demo template
function generateDemoTemplate(templateType, recipientType) {
  let subject = '';
  let content = '';
  
  switch (templateType) {
    case 'invitation':
      subject = recipientType === 'self' 
        ? '360 Feedback: Your Self-Assessment for {campaignName}'
        : 'Invitation to provide feedback for {targetName}';
        
      if (recipientType === 'self') {
        content = `
<p>Hello {assessorName},</p>

<p>As part of the <strong>{campaignName}</strong> feedback campaign, you're invited to complete a self-assessment.</p>

<p>Your self-reflection is an important part of the 360-degree feedback process and provides valuable context for the feedback you'll receive.</p>

<p><strong>Deadline:</strong> Please complete your self-assessment by {deadline}.</p>

<p><a href="{feedbackUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Start Self-Assessment</a></p>

<p>If you have any questions or need assistance, please contact your HR representative.</p>

<p>Thank you for your participation,<br>
The {companyName} Feedback Team</p>
`;
      } else {
        content = `
<p>Hello {assessorName},</p>

<p>You've been invited to provide feedback for <strong>{targetName}</strong> as part of the <strong>{campaignName}</strong> feedback campaign.</p>

<p>Your insights are valuable for {targetName}'s professional development. The feedback process is designed to be constructive and confidential.</p>

<p><strong>Deadline:</strong> Please complete your feedback by {deadline}.</p>

<p><a href="{feedbackUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Provide Feedback</a></p>

<p>If you have any questions or need assistance, please contact your HR representative.</p>

<p>Thank you for your participation,<br>
The {companyName} Feedback Team</p>
`;
      }
      break;
      
    case 'reminder':
      subject = recipientType === 'self' 
        ? 'Reminder: Complete your self-assessment by {deadline}'
        : 'Reminder: Feedback for {targetName} due by {deadline}';
        
      if (recipientType === 'self') {
        content = `
<p>Hello {assessorName},</p>

<p>This is a friendly reminder that your self-assessment for the <strong>{campaignName}</strong> feedback campaign is due by <strong>{deadline}</strong>.</p>

<p>Your self-reflection is an important part of the 360-degree feedback process.</p>

<p><a href="{feedbackUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Complete Self-Assessment</a></p>

<p>Thank you for your participation,<br>
The {companyName} Feedback Team</p>
`;
      } else {
        content = `
<p>Hello {assessorName},</p>

<p>This is a friendly reminder that your feedback for <strong>{targetName}</strong> as part of the <strong>{campaignName}</strong> campaign is due by <strong>{deadline}</strong>.</p>

<p>Your input is valuable and will help support {targetName}'s professional development.</p>

<p><a href="{feedbackUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Complete Feedback</a></p>

<p>Thank you for your participation,<br>
The {companyName} Feedback Team</p>
`;
      }
      break;
      
    case 'thank_you':
      subject = recipientType === 'self' 
        ? 'Thank you for completing your self-assessment'
        : 'Thank you for providing feedback for {targetName}';
        
      if (recipientType === 'self') {
        content = `
<p>Hello {assessorName},</p>

<p>Thank you for completing your self-assessment for the <strong>{campaignName}</strong> feedback campaign.</p>

<p>Your self-reflection provides valuable context for the feedback you'll receive. Once all feedback has been collected, you'll be notified about the next steps.</p>

<p>We appreciate your participation in this important process.</p>

<p>Best regards,<br>
The {companyName} Feedback Team</p>
`;
      } else {
        content = `
<p>Hello {assessorName},</p>

<p>Thank you for completing your feedback for <strong>{targetName}</strong> as part of the <strong>{campaignName}</strong> campaign.</p>

<p>Your insights will help support {targetName}'s professional development. We appreciate your time and thoughtful contribution.</p>

<p>Best regards,<br>
The {companyName} Feedback Team</p>
`;
      }
      break;
      
    case 'instruction':
      subject = recipientType === 'self' 
        ? 'Guidelines for Your Self-Assessment'
        : 'Guidelines for Providing Effective Feedback';
        
      if (recipientType === 'self') {
        content = `
<h2>Guidelines for Your Self-Assessment</h2>

<p>Thank you for participating in this 360-degree feedback process. Your self-assessment is a critical component that provides context for the feedback you'll receive from others.</p>

<h3>Tips for an Effective Self-Assessment:</h3>

<ul>
  <li><strong>Be honest and reflective</strong> - This is an opportunity for genuine self-reflection.</li>
  <li><strong>Provide specific examples</strong> - Concrete examples make your self-assessment more meaningful.</li>
  <li><strong>Consider both strengths and areas for development</strong> - A balanced view helps in meaningful development.</li>
  <li><strong>Take your time</strong> - Thoughtful responses result in more valuable insights.</li>
</ul>

<p>Remember that the goal is growth and development. The more thoughtful your self-reflection, the more valuable the overall feedback process will be.</p>
`;
      } else {
        content = `
<h2>Guidelines for Providing Effective Feedback</h2>

<p>Thank you for participating in this 360-degree feedback process. Your input is valuable for the recipient's professional development.</p>

<h3>Tips for Providing Constructive Feedback:</h3>

<ul>
  <li><strong>Be specific</strong> - Include concrete examples that illustrate your points.</li>
  <li><strong>Focus on behaviors, not personality</strong> - Describe actions and their impact rather than making character judgments.</li>
  <li><strong>Balance positive feedback with areas for development</strong> - Identify both strengths and opportunities for growth.</li>
  <li><strong>Be constructive</strong> - Frame feedback in terms of how the person could be even more effective, not just what they're doing wrong.</li>
  <li><strong>Consider the full review period</strong> - Don't focus only on recent events.</li>
</ul>

<p>Your feedback will be kept confidential and will be combined with input from others to identify themes and patterns, rather than attributing specific comments to individuals.</p>
`;
      }
      break;
      
    default:
      content = `Default template content for ${templateType} - ${recipientType}`;
      subject = `Default subject for ${templateType} - ${recipientType}`;
  }
  
  return { subject, content };
}

// Helper function to generate AI prompt
function generateAiPrompt(templateType, recipientType, tone, formality) {
  const templateTypeDesc = formatTemplateType(templateType);
  const recipientTypeDesc = formatRecipientType(recipientType);
  
  let prompt = `Generate a professional email template for a 360-degree feedback system. This is a ${templateTypeDesc.toLowerCase()} email that will be sent to ${recipientTypeDesc.toLowerCase()} participants in the feedback process.`;
  
  // Add specific details based on template type
  switch (templateType) {
    case 'invitation':
      prompt += ` This email invites the recipient to provide feedback${recipientType === 'self' ? ' about themselves (self-assessment)' : ' about a colleague'}.`;
      break;
    case 'reminder':
      prompt += ` This email reminds the recipient to complete their feedback${recipientType === 'self' ? ' (self-assessment)' : ''} before the deadline.`;
      break;
    case 'thank_you':
      prompt += ` This email thanks the recipient for completing their feedback${recipientType === 'self' ? ' (self-assessment)' : ''}.`;
      break;
    case 'instruction':
      prompt += ` This provides guidelines on how to provide effective feedback${recipientType === 'self' ? ' in a self-assessment' : ''}.`;
      break;
  }
  
  // Add tone and formality guidance
  prompt += `\n\nThe tone should be ${tone} and the formality level should be ${formality}.`;
  
  // Add placeholders information
  prompt += `\n\nInclude the following placeholders that will be replaced with actual values:
- {assessorName} - Name of the person providing feedback
- {targetName} - Name of the person receiving feedback (only if not self-assessment)
- {campaignName} - Name of the feedback campaign
- {deadline} - Due date for feedback submission
- {feedbackUrl} - URL to access the feedback form
- {companyName} - Name of the company

The email should have HTML formatting and include a button-style link to the feedback form.`;
  
  // Add output format instructions
  prompt += `\n\nProvide your response in this format:
SUBJECT: [Write email subject line here]
CONTENT: [Write the full HTML email content here]`;
  
  return prompt;
}

// Helper function to format template type for display
function formatTemplateType(type) {
  const types = {
    'invitation': 'Invitation',
    'reminder': 'Reminder',
    'thank_you': 'Thank You',
    'instruction': 'Instruction'
  };
  return types[type] || type;
}

// Helper function to format recipient type for display
function formatRecipientType(type) {
  const types = {
    'self': 'Self',
    'manager': 'Manager',
    'peer': 'Peer',
    'direct_report': 'Direct Report',
    'external': 'External',
    'all': 'All Recipients'
  };
  return types[type] || type;
}

// Helper function to generate default subject
function generateDefaultSubject(templateType, recipientType) {
  return generateDemoTemplate(templateType, recipientType).subject;
}

// Helper function to generate default content
function generateDefaultContent(templateType, recipientType) {
  return generateDemoTemplate(templateType, recipientType).content;
}