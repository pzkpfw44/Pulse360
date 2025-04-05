// controllers/templates.controller.js

const { Template, Question, SourceDocument, RatingScale } = require('../models');
const { Document } = require('../models');
const documentController = require('./documents.controller');

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
      name: name,
      description: description,
      purpose: templateInfo?.purpose || '',
      department: templateInfo?.department || '',
      documentType,
      generatedBy: 'flux_ai',
      createdBy: userId,
      status: 'pending_review',
      perspectiveSettings: perspectiveSettings
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
    const { id } = req.params;
    
    console.log('Deleting template with ID:', id);
    
    // Import required models
    const { sequelize, Template } = require('../models');
    
    // Check if template exists
    const template = await Template.findOne({
      where: {
        id,
        createdBy: req.user.id
      }
    });
    
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Turn off foreign keys directly
    await sequelize.query('PRAGMA foreign_keys = OFF;');
    
    try {
      // Perform all operations without a transaction
      // 1. Clear document references
      await sequelize.query(`UPDATE documents SET associatedTemplateId = NULL WHERE associatedTemplateId = '${id}'`);
      
      // 2. Delete source documents
      await sequelize.query(`DELETE FROM source_documents WHERE templateId = '${id}'`);
      
      // 3. Delete rating scales
      await sequelize.query(`DELETE FROM rating_scales WHERE templateId = '${id}'`);
      
      // 4. Delete questions
      await sequelize.query(`DELETE FROM questions WHERE templateId = '${id}'`);
      
      // 5. Delete the template
      await sequelize.query(`DELETE FROM templates WHERE id = '${id}'`);
      
      // Turn foreign keys back on
      await sequelize.query('PRAGMA foreign_keys = ON;');
      
      // Return success
      res.status(200).json({ message: 'Template deleted successfully' });
    } catch (error) {
      // Re-enable foreign keys even after error
      await sequelize.query('PRAGMA foreign_keys = ON;');
      throw error;
    }
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ message: 'Failed to delete template' });
  }
};

exports.generateConfiguredTemplate = async (req, res) => {
  try {
    const {
      documentIds,
      name,
      description,
      purpose,
      department,
      documentType,
      perspectiveSettings
    } = req.body;

    // Validate required fields
    if (!documentIds || !documentIds.length) {
      return res.status(400).json({ message: 'At least one document ID is required' });
    }

    if (!documentType) {
      return res.status(400).json({ message: 'Document type is required' });
    }

    // Log the template generation request with all parameters
    console.log('Template generation request details:', {
      documentIds,
      name,
      description,
      purpose,
      department,
      documentType,
      perspectiveSettings,
      userId: req.user.id
    });

    // Find the documents
    const documents = await Document.findAll({
      where: { id: documentIds }
    });

    if (documents.length === 0) {
      return res.status(404).json({ message: 'No documents found with the provided IDs' });
    }

    // Create template information object to pass to the analysis function
    const templateInfo = {
      name,
      description,
      purpose,
      department,
      perspectiveSettings: perspectiveSettings || {
        manager: { questionCount: 10, enabled: true },
        peer: { questionCount: 10, enabled: true },
        direct_report: { questionCount: 10, enabled: true },
        self: { questionCount: 10, enabled: true },
        external: { questionCount: 5, enabled: false }
      }
    };

    console.log('Starting analysis with configured settings');
    console.log('Template generation request:', {
      documentIds,
      name,
      documentType,
      userId: req.user.id
    });
    
    // Update documents to mark them as being analyzed
    for (const document of documents) {
      await document.update({ status: 'analysis_in_progress' });
    }
    
    // Import the document controller
    const documentController = require('./documents.controller');
    
    // Check if the document controller has the specific function
    if (!documentController.startDocumentAnalysis) {
      console.error('startDocumentAnalysis function not found in documentController');
      
      // For development mode fallback
      if (process.env.NODE_ENV === 'development') {
        console.log('Environment: development');
        console.log('Using development mode template creation');
        
        const template = await createDevelopmentModeTemplate(documents, documentType, req.user.id, templateInfo);
        
        if (template) {
          return res.status(200).json({
            message: 'Template generated successfully in development mode',
            template
          });
        } else {
          return res.status(500).json({ message: 'Failed to generate template in development mode' });
        }
      } else {
        return res.status(500).json({ message: 'Template generation functionality not available' });
      }
    }
    
    // Log environment
    console.log('Environment:', process.env.NODE_ENV);
    
    // Start document analysis with template information
    const template = await documentController.startDocumentAnalysis(documents, documentType, req.user.id, templateInfo);
    
    if (template && template.id) {
      // Fetch the updated template with all associations
      const updatedTemplate = await Template.findByPk(template.id, {
        include: ['questions', 'sourceDocuments', 'ratingScales']
      });
      
      res.status(200).json({
        message: 'Template generated successfully',
        template: updatedTemplate
      });
    } else {
      res.status(500).json({ message: 'Failed to generate template' });
    }
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ message: 'Failed to generate template', error: error.message });
  }
};

