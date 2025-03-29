// controllers/templates.controller.js

const { Template, Question, SourceDocument } = require('../models');

// Get all templates
exports.getAllTemplates = async (req, res) => {
  try {
    // Log the user for debugging
    console.log('User requesting templates:', req.user.id);
    
    const templates = await Template.findAll({
      where: { createdBy: req.user.id },
      include: [{ 
        model: Question, 
        as: 'questions',
        order: [['order', 'ASC']]
      }],
      order: [['createdAt', 'DESC']]
    });
    
    // Log the templates for debugging
    console.log('Found templates:', templates.length);
    
    res.status(200).json({
      count: templates.length,
      templates
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: 'Failed to fetch templates', error: error.message });
  }
};

// Get template by ID
exports.getTemplateById = async (req, res) => {
  try {
    console.log('Getting template by ID:', req.params.id);
    
    const template = await Template.findOne({
      where: { 
        id: req.params.id
      },
      include: [
        { 
          model: Question, 
          as: 'questions',
          order: [['order', 'ASC']]
        },
        {
          model: SourceDocument,
          as: 'sourceDocuments'
        }
      ]
    });
    
    if (!template) {
      console.log('Template not found for ID:', req.params.id);
      return res.status(404).json({ message: 'Template not found' });
    }

    console.log('Template found, questions count:', template.questions.length);
    
    res.status(200).json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ message: 'Failed to fetch template', error: error.message });
  }
};

// Create new template
exports.createTemplate = async (req, res) => {
  try {
    const { name, description, documentType, questions, sourceDocuments } = req.body;
    
    if (!name || !documentType) {
      return res.status(400).json({ message: 'Name and document type are required' });
    }
    
    // Create the template
    const template = await Template.create({
      name,
      description,
      documentType,
      generatedBy: 'manual',
      createdBy: req.user.id
    });
    
    // Add questions if provided
    if (questions && Array.isArray(questions)) {
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        await Question.create({
          text: question.text,
          type: question.type || 'rating',
          category: question.category,
          perspective: question.perspective || 'peer',
          required: question.required !== undefined ? question.required : true,
          order: question.order || (i + 1),
          templateId: template.id
        });
      }
    }
    
    // Add source documents if provided
    if (sourceDocuments && Array.isArray(sourceDocuments)) {
      for (const source of sourceDocuments) {
        await SourceDocument.create({
          fluxAiFileId: source.fluxAiFileId,
          documentId: source.documentId,
          templateId: template.id
        });
      }
    }
    
    // Return the created template with its questions
    const createdTemplate = await Template.findOne({
      where: { id: template.id },
      include: [{ 
        model: Question, 
        as: 'questions',
        order: [['order', 'ASC']]
      }]
    });
    
    res.status(201).json(createdTemplate);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ message: 'Failed to create template', error: error.message });
  }
};

// Update template
exports.updateTemplate = async (req, res) => {
  try {
    const { name, description, questions, status } = req.body;
    
    // Find the template
    const template = await Template.findOne({
      where: { 
        id: req.params.id,
        createdBy: req.user.id
      },
      include: [{ 
        model: Question, 
        as: 'questions'
      }]
    });
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // Update template fields
    await template.update({
      name: name || template.name,
      description: description || template.description,
      status: status || template.status
    });
    
    // Update questions if provided
    if (questions && Array.isArray(questions)) {
      // Get existing questions
      const existingQuestions = template.questions || [];
      const existingQuestionIds = existingQuestions.map(q => q.id);
      
      // Find questions to add, update, or remove
      const questionsToUpdate = questions.filter(q => q.id && existingQuestionIds.includes(q.id));
      const questionsToAdd = questions.filter(q => !q.id || !existingQuestionIds.includes(q.id));
      const questionIdsToKeep = questions.filter(q => q.id).map(q => q.id);
      const questionIdsToRemove = existingQuestionIds.filter(id => !questionIdsToKeep.includes(id));
      
      // Update existing questions
      for (const question of questionsToUpdate) {
        await Question.update({
          text: question.text,
          type: question.type,
          category: question.category,
          perspective: question.perspective || 'peer',
          required: question.required,
          order: question.order
        }, {
          where: { id: question.id, templateId: template.id }
        });
      }
      
      // Add new questions
      for (let i = 0; i < questionsToAdd.length; i++) {
        const question = questionsToAdd[i];
        // If it has a temporary ID (like from frontend), remove it
        const { _id, id, ...questionData } = question;
        await Question.create({
          ...questionData,
          perspective: questionData.perspective || 'peer',
          templateId: template.id
        });
      }
      
      // Remove questions
      if (questionIdsToRemove.length > 0) {
        await Question.destroy({
          where: { 
            id: questionIdsToRemove,
            templateId: template.id
          }
        });
      }
    }
    
    // Return the updated template with its questions
    const updatedTemplate = await Template.findOne({
      where: { id: template.id },
      include: [{ 
        model: Question, 
        as: 'questions',
        order: [['order', 'ASC']]
      }]
    });
    
    res.status(200).json(updatedTemplate);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ message: 'Failed to update template', error: error.message });
  }
};

// Approve template
exports.approveTemplate = async (req, res) => {
  try {
    const { name, description, questions } = req.body;
    
    // Find the template
    const template = await Template.findOne({
      where: { 
        id: req.params.id
      },
      include: [{ 
        model: Question, 
        as: 'questions'
      }]
    });
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // Update template fields
    await template.update({
      name: name || template.name,
      description: description || template.description,
      status: 'approved'
    });
    
    // Update questions if provided
    if (questions && Array.isArray(questions)) {
      // Get existing questions
      const existingQuestions = template.questions || [];
      const existingQuestionIds = existingQuestions.map(q => q.id);
      
      // Find questions to add, update, or remove
      const questionsToUpdate = questions.filter(q => q.id && existingQuestionIds.includes(q.id));
      const questionsToAdd = questions.filter(q => !q.id || !existingQuestionIds.includes(q.id));
      const questionIdsToKeep = questions.filter(q => q.id).map(q => q.id);
      const questionIdsToRemove = existingQuestionIds.filter(id => !questionIdsToKeep.includes(id));
      
      // Update existing questions
      for (const question of questionsToUpdate) {
        await Question.update({
          text: question.text,
          type: question.type,
          category: question.category,
          perspective: question.perspective || 'peer',
          required: question.required,
          order: question.order
        }, {
          where: { id: question.id, templateId: template.id }
        });
      }
      
      // Add new questions
      for (let i = 0; i < questionsToAdd.length; i++) {
        const question = questionsToAdd[i];
        // If it has a temporary ID (like from frontend), remove it
        const { _id, id, ...questionData } = question;
        await Question.create({
          ...questionData,
          perspective: questionData.perspective || 'peer',
          templateId: template.id
        });
      }
      
      // Remove questions
      if (questionIdsToRemove.length > 0) {
        await Question.destroy({
          where: { 
            id: questionIdsToRemove,
            templateId: template.id
          }
        });
      }
    }
    
    // Return the approved template
    const approvedTemplate = await Template.findOne({
      where: { id: template.id },
      include: [{ 
        model: Question, 
        as: 'questions',
        order: [['order', 'ASC']]
      }]
    });
    
    res.status(200).json(approvedTemplate);
  } catch (error) {
    console.error('Error approving template:', error);
    res.status(500).json({ message: 'Failed to approve template', error: error.message });
  }
};

// Delete template
exports.deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findOne({
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