// backend/controllers/communication-templates.controller.js

// START: Full replacement code with PLACEHOLDER STRATEGY for AI Button
const { CommunicationTemplate, BrandingSettings } = require('../models');
const fluxAiConfig = require('../config/flux-ai');
const axios = require('axios');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

// --- Default Branding Colors ---
const DEFAULT_PRIMARY_COLOR = '#3B82F6';
const DEFAULT_SECONDARY_COLOR = '#2563EB';

// --- Helper function to get user's branding settings or defaults ---
async function getUserBrandingOrDefault(userId) {
  // Keep the previous version with logging for now
  console.log(`[TEMPLATE DEBUG] getUserBrandingOrDefault called for userId: ${userId}`);
  try {
      let settings = await BrandingSettings.findOne({ where: { userId } });
      if (settings) {
          console.log(`[TEMPLATE DEBUG] Found branding settings for user ${userId}:`, { primaryColor: settings.primaryColor, tone: settings.tone });
          return {
              tone: settings.tone || 'professional',
              formality: settings.formality || 'formal',
              personality: settings.personality || 'helpful',
              primaryColor: settings.primaryColor || DEFAULT_PRIMARY_COLOR,
              secondaryColor: settings.secondaryColor || DEFAULT_SECONDARY_COLOR
          };
      } else {
          console.log(`[TEMPLATE DEBUG] No branding settings found for user ${userId}. Using defaults.`);
          return {
              tone: 'professional',
              formality: 'formal',
              personality: 'helpful',
              primaryColor: DEFAULT_PRIMARY_COLOR,
              secondaryColor: DEFAULT_SECONDARY_COLOR
          };
      }
  } catch (error) {
      console.error(`[TEMPLATE DEBUG] Error fetching branding settings for user ${userId}:`, error);
      console.log(`[TEMPLATE DEBUG] Falling back to default branding settings due to error.`);
      return {
          tone: 'professional',
          formality: 'formal',
          personality: 'helpful',
          primaryColor: DEFAULT_PRIMARY_COLOR,
          secondaryColor: DEFAULT_SECONDARY_COLOR
      };
  }
}


// --- Controller methods (getAllTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate) ---
// Keep these methods exactly the same as the previous version (with logging)

