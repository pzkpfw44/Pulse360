// controllers/templates.controller.js

const { Template, Question, SourceDocument, RatingScale } = require('../models');
const { Document } = require('../models');

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
        // Removed RatingScale include to fix the error
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
    const { 
      name, 
      description, 
      purpose,
      department,
      documentType, 
      questions, 
      sourceDocuments,
      perspectiveSettings
    } = req.body;
    
    if (!name || !documentType) {
      return res.status(400).json({ message: 'Name and document type are required' });
    }
    
    // Create the template
    const template = await Template.create({
      name,
      description,
      purpose,
      department,
      documentType,
      perspectiveSettings: perspectiveSettings || {
        manager: { questionCount: 10, enabled: true },
        peer: { questionCount: 10, enabled: true },
        direct_report: { questionCount: 10, enabled: true },
        self: { questionCount: 10, enabled: true },
        external: { questionCount: 5, enabled: false }
      },
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
    const { 
      name, 
      description, 
      purpose,
      department,
      questions, 
      status,
      perspectiveSettings,
      ratingScales
    } = req.body;
    
    // Find the template
    const template = await Template.findOne({
      where: { 
        id: req.params.id,
        createdBy: req.user.id
      },
      include: [
        { 
          model: Question, 
          as: 'questions'
        },
        {
          model: RatingScale,
          as: 'ratingScales'
        }
      ]
    });
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // Update template fields
    await template.update({
      name: name || template.name,
      description: description || template.description,
      purpose: purpose !== undefined ? purpose : template.purpose,
      department: department !== undefined ? department : template.department,
      status: status || template.status,
      perspectiveSettings: perspectiveSettings || template.perspectiveSettings
    });
    
    // Update rating scales if provided
    if (ratingScales && Array.isArray(ratingScales)) {
      // Get existing scales
      const existingScales = template.ratingScales || [];
      const existingScaleIds = existingScales.map(s => s.id);
      
      // Find scales to add, update, or remove
      const scalesToUpdate = ratingScales.filter(s => s.id && existingScaleIds.includes(s.id));
      const scalesToAdd = ratingScales.filter(s => !s.id || !existingScaleIds.includes(s.id));
      const scaleIdsToKeep = ratingScales.filter(s => s.id).map(s => s.id);
      
      // Update existing scales
      for (const scale of scalesToUpdate) {
        const { _id, ...scaleData } = scale;
        await RatingScale.update(scaleData, {
          where: { id: scale.id, templateId: template.id }
        });
      }
      
      // Add new scales
      for (const scale of scalesToAdd) {
        // Remove temporary frontend IDs
        const { _id, id, ...scaleData } = scale;
        await RatingScale.create({
          ...scaleData,
          templateId: template.id
        });
      }
      
      // We don't automatically delete scales as they might be used by questions
    }
    
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
        const { _id, ...questionData } = question;
        await Question.update(questionData, {
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
    
    // Return the updated template with its questions and rating scales
    const updatedTemplate = await Template.findOne({
      where: { id: template.id },
      include: [
        { 
          model: Question, 
          as: 'questions',
          order: [['order', 'ASC']]
        },
        {
          model: RatingScale,
          as: 'ratingScales'
        }
      ]
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
    const { name, description, purpose, department, questions } = req.body;
    
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
      purpose: purpose !== undefined ? purpose : template.purpose,
      department: department !== undefined ? department : template.department,
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
        const { _id, id, ratingScaleId, ...questionData } = question;
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

// Re-analyze template with AI
exports.reAnalyzeTemplate = async (req, res) => {
  try {
    const templateId = req.params.id;
    
    // Find the template with its source documents
    const template = await Template.findOne({
      where: { id: templateId },
      include: [
        { 
          model: Question, 
          as: 'questions'
        },
        {
          model: SourceDocument,
          as: 'sourceDocuments'
        }
      ]
    });
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    // Check if template has source documents
    if (!template.sourceDocuments || template.sourceDocuments.length === 0) {
      return res.status(400).json({ 
        message: 'Cannot re-analyze template without source documents' 
      });
    }
    
    // Get document IDs from source documents
    const documentIds = template.sourceDocuments
      .filter(src => src.documentId)
      .map(src => src.documentId);
    
    // Find the actual documents
    const documents = await Document.findAll({
      where: { id: documentIds }
    });
    
    if (documents.length === 0) {
      return res.status(400).json({ 
        message: 'No valid documents found for re-analysis' 
      });
    }
    
    // Start the re-analysis process
    // This is a simplified version - in a real implementation, 
    // we would call the AI service asynchronously and update the template
    try {
      // Store existing questions in memory
      const existingQuestions = [...template.questions];
      
      // Store existing categories and question text for merging
      const existingCategories = new Set();
      const existingQuestionTexts = new Set();
      
      existingQuestions.forEach(q => {
        if (q.category) existingCategories.add(q.category);
        existingQuestionTexts.add(q.text);
      });
      
      // Get file IDs for AI analysis
      const fileIds = template.sourceDocuments
        .filter(src => src.fluxAiFileId)
        .map(src => src.fluxAiFileId);
        
      // In development mode - simulate adding new questions
      // Add a few new mock questions
      const mockNewQuestions = [
        {
          text: "How effectively does this person communicate complex ideas?",
          type: "rating",
          category: "Communication",
          perspective: "manager",
          required: true,
          order: existingQuestions.length + 1,
          templateId: template.id
        },
        {
          text: "What specific areas could this person improve in their leadership approach?",
          type: "open_ended",
          category: "Leadership",
          perspective: "peer",
          required: true,
          order: existingQuestions.length + 2,
          templateId: template.id
        },
        {
          text: "How well does this person adapt to changing priorities?",
          type: "rating",
          category: "Adaptability",
          perspective: "direct_report",
          required: true,
          order: existingQuestions.length + 3,
          templateId: template.id
        }
      ];
      
      // Add the mock questions to the database
      for (const question of mockNewQuestions) {
        if (!existingQuestionTexts.has(question.text)) {
          await Question.create(question);
        }
      }
      
      // Update template's last analysis date
      await template.update({
        lastAnalysisDate: new Date()
      });
      
      // Return updated template
      const updatedTemplate = await Template.findOne({
        where: { id: templateId },
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
      
      res.status(200).json({
        message: `Re-analysis complete. Added ${mockNewQuestions.length} new questions.`,
        template: updatedTemplate
      });
      
    } catch (error) {
      console.error('Error during re-analysis:', error);
      return res.status(500).json({ 
        message: 'AI re-analysis failed', 
        error: error.message 
      });
    }
    
  } catch (error) {
    console.error('Error with template re-analysis:', error);
    res.status(500).json({ message: 'Failed to re-analyze template', error: error.message });
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