// Add this helper function for development mode
// This should be added after the generateConfiguredTemplate function

async function createDevelopmentModeTemplate(documents, documentType, userId, templateInfo) {
  try {
    console.log('Creating development mode template');
    
    // Create the template with provided information
    const template = await Template.create({
      name: templateInfo.name || `${documentType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Template (Fallback)`,
      description: templateInfo.description || 'Generated with fallback questions due to analysis error',
      purpose: templateInfo.purpose || '',
      department: templateInfo.department || '',
      documentType,
      perspectiveSettings: templateInfo.perspectiveSettings || {
        manager: { questionCount: 10, enabled: true },
        peer: { questionCount: 10, enabled: true },
        direct_report: { questionCount: 10, enabled: true },
        self: { questionCount: 10, enabled: true },
        external: { questionCount: 5, enabled: false }
      },
      generatedBy: 'flux_ai',
      createdBy: userId,
      status: 'pending_review'
    });
    
    // Generate appropriate sample questions for the template type
    const questions = generateSampleQuestions(documentType, templateInfo.perspectiveSettings);
    
    // Create all questions
    for (const question of questions) {
      await Question.create({
        ...question,
        templateId: template.id
      });
    }
    
    // Create source document references
    for (const document of documents) {
      await SourceDocument.create({
        documentId: document.id,
        templateId: template.id
      });
      
      // Update document status
      await document.update({
        status: 'analysis_complete',
        associatedTemplateId: template.id
      });
    }
    
    // Fetch and return the complete template
    return await Template.findByPk(template.id, {
      include: ['questions', 'sourceDocuments']
    });
  } catch (error) {
    console.error('Error creating development mode template:', error);
    return null;
  }
}

// Add this helper function for generating sample questions
// This should be added after the createDevelopmentModeTemplate function