// Get all communication templates
exports.getAllTemplates = async (req, res) => {
  try {
    const templates = await CommunicationTemplate.findAll({
      where: { createdBy: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ count: templates.length, templates });
  } catch (error) { console.error('Error fetching templates:', error); res.status(500).json({ message: 'Failed to fetch templates', error: error.message }); }
};
// Get template by ID
exports.getTemplateById = async (req, res) => {
  try {
    const template = await CommunicationTemplate.findOne({ where: { id: req.params.id, createdBy: req.user.id } });
    if (!template) { return res.status(404).json({ message: 'Template not found' }); }
    res.status(200).json(template);
  } catch (error) { console.error('Error fetching template:', error); res.status(500).json({ message: 'Failed to fetch template', error: error.message }); }
};
// Create new template
exports.createTemplate = async (req, res) => {
  try {
    const { name, description, templateType, recipientType, subject, content, isDefault } = req.body;
    if (!name || !templateType || !recipientType || !subject || !content) { return res.status(400).json({ message: 'Name, template type, recipient type, subject, and content are required' }); }
    if (isDefault) { await CommunicationTemplate.update({ isDefault: false }, { where: { templateType, recipientType, createdBy: req.user.id, isDefault: true } }); }
    const template = await CommunicationTemplate.create({ name, description, templateType, recipientType, subject, content, isDefault: isDefault || false, isAiGenerated: false, createdBy: req.user.id });
    res.status(201).json(template);
  } catch (error) { console.error('Error creating template:', error); res.status(500).json({ message: 'Failed to create template', error: error.message }); }
};
// Update template
exports.updateTemplate = async (req, res) => {
  try {
    const { name, description, templateType, recipientType, subject, content, isDefault } = req.body;
    const template = await CommunicationTemplate.findOne({ where: { id: req.params.id, createdBy: req.user.id } });
    if (!template) { return res.status(404).json({ message: 'Template not found' }); }
    if (isDefault === true && template.isDefault === false) { await CommunicationTemplate.update({ isDefault: false }, { where: { templateType: templateType || template.templateType, recipientType: recipientType || template.recipientType, createdBy: req.user.id, isDefault: true, id: { [Op.ne]: template.id } } }); }
    await template.update({ name: name !== undefined ? name : template.name, description: description !== undefined ? description : template.description, templateType: templateType !== undefined ? templateType : template.templateType, recipientType: recipientType !== undefined ? recipientType : template.recipientType, subject: subject !== undefined ? subject : template.subject, content: content !== undefined ? content : template.content, isDefault: isDefault !== undefined ? isDefault : template.isDefault });
    res.status(200).json(template);
  } catch (error) { console.error('Error updating template:', error); res.status(500).json({ message: 'Failed to update template', error: error.message }); }
};
// Delete template
exports.deleteTemplate = async (req, res) => {
  try {
    const template = await CommunicationTemplate.findOne({ where: { id: req.params.id, createdBy: req.user.id } });
    if (!template) { return res.status(404).json({ message: 'Template not found' }); }
    await template.destroy();
    res.status(200).json({ message: 'Template deleted successfully' });
  } catch (error) { console.error('Error deleting template:', error); res.status(500).json({ message: 'Failed to delete template', error: error.message }); }
};

// --- Generate AI templates (MODIFIED FOR PLACEHOLDER) ---
exports.generateAiTemplates = async (req, res) => {
  try {
    const { templateType, recipientType, companyVoice, templateId, forceAI } = req.body;

    if (!templateType || !recipientType) {
      return res.status(400).json({ message: 'Template type and recipient type are required' });
    }

    // Get branding settings (will include primaryColor)
    let brandingSettings = companyVoice
      ? { ...companyVoice, primaryColor: companyVoice.primaryColor || DEFAULT_PRIMARY_COLOR }
      : await getUserBrandingOrDefault(req.user.id);

    console.log(`[TEMPLATE DEBUG] generateAiTemplates using branding:`, brandingSettings); // Log branding used

    let templateSubject = '';
    let templateContent = '';
    let generatedByAI = false;
    let finalContent = ''; // To store the content after placeholder replacement

    const useAI = fluxAiConfig.isConfigured();

    if (useAI) {
      const { tone, formality, personality, primaryColor } = brandingSettings; // Destructure for easier use

      // Generate the prompt WITH PLACEHOLDER instruction
      const aiPrompt = generateAiPromptWithPlaceholder(templateType, recipientType, tone, formality, personality); // Use new prompt function
      console.log('[TEMPLATE DEBUG] Sending PLACEHOLDER prompt to AI (sample):', aiPrompt ? aiPrompt.substring(0, 300) + '...' : 'Empty Prompt');

      try {
        const requestData = { /* ... same request data structure ... */ messages: [{ role: "user", content: aiPrompt }], preamble: fluxAiConfig.getSystemPrompt('template_generation') };
        const response = await axios.post(/* ... same AI call details ... */ fluxAiConfig.getEndpointUrl('chat'), requestData, { headers: { 'Authorization': `Bearer ${fluxAiConfig.apiKey}`, 'Content-Type': 'application/json' } });
        console.log('[TEMPLATE DEBUG] Flux AI response status:', response.status);

        // --- Parse AI response (same as before) ---
        let aiResponse = null;
        const choice = response.data.choices[0];
        if (!response.data || !response.data.choices || response.data.choices.length === 0) { throw new Error('Invalid response structure from Flux AI'); }
        if (typeof choice.message === 'object' && choice.message.content) { aiResponse = choice.message.content; }
        else if (typeof choice.message === 'string') { aiResponse = choice.message; }
        else if (choice.content) { aiResponse = choice.content; }
        else { throw new Error('Could not extract content from AI response choice');}
        if (!aiResponse) { throw new Error('Empty response from Flux AI'); }

        console.log('[TEMPLATE DEBUG] AI Response (raw) sample:', aiResponse.substring(0, 200) + '...');

        const subjectMatch = aiResponse.match(/SUBJECT:(.*?)(?=CONTENT:|$)/is);
        const contentMatch = aiResponse.match(/CONTENT:(.*)/is);

        if (subjectMatch && contentMatch) {
          templateSubject = subjectMatch[1].trim();
          templateContent = contentMatch[1].trim(); // This content has the placeholder
          generatedByAI = true;
          console.log('[TEMPLATE DEBUG] Successfully parsed Subject and raw Content from AI.');

          // --- START: Replace Placeholder with Styled Button ---
          const buttonPlaceholder = '';
          if (templateContent.includes(buttonPlaceholder)) {
            // Define styles using the CORRECT primaryColor from brandingSettings
            const buttonStyle = `display: inline-block; background-color: ${primaryColor}; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; text-align: center; margin-top: 10px;`;
            const buttonParagraphStyle = `margin-bottom: 20px;`;

            // Determine button text based on template type
            let buttonText = 'Provide Feedback';
            if (templateType === 'invitation') buttonText = (recipientType === 'self') ? 'Start Self-Assessment' : 'Provide Feedback';
            if (templateType === 'reminder') buttonText = (recipientType === 'self') ? 'Complete Self-Assessment' : 'Complete Feedback';
            // Add other types if needed

            // Construct the final button HTML
            const buttonHtml = `<p style="${buttonParagraphStyle}"><a href="{feedbackUrl}" style="${buttonStyle}">${buttonText}</a></p>`;
            console.log(`[TEMPLATE DEBUG] Replacing placeholder with button HTML using color ${primaryColor}`);

            // Replace the placeholder in the AI-generated content
            finalContent = templateContent.replace(buttonPlaceholder, buttonHtml);

          } else {
            console.warn('[TEMPLATE DEBUG] AI content did not contain the button placeholder "". Button may be missing or incorrectly placed.');
            finalContent = templateContent; // Use content as-is if placeholder missing
          }
          // --- END: Replace Placeholder ---

        } else {
          console.error('[TEMPLATE DEBUG] AI response format incorrect (SUBJECT/CONTENT tags). Falling back.');
          // Fallback will happen below
        }
      } catch (aiError) {
        console.error('[TEMPLATE DEBUG] Error calling AI service:', aiError.response ? JSON.stringify(aiError.response.data) : aiError.message);
        // Fallback will happen below
      }
    }

    // Fallback to demo template if AI not used OR AI failed/gave bad format
    if (!generatedByAI) {
      console.log('[TEMPLATE DEBUG] Using fallback demo template generation.');
      const fallbackTemplate = generateDemoTemplate(templateType, recipientType, brandingSettings); // Pass full branding
      templateSubject = fallbackTemplate.subject;
      finalContent = fallbackTemplate.content; // Use the correctly generated demo content
      generatedByAI = false;
    }

    // Update or create template using finalContent (either from AI+placeholder or demo fallback)
    if (templateId) {
      const existingTemplate = await CommunicationTemplate.findOne({ where: { id: templateId, createdBy: req.user.id } });
      if (!existingTemplate) { return res.status(404).json({ message: 'Template not found' }); }
      await existingTemplate.update({ subject: templateSubject, content: finalContent, isAiGenerated: generatedByAI }); // SAVE finalContent
      res.status(200).json(existingTemplate);
    } else {
      const template = await CommunicationTemplate.create({
        name: `${formatRecipientType(recipientType)} ${formatTemplateType(templateType)} Template (${generatedByAI ? 'AI' : 'Default'})`,
        description: `${generatedByAI ? 'AI-generated' : 'Default'} ${formatTemplateType(templateType).toLowerCase()} template for ${formatRecipientType(recipientType).toLowerCase()}`,
        templateType, recipientType, subject: templateSubject, content: finalContent, // SAVE finalContent
        isDefault: false, isAiGenerated: generatedByAI, createdBy: req.user.id
      });
      res.status(201).json(template);
    }
  } catch (error) {
    console.error('Error in generateAiTemplates function:', error);
    res.status(500).json({ message: 'Failed to generate or update template', error: error.message });
  }
};


// Get default templates (ensures initial creation)
// Keep this function exactly the same as the previous version (with logging)
exports.getDefaultTemplates = async (req, res) => {
  try {
    await createInitialDefaultTemplates(req.user.id); // Ensures defaults exist
    const templates = await CommunicationTemplate.findAll({ where: { createdBy: req.user.id }, order: [['createdAt', 'DESC']] });
    res.status(200).json({ count: templates.length, templates });
  } catch (error) { console.error('Error fetching default templates:', error); res.status(500).json({ message: 'Failed to fetch default templates', error: error.message }); }
};

// Helper function to create initial default templates
// Keep this function exactly the same as the previous version (with logging)
async function createInitialDefaultTemplates(userId) {
  console.log(`[TEMPLATE DEBUG] createInitialDefaultTemplates called for userId: ${userId}`);
  try {
    const existingDefault = await CommunicationTemplate.findOne({ where: { createdBy: userId, templateType: 'invitation', recipientType: 'self', isDefault: true } });
    if (existingDefault) { console.log(`[TEMPLATE DEBUG] User ${userId} already has default templates. Skipping creation.`); return; }
    console.log(`[TEMPLATE DEBUG] No default templates found for user ${userId}. Creating initial defaults...`);
    const userBranding = await getUserBrandingOrDefault(userId);
    console.log(`[TEMPLATE DEBUG] Branding settings fetched for default creation:`, userBranding);
    const templateTypes = ['invitation', 'reminder', 'thank_you', 'instruction'];
    const recipientTypes = ['self', 'manager', 'peer', 'direct_report', 'external'];
    const defaultTemplates = [];
    for (const templateType of templateTypes) {
      for (const recipientType of recipientTypes) {
        if (templateType === 'instruction' && recipientType === 'self') continue;
        console.log(`[TEMPLATE DEBUG] Generating default template for: ${templateType} - ${recipientType}`);
        const demoTemplate = generateDemoTemplate(templateType, recipientType, userBranding);
        defaultTemplates.push({ name: `Default ${formatRecipientType(recipientType)} ${formatTemplateType(templateType)}`, description: `Default template for ${templateType} emails to ${recipientType} assessors`, templateType, recipientType, subject: demoTemplate.subject, content: demoTemplate.content, isDefault: true, isAiGenerated: false, createdBy: userId, createdAt: new Date(), updatedAt: new Date() });
      }
    }
    console.log(`[TEMPLATE DEBUG] Generating default template for: instruction - self`);
    const selfInstructionTemplate = generateDemoTemplate('instruction', 'self', userBranding);
    defaultTemplates.push({ name: `Default Self-Assessment Instructions`, description: `Default instructions for self-assessment`, templateType: 'instruction', recipientType: 'self', subject: selfInstructionTemplate.subject, content: selfInstructionTemplate.content, isDefault: true, isAiGenerated: false, createdBy: userId, createdAt: new Date(), updatedAt: new Date() });
    await CommunicationTemplate.bulkCreate(defaultTemplates);
    console.log(`[TEMPLATE DEBUG] Created ${defaultTemplates.length} default templates for user ${userId}`);
  } catch (error) { console.error(`[TEMPLATE DEBUG] Error creating default templates for user ${userId}:`, error); }
}


// Helper function to generate demo template
// Keep this function exactly the same as the previous version (with logging)
function generateDemoTemplate(templateType, recipientType, branding = {}) {
  console.log(`[TEMPLATE DEBUG] generateDemoTemplate called for type: ${templateType}, recipient: ${recipientType}`);
  let subject = ''; let content = '';
  const { tone = 'professional', formality = 'formal', personality = 'helpful', primaryColor = DEFAULT_PRIMARY_COLOR } = branding;
  console.log(`[TEMPLATE DEBUG] Using primaryColor: ${primaryColor}`);
  const buttonStyle = `display: inline-block; background-color: ${primaryColor}; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; text-align: center; margin-top: 10px;`;
  const buttonParagraphStyle = `margin-bottom: 20px;`;
  switch (templateType) {
    case 'invitation':
      subject = recipientType === 'self' ? '360 Feedback: Your Self-Assessment for {campaignName}' : 'Invitation to provide feedback for {targetName}';
      if (recipientType === 'self') { content = `<p>Hello {assessorName},</p><p>As part of the <strong>{campaignName}</strong> feedback campaign, you're invited to complete a self-assessment.</p><p>Your self-reflection is an important part of the 360-degree feedback process and provides valuable context for the feedback you'll receive.</p><p><strong>Deadline:</strong> Please complete your self-assessment by {deadline}.</p><p style="${buttonParagraphStyle}"><a href="{feedbackUrl}" style="${buttonStyle}">Start Self-Assessment</a></p><p>If you have any questions or need assistance, please contact your HR representative.</p><p>Thank you for your participation,<br>The {companyName} Feedback Team</p>`; }
      else { content = `<p>Hello {assessorName},</p><p>You've been invited to provide feedback for <strong>{targetName}</strong> as part of the <strong>{campaignName}</strong> feedback campaign.</p><p>Your insights are valuable for {targetName}'s professional development. The feedback process is designed to be constructive and confidential.</p><p><strong>Deadline:</strong> Please complete your feedback by {deadline}.</p><p style="${buttonParagraphStyle}"><a href="{feedbackUrl}" style="${buttonStyle}">Provide Feedback</a></p><p>If you have any questions or need assistance, please contact your HR representative.</p><p>Thank you for your participation,<br>The {companyName} Feedback Team</p>`; }
      break;
    case 'reminder':
      subject = recipientType === 'self' ? 'Reminder: Complete your self-assessment by {deadline}' : 'Reminder: Feedback for {targetName} due by {deadline}';
      if (recipientType === 'self') { content = `<p>Hello {assessorName},</p><p>This is a friendly reminder that your self-assessment for the <strong>{campaignName}</strong> feedback campaign is due by <strong>{deadline}</strong>.</p><p>Your self-reflection is an important part of the 360-degree feedback process.</p><p style="${buttonParagraphStyle}"><a href="{feedbackUrl}" style="${buttonStyle}">Complete Self-Assessment</a></p><p>Thank you for your participation,<br>The {companyName} Feedback Team</p>`; }
      else { content = `<p>Hello {assessorName},</p><p>This is a friendly reminder that your feedback for <strong>{targetName}</strong> as part of the <strong>{campaignName}</strong> campaign is due by <strong>{deadline}</strong>.</p><p>Your input is valuable and will help support {targetName}'s professional development.</p><p style="${buttonParagraphStyle}"><a href="{feedbackUrl}" style="${buttonStyle}">Complete Feedback</a></p><p>Thank you for your participation,<br>The {companyName} Feedback Team</p>`; }
      break;
    case 'thank_you':
      subject = recipientType === 'self' ? 'Thank you for completing your self-assessment' : 'Thank you for providing feedback for {targetName}';
      if (recipientType === 'self') { content = `<p>Hello {assessorName},</p><p>Thank you for completing your self-assessment for the <strong>{campaignName}</strong> feedback campaign.</p><p>Your self-reflection provides valuable context for the feedback you'll receive. Once all feedback has been collected, you'll be notified about the next steps.</p><p>We appreciate your participation in this important process.</p><p>Best regards,<br>The {companyName} Feedback Team</p>`; }
      else { content = `<p>Hello {assessorName},</p><p>Thank you for completing your feedback for <strong>{targetName}</strong> as part of the <strong>{campaignName}</strong> campaign.</p><p>Your insights will help support {targetName}'s professional development. We appreciate your time and thoughtful contribution.</p><p>Best regards,<br>The {companyName} Feedback Team</p>`; }
      break;
    case 'instruction':
       subject = recipientType === 'self' ? 'Guidelines for Your Self-Assessment' : 'Guidelines for Providing Effective Feedback';
       if (recipientType === 'self') { content = `<h2>Guidelines for Your Self-Assessment</h2><p>Thank you for participating in this 360-degree feedback process. Your self-assessment is a critical component that provides context for the feedback you'll receive from others.</p><h3>Tips for an Effective Self-Assessment:</h3><ul><li><strong>Be honest and reflective:</strong> This is an opportunity for genuine self-reflection.</li><li><strong>Provide specific examples:</strong> Concrete examples make your self-assessment more meaningful.</li><li><strong>Consider both strengths and areas for development:</strong> A balanced view helps in meaningful development.</li><li><strong>Take your time:</strong> Thoughtful responses result in more valuable insights.</li></ul><p>Remember that the goal is growth and development. The more thoughtful your self-reflection, the more valuable the overall feedback process will be.</p>`; }
       else { content = `<h2>Guidelines for Providing Effective Feedback</h2><p>Thank you for participating in this 360-degree feedback process. Your input is valuable for the recipient's professional development.</p><h3>Tips for Providing Constructive Feedback:</h3><ul><li><strong>Be specific:</strong> Include concrete examples that illustrate your points.</li><li><strong>Focus on behaviors, not personality:</strong> Describe actions and their impact rather than making character judgments.</li><li><strong>Balance positive feedback with areas for development:</strong> Identify both strengths and opportunities for growth.</li><li><strong>Be constructive:</strong> Frame feedback in terms of how the person could be even more effective.</li><li><strong>Consider the full review period:</strong> Don't focus only on recent events.</li></ul><p>Your feedback will be kept confidential and will be combined with input from others to identify themes and patterns.</p>`; }
       break;
    default: subject = `Default subject for ${templateType} - ${recipientType}`; content = `<p>Default template content for ${templateType} - ${recipientType}</p>`;
  }
  // Apply tone, formality, personality adjustments (same as before)
  if (tone === 'friendly') { content = content.replace('Hello {assessorName},', 'Hi {assessorName},').replace('Thank you for your participation', 'Thanks for taking part'); }
  else if (tone === 'casual') { content = content.replace('Hello {assessorName},', 'Hey {assessorName},').replace('Thank you for your participation', 'Thanks for jumping in'); }
  if (formality === 'informal') { content = content.replace('If you have any questions or need assistance, please contact your HR representative.', 'Let us know if you need any help!'); }
  let closingRemark = '';
  if (personality === 'helpful') { closingRemark = `<p>We're here to support you if you have any questions during this process.</p>`; }
  else if (personality === 'empathetic') { closingRemark = `<p>We understand providing feedback takes time, and we appreciate your effort.</p>`; }
  if (closingRemark && !content.includes('support you if you have any questions') && !content.includes('appreciate your effort')) { const closingPatterns = /(<p>(Best regards|Thank you for your participation),?<br>)/i; if (content.match(closingPatterns)) { content = content.replace(closingPatterns, closingRemark + '$1'); } else { content += closingRemark; } }
  console.log(`[TEMPLATE DEBUG] Generated demo content sample for ${templateType} - ${recipientType}: \n---\n${content.substring(0, 400)}...\n---`);
  return { subject, content };
}


// --- NEW Helper function to generate AI prompt WITH PLACEHOLDER ---
function generateAiPromptWithPlaceholder(templateType, recipientType, tone, formality, personality = 'helpful') {
  const templateTypeDesc = formatTemplateType(templateType);
  const recipientTypeDesc = formatRecipientType(recipientType);

  let prompt = `Generate a professional HTML email template for a 360-degree feedback system. This is a ${templateTypeDesc.toLowerCase()} email for ${recipientTypeDesc.toLowerCase()} participants.`;

  // Add specific details based on template type
  switch (templateType) {
      case 'invitation': prompt += ` Invite the recipient to provide feedback${recipientType === 'self' ? ' (self-assessment)' : ' about a colleague'}. Include a call to action button/link.`; break;
      case 'reminder': prompt += ` Remind the recipient to complete their feedback${recipientType === 'self' ? ' (self-assessment)' : ''} before the deadline. Include a call to action button/link.`; break;
      case 'thank_you': prompt += ` Thank the recipient for completing their feedback${recipientType === 'self' ? ' (self-assessment)' : ''}. Do not include a button.`; break; // No button for thank you
      case 'instruction': prompt += ` Provide guidelines on how to provide effective feedback${recipientType === 'self' ? ' in a self-assessment' : ''}. Do not include a button.`; break; // No button for instructions
  }

  prompt += `\n\nThe email should have the following characteristics:
- Tone: ${tone} (${describeTone(tone)})
- Formality: ${formality} (${describeFormality(formality)})
- Personality: ${personality} (${describePersonality(personality)})`;

  prompt += `\n\nInclude these placeholders: {assessorName}, {targetName} (if not self), {campaignName}, {deadline}, {feedbackUrl}, {companyName}.`;

  // --- CRITICAL: Instruction for placeholder ---
  prompt += `\n\nIMPORTANT: If the email requires a call-to-action button/link (like Invitation or Reminder), insert the EXACT text "" on its own line where the button should appear. Do NOT generate the button HTML yourself.`;

  prompt += `\n\nUse standard HTML tags like <p>, <strong>, <ul>, <li> where appropriate for readability. Do NOT include <!DOCTYPE>, <html>, <head>, or <body> tags.`;

  prompt += `\n\nProvide the response STRICTLY in this format:
SUBJECT: [Subject Line Here]
CONTENT: [Full HTML Email Body Here, including the placeholder if required]`;

  return prompt;
}


// Helper functions to describe tone, formality, and personality
// Keep these functions exactly the same as the previous version
function describeTone(tone) {
  const descriptions = { 'professional': 'Businesslike...', 'friendly': 'Warm...', /* ... rest */ };
  return descriptions[tone] || 'professional';
}
function describeFormality(formality) {
  const descriptions = { 'formal': 'Using proper language...', 'semiformal': 'Balanced...', /* ... rest */ };
  return descriptions[formality] || 'formal';
}
function describePersonality(personality) {
  const descriptions = { 'helpful': 'Showing willingness...', 'innovative': 'Forward-thinking...', /* ... rest */ };
  return descriptions[personality] || 'helpful';
}
// Helper function to format template type for display
function formatTemplateType(type) {
    const types = { 'invitation': 'Invitation', 'reminder': 'Reminder', 'thank_you': 'Thank You', 'instruction': 'Instruction' };
    return types[type] || type;
}
// Helper function to format recipient type for display
function formatRecipientType(type) {
    const types = { 'self': 'Self', 'manager': 'Manager', 'peer': 'Peer', 'direct_report': 'Direct Report', 'external': 'External', 'all': 'All Recipients' };
    return types[type] || type;
}