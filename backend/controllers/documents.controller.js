// controllers/documents.controller.js

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const { Document, Template, Question, SourceDocument } = require('../models');
const fluxAiConfig = require('../config/flux-ai');

// Upload document(s)
exports.uploadDocuments = async (req, res) => {
    try {
      console.log("Upload documents request received");
      console.log("Files:", req.files ? req.files.length : "No files");
      console.log("Document type:", req.body.documentType || "Not provided");
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }
  
      const { documentType } = req.body;
      if (!documentType) {
        return res.status(400).json({ message: 'Document type is required' });
      }

    const uploadedDocuments = [];
    
    // Process each file
    for (const file of req.files) {
      // Create document record in database
      const document = await Document.create({
        filename: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        path: file.path,
        documentType,
        uploadedBy: req.user.id,
      });
      
      uploadedDocuments.push(document);
    }

    // Start analysis in the background
    // This will be asynchronous to not block the response
    if (fluxAiConfig.isConfigured()) {
      startDocumentAnalysis(uploadedDocuments, documentType, req.user.id);
    } else if (fluxAiConfig.isDevelopment) {
      console.log('Running in development mode without Flux AI API key');
      startDevelopmentModeAnalysis(uploadedDocuments, documentType, req.user.id);
    } else {
      console.error('Flux AI not configured and not in development mode');
      // Update documents with error status
      const documentIds = uploadedDocuments.map(doc => doc.id);
      await Document.update(
        { 
          status: 'analysis_failed', 
          analysisError: 'Flux AI API key not configured' 
        },
        { where: { id: documentIds } }
      );
    }

    res.status(201).json({
      message: 'Documents uploaded successfully',
      count: uploadedDocuments.length,
      documents: uploadedDocuments.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        documentType: doc.documentType,
        size: doc.size,
        uploadedAt: doc.createdAt
      }))
    });
  } catch (error) {
    console.error('Error uploading documents:', error);
    res.status(500).json({ message: 'Failed to upload documents', error: error.message });
  }
};

// Development mode analysis (no API key needed)
async function startDevelopmentModeAnalysis(documents, documentType, userId) {
  try {
    console.log('Starting development mode analysis for document type:', documentType);
    
    // Update documents to show analysis in progress
    const documentIds = documents.map(doc => doc.id);
    await Document.update(
      { 
        status: 'analysis_in_progress',
        fluxAiFileId: 'dev-mode-' + uuidv4() // Generate a fake file ID
      },
      { where: { id: documentIds } }
    );
    
    // Wait a moment to simulate actual API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate mock questions based on document type
    const questions = generateMockQuestionsForDocumentType(documentType);
    
    // Create a new template
    const template = await Template.create({
      name: `${documentType.replace('_', ' ')} Template (Dev Mode)`,
      description: 'Generated in development mode without Flux AI',
      documentType,
      generatedBy: 'flux_ai',
      createdBy: userId,
      status: 'pending_review'
    });
    
    // Create questions for the template
    await Promise.all(
      questions.map(async (q, index) => {
        return Question.create({
          ...q,
          templateId: template.id
        });
      })
    );
    
    // Create mock source document references
    await Promise.all(
      documents.map(async (doc) => {
        return SourceDocument.create({
          fluxAiFileId: doc.fluxAiFileId || 'dev-mode-file',
          documentId: doc.id,
          templateId: template.id
        });
      })
    );
    
    // Update documents with analysis complete status
    await Document.update(
      { 
        status: 'analysis_complete',
        associatedTemplateId: template.id
      },
      { where: { id: documentIds } }
    );
    
    console.log('Development mode analysis complete, template created:', template.id);
    return template;
  } catch (error) {
    console.error('Error in development mode analysis:', error);
    
    // Update documents with error status
    const documentIds = documents.map(doc => doc.id);
    await Document.update(
      { status: 'analysis_failed', analysisError: error.message },
      { where: { id: documentIds } }
    );
  }
}