function generateSampleQuestions(documentType, perspectiveSettings = {}) {
  const questions = [];
  let questionOrder = 1;
  
  // Get perspectives that should be enabled
  const perspectives = Object.entries(perspectiveSettings || {})
    .filter(([_, settings]) => settings.enabled)
    .map(([perspective]) => perspective);
  
  // If no valid perspectives, use defaults
  if (perspectives.length === 0) {
    perspectives.push('manager', 'peer', 'direct_report', 'self');
  }
  
  // Generate document-type specific and perspective-specific questions
  perspectives.forEach(perspective => {
    // Common questions for all types and perspectives
    questions.push({
      text: `How effectively does this person communicate with ${perspective === 'self' ? 'others' : 'you and team members'}?`,
      type: "rating",
      category: "Communication",
      perspective: perspective,
      required: true,
      order: questionOrder++
    });
    
    // Add perspective-specific open-ended questions
    if (perspective === 'self') {
      questions.push({
        text: "What do you consider to be your key strengths? Please provide specific examples.",
        type: "open_ended",
        category: "Strengths",
        perspective: perspective,
        required: true,
        order: questionOrder++
      });
      
      questions.push({
        text: "In what areas could you improve? Please be specific and constructive.",
        type: "open_ended",
        category: "Development Areas",
        perspective: perspective,
        required: true,
        order: questionOrder++
      });
    } else {
      questions.push({
        text: "What are this person's key strengths? Please provide specific examples.",
        type: "open_ended",
        category: "Strengths",
        perspective: perspective,
        required: true,
        order: questionOrder++
      });
      
      questions.push({
        text: "In what areas could this person improve? Please be specific and constructive.",
        type: "open_ended",
        category: "Development Areas",
        perspective: perspective,
        required: true,
        order: questionOrder++
      });
    }
    
    // Add document-type specific questions
    switch (documentType) {
      case 'leadership_model':
        addLeadershipModelQuestions(questions, perspective, questionOrder);
        questionOrder += 5; // Increment for added questions
        break;
      case 'job_description':
        addJobDescriptionQuestions(questions, perspective, questionOrder);
        questionOrder += 3; // Increment for added questions
        break;
      case 'competency_framework':
        addCompetencyFrameworkQuestions(questions, perspective, questionOrder);
        questionOrder += 4; // Increment for added questions
        break;
      case 'company_values':
        addCompanyValuesQuestions(questions, perspective, questionOrder);
        questionOrder += 3; // Increment for added questions
        break;
      case 'performance_criteria':
        addPerformanceCriteriaQuestions(questions, perspective, questionOrder);
        questionOrder += 4; // Increment for added questions
        break;
      default:
        // Add some generic questions for any other type
        addGenericQuestions(questions, perspective, questionOrder);
        questionOrder += 3; // Increment for added questions
    }
  });
  
  return questions;
}

// Helper functions for each document type
// Place these helper functions after the generateSampleQuestions function

function addLeadershipModelQuestions(questions, perspective, startOrder) {
  let order = startOrder;
  
  if (perspective === 'manager') {
    questions.push(
      {
        text: "How effectively does this person develop strategies aligned with organizational goals?",
        type: "rating",
        category: "Strategic Thinking",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person adapt their leadership approach to different situations?",
        type: "rating",
        category: "Adaptability",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person identify and develop talent within their team?",
        type: "rating",
        category: "Talent Development",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate this person's ability to make difficult decisions?",
        type: "rating",
        category: "Decision Making",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person communicate the vision and direction to their team?",
        type: "rating",
        category: "Vision Communication",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'peer') {
    questions.push(
      {
        text: "How effectively does this person collaborate across teams and departments?",
        type: "rating",
        category: "Collaboration",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person influence without authority?",
        type: "rating",
        category: "Influence",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person share information and resources?",
        type: "rating",
        category: "Information Sharing",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate this person's ability to contribute to cross-functional initiatives?",
        type: "rating",
        category: "Cross-functional Collaboration",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person demonstrate leadership among peers?",
        type: "rating",
        category: "Peer Leadership",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'direct_report') {
    questions.push(
      {
        text: "How well does this person provide clear direction and guidance?",
        type: "rating",
        category: "Direction Setting",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person delegate tasks and empower you?",
        type: "rating",
        category: "Delegation",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person provide feedback to help you improve?",
        type: "rating",
        category: "Feedback",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person recognize and appreciate your contributions?",
        type: "rating",
        category: "Recognition",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate this person's ability to resolve conflicts within the team?",
        type: "rating",
        category: "Conflict Resolution",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'self') {
    questions.push(
      {
        text: "How effectively do you establish and communicate vision and direction?",
        type: "rating",
        category: "Vision",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well do you develop and mentor your team members?",
        type: "rating",
        category: "Team Development",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively do you make decisions, especially difficult ones?",
        type: "rating",
        category: "Decision Making",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate your ability to inspire and motivate others?",
        type: "rating",
        category: "Inspiration",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well do you balance strategic thinking with tactical execution?",
        type: "rating",
        category: "Strategic Execution",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  }
}

function addJobDescriptionQuestions(questions, perspective, startOrder) {
  let order = startOrder;
  
  if (perspective === 'manager') {
    questions.push(
      {
        text: "How effectively does this person fulfill their core job responsibilities?",
        type: "rating",
        category: "Job Performance",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate this person's technical skills relative to job requirements?",
        type: "rating",
        category: "Technical Skills",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person manage their time and priorities?",
        type: "rating",
        category: "Time Management",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'peer') {
    questions.push(
      {
        text: "How effectively does this person apply their job knowledge when collaborating with you?",
        type: "rating",
        category: "Knowledge Application",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate this person's efficiency when working on shared tasks?",
        type: "rating",
        category: "Efficiency",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person meet deadlines when you work together?",
        type: "rating",
        category: "Reliability",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'direct_report') {
    questions.push(
      {
        text: "How well does this person demonstrate the skills they expect from you?",
        type: "rating",
        category: "Role Modeling",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person establish clear performance expectations?",
        type: "rating",
        category: "Expectation Setting",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate this person's ability to provide technical guidance?",
        type: "rating",
        category: "Technical Guidance",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'self') {
    questions.push(
      {
        text: "How effectively do you meet the core requirements of your role?",
        type: "rating",
        category: "Job Fulfillment",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate your technical skills relative to job requirements?",
        type: "rating",
        category: "Technical Skills",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well do you manage your workload and meet deadlines?",
        type: "rating",
        category: "Workload Management",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  }
}

function addCompetencyFrameworkQuestions(questions, perspective, startOrder) {
  let order = startOrder;
  
  // Add perspective-specific competency questions
  if (perspective === 'manager') {
    questions.push(
      {
        text: "How effectively does this person demonstrate problem-solving competencies?",
        type: "rating",
        category: "Problem Solving",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate this person's analytical skills?",
        type: "rating",
        category: "Analytical Thinking",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person demonstrate innovation and creative thinking?",
        type: "rating",
        category: "Innovation",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person apply their technical expertise?",
        type: "rating",
        category: "Technical Expertise",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'peer') {
    questions.push(
      {
        text: "How effectively does this person collaborate with others?",
        type: "rating",
        category: "Collaboration",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate this person's adaptability to change?",
        type: "rating",
        category: "Adaptability",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person communicate complex information?",
        type: "rating",
        category: "Communication",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person share knowledge with others?",
        type: "rating",
        category: "Knowledge Sharing",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'direct_report') {
    questions.push(
      {
        text: "How well does this person demonstrate active listening when you share ideas?",
        type: "rating",
        category: "Active Listening",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person coach you to develop your skills?",
        type: "rating",
        category: "Coaching",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate this person's ability to provide constructive feedback?",
        type: "rating",
        category: "Feedback",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person demonstrate empathy and understanding?",
        type: "rating",
        category: "Empathy",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'self') {
    questions.push(
      {
        text: "How effectively do you solve complex problems?",
        type: "rating",
        category: "Problem Solving",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate your ability to adapt to changing priorities?",
        type: "rating",
        category: "Adaptability",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively do you collaborate with team members and other departments?",
        type: "rating",
        category: "Collaboration",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well do you apply your technical expertise in your role?",
        type: "rating",
        category: "Technical Expertise",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  }
}

function addCompanyValuesQuestions(questions, perspective, startOrder) {
  let order = startOrder;
  
  if (perspective === 'manager') {
    questions.push(
      {
        text: "How well does this person embody our company values in their leadership approach?",
        type: "rating",
        category: "Values Leadership",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person promote our values within their team?",
        type: "rating",
        category: "Values Advocacy",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate this person's alignment between decisions and company values?",
        type: "rating",
        category: "Values-Based Decisions",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'peer') {
    questions.push(
      {
        text: "How consistently does this person demonstrate our company values in their daily work?",
        type: "rating",
        category: "Values Consistency",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate this person's integrity and ethical behavior?",
        type: "rating",
        category: "Integrity",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person exemplify our values in challenging situations?",
        type: "rating",
        category: "Values Resilience",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'direct_report') {
    questions.push(
      {
        text: "How well does this person exemplify our company values in their interactions with you?",
        type: "rating",
        category: "Values Modeling",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person create an inclusive environment that aligns with our values?",
        type: "rating",
        category: "Inclusive Culture",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate this person's consistency in recognizing value-aligned behaviors?",
        type: "rating",
        category: "Values Recognition",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'self') {
    questions.push(
      {
        text: "How consistently do you demonstrate the company's core values in your daily work?",
        type: "rating",
        category: "Values Alignment",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well do you foster an environment that respects our company values?",
        type: "rating",
        category: "Values Culture",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively do you make decisions that align with our company values?",
        type: "rating",
        category: "Values-Based Decisions",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  }
}

function addPerformanceCriteriaQuestions(questions, perspective, startOrder) {
  let order = startOrder;
  
  if (perspective === 'manager') {
    questions.push(
      {
        text: "How consistently does this person meet or exceed their performance targets?",
        type: "rating",
        category: "Target Achievement",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate the quality of this person's work outputs?",
        type: "rating",
        category: "Work Quality",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person take initiative to drive results?",
        type: "rating",
        category: "Initiative",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person identify and address performance gaps?",
        type: "rating",
        category: "Performance Improvement",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'peer') {
    questions.push(
      {
        text: "How effectively does this person contribute to team performance goals?",
        type: "rating",
        category: "Team Contribution",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate the reliability of this person's work when collaborating?",
        type: "rating",
        category: "Reliability",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person maintain quality standards in shared work?",
        type: "rating",
        category: "Quality Standards",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person help others achieve their performance goals?",
        type: "rating",
        category: "Supportiveness",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'direct_report') {
    questions.push(
      {
        text: "How effectively does this person help you achieve your performance goals?",
        type: "rating",
        category: "Performance Support",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person recognize your achievements?",
        type: "rating",
        category: "Recognition",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person provide resources you need to perform?",
        type: "rating",
        category: "Resource Provision",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate this person's ability to set clear performance expectations?",
        type: "rating",
        category: "Expectation Setting",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'self') {
    questions.push(
      {
        text: "How consistently do you meet or exceed your performance targets?",
        type: "rating",
        category: "Target Achievement",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively do you manage your time to maximize productivity?",
        type: "rating",
        category: "Time Management",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate the quality of your work outputs?",
        type: "rating",
        category: "Work Quality",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "What specific accomplishments have you achieved in the past period?",
        type: "open_ended",
        category: "Accomplishments",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  }
}

function addGenericQuestions(questions, perspective, startOrder) {
  let order = startOrder;
  
  if (perspective === 'manager') {
    questions.push(
      {
        text: "How would you rate this person's overall performance?",
        type: "rating",
        category: "Overall Performance",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person contribute to team objectives?",
        type: "rating",
        category: "Team Contribution",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person apply feedback to improve their performance?",
        type: "rating",
        category: "Feedback Application",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'peer') {
    questions.push(
      {
        text: "How would you rate this person's collaboration with you and other team members?",
        type: "rating",
        category: "Collaboration",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person share knowledge and information?",
        type: "rating",
        category: "Knowledge Sharing",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person maintain a positive attitude in challenging situations?",
        type: "rating",
        category: "Resilience",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'direct_report') {
    questions.push(
      {
        text: "How would you rate the support this person provides to you?",
        type: "rating",
        category: "Support",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person communicate expectations?",
        type: "rating",
        category: "Expectation Setting",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person recognize your contributions?",
        type: "rating",
        category: "Recognition",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'self') {
    questions.push(
      {
        text: "How would you rate your overall performance?",
        type: "rating",
        category: "Overall Performance",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively do you manage your workload?",
        type: "rating",
        category: "Workload Management",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well do you seek and apply feedback to improve?",
        type: "rating",
        category: "Feedback Application",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  }
}