// Generate mock questions based on document type
function generateMockQuestionsForDocumentType(documentType) {
  const allQuestions = [];
  const perspectives = ['manager', 'peer', 'direct_report', 'self'];
  let questionOrder = 1;
  
  // For each perspective, generate appropriate questions
  perspectives.forEach(perspective => {
    // Common questions for all perspectives
    const commonQuestions = [
      {
        text: `How effectively does this person communicate with ${perspective === 'self' ? 'others' : 'you and team members'}?`,
        type: "rating",
        category: "Communication",
        perspective: perspective,
        required: true,
        order: questionOrder++
      }
    ];
    
    // Add perspective-specific open-ended questions
    if (perspective === 'self') {
      commonQuestions.push({
        text: "What do you consider to be your key strengths? Please provide specific examples.",
        type: "open_ended",
        category: "Strengths",
        perspective: perspective,
        required: true,
        order: questionOrder++
      });
      
      commonQuestions.push({
        text: "In what areas could you improve? Please be specific and constructive.",
        type: "open_ended",
        category: "Development Areas",
        perspective: perspective,
        required: true,
        order: questionOrder++
      });
    } else {
      commonQuestions.push({
        text: "What are this person's key strengths? Please provide specific examples.",
        type: "open_ended",
        category: "Strengths",
        perspective: perspective,
        required: true,
        order: questionOrder++
      });
      
      commonQuestions.push({
        text: "In what areas could this person improve? Please be specific and constructive.",
        type: "open_ended",
        category: "Development Areas",
        perspective: perspective,
        required: true,
        order: questionOrder++
      });
    }
    
    // Add all common questions to final array
    allQuestions.push(...commonQuestions);
    
    // Document type specific questions with perspective awareness
    let typeSpecificQuestions = [];
    
    switch (documentType) {
      case 'leadership_model':
        if (perspective === 'direct_report') {
          typeSpecificQuestions = [
            {
              text: "How well does this person provide you with clear direction and guidance?",
              type: "rating",
              category: "Leadership",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How effectively does this person delegate tasks and empower you?",
              type: "rating",
              category: "Team Management",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How well does this person support your professional development?",
              type: "rating",
              category: "Talent Development",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        } else if (perspective === 'peer') {
          typeSpecificQuestions = [
            {
              text: "How well does this person collaborate across teams and departments?",
              type: "rating",
              category: "Collaboration",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How would you rate this person's ability to influence without authority?",
              type: "rating",
              category: "Influence",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How effectively does this person share information and resources?",
              type: "rating",
              category: "Team Management",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        } else if (perspective === 'manager') {
          typeSpecificQuestions = [
            {
              text: "How well does this person demonstrate leadership potential?",
              type: "rating",
              category: "Leadership",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How effectively does this person manage their team's performance?",
              type: "rating",
              category: "Performance Management",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How well does this person align their team's work with organizational goals?",
              type: "rating",
              category: "Strategic Alignment",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        } else if (perspective === 'self') {
          typeSpecificQuestions = [
            {
              text: "How well do you demonstrate leadership through vision and strategy?",
              type: "rating",
              category: "Leadership",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How effectively do you delegate tasks and empower team members?",
              type: "rating",
              category: "Team Management",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How would you rate your ability to make difficult decisions under pressure?",
              type: "rating",
              category: "Decision Making",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        }
        break;
        
      case 'job_description':
        if (perspective === 'direct_report') {
          typeSpecificQuestions = [
            {
              text: "How well does this person support you in achieving your job responsibilities?",
              type: "rating",
              category: "Job Support",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How clearly does this person communicate expectations to you?",
              type: "rating",
              category: "Expectation Setting",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        } else if (perspective === 'peer') {
          typeSpecificQuestions = [
            {
              text: "How effectively does this person fulfill their role responsibilities when working with you?",
              type: "rating",
              category: "Job Performance",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How would you rate this person's technical skills when collaborating on projects?",
              type: "rating",
              category: "Technical Skills",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        } else if (perspective === 'manager') {
          typeSpecificQuestions = [
            {
              text: "How effectively does this person meet the core responsibilities of their role?",
              type: "rating",
              category: "Job Performance",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How well does this person demonstrate the technical skills required for their position?",
              type: "rating",
              category: "Technical Skills",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        } else if (perspective === 'self') {
          typeSpecificQuestions = [
            {
              text: "How effectively do you fulfill the core responsibilities of your role?",
              type: "rating",
              category: "Job Performance",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How would you rate your efficiency and quality of work?",
              type: "rating",
              category: "Work Quality",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        }
        break;
        
      case 'competency_framework':
        if (perspective === 'direct_report') {
          typeSpecificQuestions = [
            {
              text: "How well does this person demonstrate active listening when you share ideas?",
              type: "rating",
              category: "Communication",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How effectively does this person help you solve problems?",
              type: "rating",
              category: "Problem Solving",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        } else if (perspective === 'peer') {
          typeSpecificQuestions = [
            {
              text: "How effectively does this person collaborate with you and others across the organization?",
              type: "rating",
              category: "Collaboration",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How well does this person adapt to changing priorities and requirements?",
              type: "rating",
              category: "Adaptability",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        } else if (perspective === 'manager') {
          typeSpecificQuestions = [
            {
              text: "How well does this person demonstrate problem-solving abilities?",
              type: "rating",
              category: "Problem Solving",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "Rate this person's ability to innovate and bring new ideas to the team.",
              type: "rating",
              category: "Innovation",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        } else if (perspective === 'self') {
          typeSpecificQuestions = [
            {
              text: "How would you rate your ability to solve complex problems?",
              type: "rating",
              category: "Problem Solving",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How effectively do you collaborate with others across the organization?",
              type: "rating",
              category: "Collaboration",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        }
        break;
        
      case 'company_values':
        if (perspective === 'direct_report') {
          typeSpecificQuestions = [
            {
              text: "How well does this person exemplify our company values in their interactions with you?",
              type: "rating",
              category: "Values Alignment",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How effectively does this person create an inclusive environment for you and your colleagues?",
              type: "rating",
              category: "Inclusion",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        } else if (perspective === 'peer') {
          typeSpecificQuestions = [
            {
              text: "How consistently does this person demonstrate our company values in their daily work?",
              type: "rating",
              category: "Values Alignment",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How would you rate this person's integrity and ethical behavior?",
              type: "rating",
              category: "Ethics",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        } else if (perspective === 'manager') {
          typeSpecificQuestions = [
            {
              text: "How well does this person embody our company values in their leadership approach?",
              type: "rating",
              category: "Values Alignment",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How effectively does this person promote our values within their team?",
              type: "rating",
              category: "Values Advocacy",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        } else if (perspective === 'self') {
          typeSpecificQuestions = [
            {
              text: "How consistently do you demonstrate the company's core values in your daily work?",
              type: "rating",
              category: "Values Alignment",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How well do you foster an inclusive environment that respects diversity?",
              type: "rating",
              category: "Inclusion",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        }
        break;
        
      case 'performance_criteria':
        if (perspective === 'direct_report') {
          typeSpecificQuestions = [
            {
              text: "How effectively does this person help you achieve your performance goals?",
              type: "rating",
              category: "Performance Support",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How well does this person recognize your achievements?",
              type: "rating",
              category: "Recognition",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        } else if (perspective === 'peer') {
          typeSpecificQuestions = [
            {
              text: "How effectively does this person contribute to team goals and outcomes?",
              type: "rating",
              category: "Target Achievement",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How well does this person meet deadlines when working with you?",
              type: "rating",
              category: "Time Management",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        } else if (perspective === 'manager') {
          typeSpecificQuestions = [
            {
              text: "How consistently does this person meet or exceed their performance targets?",
              type: "rating",
              category: "Target Achievement",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How effectively does this person take initiative and drive results?",
              type: "rating",
              category: "Initiative",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        } else if (perspective === 'self') {
          typeSpecificQuestions = [
            {
              text: "How consistently do you meet or exceed your performance targets?",
              type: "rating",
              category: "Target Achievement",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "How well do you prioritize and manage your time?",
              type: "rating",
              category: "Time Management",
              perspective: perspective,
              required: true,
              order: questionOrder++
            },
            {
              text: "What specific accomplishments have you achieved in the past period?",
              type: "open_ended",
              category: "Accomplishments",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        }
        break;
        
      default:
        // Add some generic questions based on perspective
        if (perspective === 'direct_report') {
          typeSpecificQuestions = [
            {
              text: "How would you rate the support this person provides to you?",
              type: "rating",
              category: "Support",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        } else if (perspective === 'peer') {
          typeSpecificQuestions = [
            {
              text: "How would you rate this person's overall collaboration with you?",
              type: "rating",
              category: "Collaboration",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        } else if (perspective === 'manager') {
          typeSpecificQuestions = [
            {
              text: "How would you rate this person's overall performance?",
              type: "rating",
              category: "Overall Performance",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        } else if (perspective === 'self') {
          typeSpecificQuestions = [
            {
              text: "How would you rate your overall performance?",
              type: "rating",
              category: "Overall Performance",
              perspective: perspective,
              required: true,
              order: questionOrder++
            }
          ];
        }
    }
    
    // Add type-specific questions to the final array
    allQuestions.push(...typeSpecificQuestions);
  });
  
  return allQuestions;
}

// Start FluxAI analysis process
async function startDocumentAnalysis(documents, documentType, userId) {
  try {
    // Upload documents to FluxAI
    const fileIds = [];
    
    for (const document of documents) {
      const filePath = document.path;
      const formData = new FormData();
      
      // Add file to form data
      formData.append('files', fs.createReadStream(filePath));
      
      // Add tags for categorization
      formData.append('tags', JSON.stringify([documentType, 'pulse360']));
      
      // Upload to FluxAI
      const response = await axios.post(`${fluxAiConfig.baseUrl}/v1/files`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${fluxAiConfig.apiKey}`
        }
      });
      
      if (response.data.success) {
        const uploadedFile = response.data.data[0];
        fileIds.push(uploadedFile.id);
        
        // Update document with FluxAI file ID
        await document.update({
          fluxAiFileId: uploadedFile.id,
          status: 'uploaded_to_ai'
        });
      }
    }
    
    // If we successfully uploaded files, request analysis
    if (fileIds.length > 0) {
      await analyzeDocumentsWithFluxAI(fileIds, documentType, userId);
    }
  } catch (error) {
    console.error('Error starting document analysis:', error);
    
    // Update documents with error status
    const documentIds = documents.map(doc => doc.id);
    await Document.update(
      { status: 'analysis_failed', analysisError: error.message },
      { where: { id: documentIds } }
    );
  }
}

// Analyze documents using FluxAI
async function analyzeDocumentsWithFluxAI(fileIds, documentType, userId) {
  try {
    // Create a prompt based on document type
    const prompt = createAnalysisPrompt(documentType);
    
    // Create messages array with file references
    const messages = [
      {
        role: "system",
        content: "You are an expert in organizational development and HR practices, specializing in 360-degree feedback."
      },
      {
        role: "user",
        content: prompt
      }
    ];
    
    // Create attachments array with file references
    const attachments = fileIds.map(fileId => ({ file_id: fileId }));
    
    // Make request to FluxAI chat completions
    const response = await axios.post(`${fluxAiConfig.baseUrl}/v1/chat/completions`, {
      messages,
      attachments,
      model: fluxAiConfig.model,
      stream: false
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${fluxAiConfig.apiKey}`
      }
    });
    
    // Extract the AI analysis from the response
    const aiResponse = response.data.choices[0].message.content;
    
    // Parse the AI response to extract questions
    const questionData = parseQuestionsFromAIResponse(aiResponse);
    
    // Create a new template based on the analysis
    const template = await Template.create({
      name: `${documentType.replace('_', ' ')} Template`,
      documentType,
      generatedBy: 'flux_ai',
      createdBy: userId,
      status: 'pending_review'
    });
    
    // Create questions for the template
    const questions = await Promise.all(
      questionData.map(async (q, index) => {
        return Question.create({
          ...q,
          templateId: template.id
        });
      })
    );
    
    // Create source document references
    await Promise.all(
      fileIds.map(async (fileId) => {
        return SourceDocument.create({
          fluxAiFileId: fileId,
          templateId: template.id
        });
      })
    );
    
    // Update documents with analysis complete status
    await Document.update(
      { 
        status: 'analysis_complete',
        associatedTemplateId: template.id
      },
      { where: { fluxAiFileId: fileIds } }
    );
    
    return template;
  } catch (error) {
    console.error('Error analyzing documents with FluxAI:', error);
    
    // Update documents with error status
    await Document.update(
      { status: 'analysis_failed', analysisError: error.message },
      { where: { fluxAiFileId: fileIds } }
    );
    
    throw error;
  }
}

// Create appropriate prompt based on document type
function createAnalysisPrompt(documentType) {
  const basePrompt = "Please analyze the attached document(s) and generate a list of relevant questions for a 360-degree feedback assessment. ";
  
  switch (documentType) {
    case 'leadership_model':
      return basePrompt + "Focus on leadership qualities, behaviors, and competencies described in the model. Generate questions that evaluate how well a leader demonstrates these qualities from the perspective of their peers, direct reports, and managers.";
    
    case 'job_description':
      return basePrompt + "Extract key responsibilities, skills, and competencies from the job description. Create questions that assess how effectively the individual performs in these areas from multiple perspectives.";
    
    case 'competency_framework':
      return basePrompt + "Identify the core competencies described in the framework. Generate questions that measure these competencies through observable behaviors and outcomes.";
    
    case 'company_values':
      return basePrompt + "Extract the company values and principles. Create questions that assess how consistently an individual demonstrates these values in their daily work.";
    
    case 'performance_criteria':
      return basePrompt + "Identify the key performance indicators and success criteria. Generate questions that evaluate performance against these metrics from multiple perspectives.";
    
    default:
      return basePrompt + "Extract key themes, competencies, and expectations. Create comprehensive questions that assess these areas from multiple perspectives.";
  }
}

// Parse AI response to extract questions
function parseQuestionsFromAIResponse(aiResponse) {
  // This is a simplified parser - in production, you'd want more robust parsing
  const questions = [];
  
  // Try to find questions in the response
  // Look for numbered or bulleted items
  const lines = aiResponse.split('\n');
  
  let currentCategory = null;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if line is a category header
    if (trimmedLine.endsWith(':') && !trimmedLine.match(/^\d+\./)) {
      currentCategory = trimmedLine.replace(':', '').trim();
      continue;
    }
    
    // Check if line is a question (starts with number or dash/bullet)
    const questionMatch = trimmedLine.match(/^(\d+\.|\-|\*)\s+(.+)$/);
    if (questionMatch) {
      const questionText = questionMatch[2].trim();
      
      // Skip if it's too short to be a real question
      if (questionText.length < 10) continue;
      
      questions.push({
        text: questionText,
        category: currentCategory,
        type: questionText.endsWith('?') ? 'open_ended' : 'rating',
        required: true,
        order: questions.length + 1
      });
    }
  }
  
  // If we couldn't find structured questions, try to extract paragraphs
  if (questions.length === 0) {
    const paragraphs = aiResponse.split('\n\n');
    
    for (const paragraph of paragraphs) {
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      
      for (const sentence of sentences) {
        if (sentence.trim().endsWith('?') && sentence.length > 15) {
          questions.push({
            text: sentence.trim(),
            type: 'open_ended',
            required: true,
            order: questions.length + 1
          });
        }
      }
    }
  }
  
  return questions;
}

// Get all documents
exports.getAllDocuments = async (req, res) => {
  try {
    const documents = await Document.findAll({
      where: { uploadedBy: req.user.id },
      order: [['createdAt', 'DESC']]
    });
      
    res.status(200).json({
      count: documents.length,
      documents
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Failed to fetch documents', error: error.message });
  }
};

// Get document by ID
exports.getDocumentById = async (req, res) => {
  try {
    const document = await Document.findOne({ 
      where: {
        id: req.params.id,
        uploadedBy: req.user.id
      }
    });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    res.status(200).json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ message: 'Failed to fetch document', error: error.message });
  }
};

// Delete document
exports.deleteDocument = async (req, res) => {
  try {
    console.log('Delete document requested for ID:', req.params.id);
    console.log('User:', req.user && req.user.id);
    
    // First, check if document exists without filtering by uploadedBy
    const document = await Document.findOne({
      where: {
        id: req.params.id
      }
    });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // If document was uploaded to FluxAI and we have an API key, delete it there too
    if (document.fluxAiFileId && fluxAiConfig.isConfigured() && !document.fluxAiFileId.startsWith('dev-mode-')) {
      try {
        await axios.delete(`${fluxAiConfig.baseUrl}/v1/files/${document.fluxAiFileId}`, {
          headers: {
            'Authorization': `Bearer ${fluxAiConfig.apiKey}`
          }
        });
        console.log('Successfully deleted file from FluxAI:', document.fluxAiFileId);
      } catch (aiError) {
        console.error('Error deleting file from FluxAI:', aiError);
        // Continue with deletion even if FluxAI deletion fails
      }
    }
    
    // Delete local file if it exists
    if (document.path) {
      try {
        fs.unlinkSync(document.path);
        console.log('Successfully deleted local file:', document.path);
      } catch (fsError) {
        console.error('Error deleting local file:', fsError);
        // Continue with deletion even if file deletion fails
      }
    }
    
    // Delete the document from the database
    await document.destroy();
    console.log('Document deleted successfully from database');
    
    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Failed to delete document', error: error.message });
  }
};