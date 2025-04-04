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
    
    // Process each file - just store them, don't analyze
    for (const file of req.files) {
      // Create document record in database
      const document = await Document.create({
        filename: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        path: file.path,
        documentType,
        uploadedBy: req.user.id,
        status: 'uploaded' // Just mark as uploaded, not analyzed
      });
      
      uploadedDocuments.push(document);
    }

    res.status(201).json({
      message: 'Documents uploaded successfully and ready for template creation',
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

    // Find the documents
    const documents = await Document.findAll({
      where: { id: documentIds }
    });

    if (documents.length === 0) {
      return res.status(404).json({ message: 'No documents found with the provided IDs' });
    }

    // Start the analysis with the configured settings
    const analysisResult = await startDocumentAnalysis(documents, documentType, req.user.id, perspectiveSettings);
    
    // If we have a template from the analysis, update its metadata
    if (analysisResult && analysisResult.id) {
      await Template.update({
        name: name || analysisResult.name,
        description: description || analysisResult.description,
        purpose: purpose || '',
        department: department || '',
        perspectiveSettings: perspectiveSettings || analysisResult.perspectiveSettings
      }, {
        where: { id: analysisResult.id }
      });
      
      // Fetch the updated template
      const updatedTemplate = await Template.findByPk(analysisResult.id, {
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

// Development mode analysis (no API key needed)
async function startDevelopmentModeAnalysis(documents, documentType, userId) {
  try {
    console.log('Starting development mode analysis for document type:', documentType);
    
    // Update documents to show analysis in progress
    const documentIds = documents.map(doc => doc.id);
    
    // Generate a unique ID for each document
    for (const doc of documents) {
      if (!doc.fluxAiFileId) {
        await doc.update({
          status: 'analysis_in_progress',
          fluxAiFileId: 'dev-mode-' + uuidv4() // Generate a fake file ID
        });
      }
    }
    
    // Wait a moment to simulate actual API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Format the document type for the template name
    const formattedType = documentType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Generate mock questions based on document type
    const questions = generateMockQuestionsForDocumentType(documentType);
    
    console.log(`Creating template for ${formattedType} with ${questions.length} questions`);
    
    // Create a new template
    const template = await Template.create({
      name: `${formattedType} Template`,
      description: `Generated from ${documents.length} document(s)`,
      documentType,
      generatedBy: 'flux_ai',
      createdBy: userId,
      status: 'pending_review',
      perspectiveSettings: {
        manager: { questionCount: 10, enabled: true },
        peer: { questionCount: 10, enabled: true },
        direct_report: { questionCount: 10, enabled: true },
        self: { questionCount: 10, enabled: true },
        external: { questionCount: 5, enabled: false }
      }
    });
    
    console.log('Template created with ID:', template.id);
    
    // Create questions for the template
    const questionPromises = questions.map(async (q) => {
      try {
        return await Question.create({
          ...q,
          templateId: template.id
        });
      } catch (err) {
        console.error('Failed to create question:', err);
        throw err;
      }
    });
    
    await Promise.all(questionPromises);
    console.log(`${questions.length} questions created for template`);
    
    // Create source document references
    const sourceDocPromises = documents.map(async (doc) => {
      try {
        return await SourceDocument.create({
          fluxAiFileId: doc.fluxAiFileId || 'dev-mode-file',
          documentId: doc.id,
          templateId: template.id
        });
      } catch (err) {
        console.error('Failed to create source document reference:', err);
        throw err;
      }
    });
    
    await Promise.all(sourceDocPromises);
    console.log(`${documents.length} source document references created`);
    
    return template;
  } catch (error) {
    console.error('Error in development mode analysis:', error);
    
    // Update documents with error status
    const documentIds = documents.map(doc => doc.id);
    await Document.update(
      { status: 'analysis_failed', analysisError: error.message },
      { where: { id: documentIds } }
    );
    
    throw error; // Re-throw to ensure calling code knows about the error
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

// Updated startDocumentAnalysis function
async function startDocumentAnalysis(documents, documentType, userId, templateInfo = {}) {
  try {
    console.log('Starting document analysis for documents:', documents.length);
    
    // Skip processing if no valid documents
    if (!documents || documents.length === 0) {
      console.error('No documents provided for analysis');
      return;
    }
    
    // Build the URL from config
    const uploadUrl = `${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.files}`;

    const fileUploadPromises = documents.map(async (document) => {
      const filePath = document.path;
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error(`File not found at path: ${filePath}`);
        await document.update({
          status: 'analysis_failed',
          analysisError: 'File not found on server'
        });
        return null;
      }
      
      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      const allowedTypes = ['.pdf', '.txt', '.doc', '.docx']; // Expanded supported types
      
      if (!allowedTypes.includes(ext)) {
        console.error(`Unsupported file type: ${ext}. Only ${allowedTypes.join(', ')} are supported.`);
        await document.update({
          status: 'analysis_failed',
          analysisError: `Unsupported file type: ${ext}. Only ${allowedTypes.join(', ')} are supported.`
        });
        return null;
      }
      
      const formData = new FormData();
      console.log('Uploading file:', filePath);
  
      // IMPORTANT: Use "files" (plural) as the key name
      formData.append('files', fs.createReadStream(filePath));
      formData.append('tags', JSON.stringify([documentType, 'pulse360']));
  
      try {
        // Use X-API-KEY header as per documentation
        const response = await axios.post(uploadUrl, formData, {
          headers: {
            ...formData.getHeaders(),
            'X-API-KEY': fluxAiConfig.apiKey
          }
        });
    
        console.log('File upload response:', response.data);
    
        if (response.data.success && response.data.data && response.data.data.length > 0) {
          const uploadedFile = response.data.data[0];
          
          // Check if the specific file had an error
          if (!uploadedFile.success) {
            console.error(`File upload failed: ${uploadedFile.error}`);
            await document.update({
              status: 'analysis_failed',
              analysisError: uploadedFile.error || 'File upload failed'
            });
            return null;
          }
          
          await document.update({
            fluxAiFileId: uploadedFile.id,
            status: 'uploaded_to_ai'
          });
          return uploadedFile.id;
        } else {
          console.error('Unexpected file upload response:', response.data);
          throw new Error('No file ID received from Flux AI');
        }
      } catch (uploadError) {
        console.error('Error uploading file to Flux AI:', uploadError);
        await document.update({
          status: 'analysis_failed',
          analysisError: uploadError.message
        });
        return null;
      }
    });
    
    const fileIds = await Promise.all(fileUploadPromises);
    const validFileIds = fileIds.filter(id => id !== null);
    console.log('Valid File IDs:', validFileIds);
    
    if (validFileIds.length > 0) {
      // Pass template information to the analysis function
      return await analyzeDocumentsWithFluxAI(validFileIds, documentType, userId, documents, templateInfo);
    } else {
      console.error('No valid file IDs for analysis');
      await Document.update(
        { status: 'analysis_failed', analysisError: 'No files uploaded successfully' },
        { where: { id: documents.map(doc => doc.id) } }
      );
      return null;
    }
  } catch (error) {
    console.error('Error in startDocumentAnalysis:', error);
    await Document.update(
      { status: 'analysis_failed', analysisError: error.message },
      { where: { id: documents.map(doc => doc.id) } }
    );
    return null;
  }
}

function createAnalysisPrompt(documentType, templateInfo = {}) {
  // Extract template information if available
  const { name, description, purpose, department, perspectiveSettings } = templateInfo || {};
  
  // Base prompt with clear instructions and EXAMPLES
  const basePrompt = `Please analyze the attached document(s) and generate a comprehensive set of questions for a 360-degree feedback assessment.

I NEED YOU TO GENERATE SPECIFIC QUESTIONS FOR A 360-DEGREE FEEDBACK ASSESSMENT. DO NOT SUMMARIZE THE DOCUMENT OR PROVIDE GENERAL INFORMATION ABOUT LEADERSHIP. I NEED ACTUAL QUESTIONS.

FORMAT YOUR RESPONSE EXACTLY AS IN THE EXAMPLES BELOW:

MANAGER ASSESSMENT:
Question: How effectively does this person develop and articulate a clear vision for their team?
Type: rating
Category: Strategic Leadership

Question: How well does this person prioritize and align team objectives with organizational goals?
Type: rating
Category: Strategic Thinking

Question: What specific strengths have you observed in this person's leadership approach?
Type: open_ended
Category: Leadership Effectiveness

PEER ASSESSMENT:
Question: How effectively does this person collaborate across departments to achieve shared objectives?
Type: rating
Category: Collaboration

Question: How would you rate this person's ability to communicate complex ideas clearly?
Type: rating
Category: Communication

Question: What could this person do to be a more effective collaborator?
Type: open_ended
Category: Teamwork

DIRECT REPORT ASSESSMENT:
Question: How well does this person provide you with clear direction and guidance?
Type: rating
Category: Direction Setting

Question: How effectively does this person recognize and acknowledge your contributions?
Type: rating
Category: Recognition

Question: What specific actions could this person take to better support your professional development?
Type: open_ended
Category: Team Development

SELF ASSESSMENT:
Question: How effectively do you foster an environment where team members feel empowered to contribute ideas?
Type: rating
Category: Team Empowerment

Question: What do you consider to be your greatest leadership strength? Provide specific examples.
Type: open_ended
Category: Leadership Strengths

NOW FOLLOW THIS FORMAT AND GENERATE UNIQUE QUESTIONS FOR EACH PERSPECTIVE BASED ON THE DOCUMENT CONTENT.

PROVIDE QUESTIONS FOR THESE PERSPECTIVES:
- Manager Assessment (how the person is evaluated by their manager)
- Peer Assessment (how the person is evaluated by colleagues)
- Direct Report Assessment (how the person is evaluated by those reporting to them)
- Self Assessment (how the person evaluates themselves)
- External Assessment (how the person is evaluated by external stakeholders, if applicable)`;

  // Contextual information from the template settings
  let contextPrompt = '';
  if (purpose || department || name) {
    contextPrompt = `\n\nADDITIONAL CONTEXT:`;
    if (name) contextPrompt += `\n- Template Name: ${name}`;
    if (department) contextPrompt += `\n- Department/Function: ${department}`;
    if (purpose) contextPrompt += `\n- Purpose: ${purpose}`;
  }

  // Perspective-specific instructions
  let perspectivePrompt = '';
  if (perspectiveSettings) {
    perspectivePrompt = '\n\nQUESTION COUNT REQUIREMENTS:';
    Object.entries(perspectiveSettings).forEach(([perspective, settings]) => {
      if (settings.enabled) {
        const count = settings.questionCount || 10;
        perspectivePrompt += `\n- ${perspective.charAt(0).toUpperCase() + perspective.slice(1).replace('_', ' ')} Assessment: ${count} questions`;
      }
    });
  }

  // Document type specific instructions
  let typeSpecificPrompt = '';
  switch (documentType) {
    case 'leadership_model':
      typeSpecificPrompt = `\n\nFOCUS AREAS:
- Leadership qualities and behaviors described in the model
- Decision-making and strategic thinking
- Empowerment and delegation abilities
- Communication and influence skills
- Team development and coaching abilities`;
      break;
    
    case 'job_description':
      typeSpecificPrompt = `\n\nFOCUS AREAS:
- Key responsibilities and job functions
- Required skills and competencies
- Performance expectations
- Collaboration requirements
- Technical expertise relevant to the role`;
      break;
    
    case 'competency_framework':
      typeSpecificPrompt = `\n\nFOCUS AREAS:
- Core competencies from the framework
- Observable behaviors for each competency
- Skills application in different contexts
- Development opportunities
- Competency measurement criteria`;
      break;
    
    case 'company_values':
      typeSpecificPrompt = `\n\nFOCUS AREAS:
- Alignment with company values
- Demonstration of values in daily work
- Value-based decision making
- Promotion of values within teams
- Ethical considerations related to values`;
      break;
    
    case 'performance_criteria':
      typeSpecificPrompt = `\n\nFOCUS AREAS:
- Achievement against key performance indicators
- Quality and consistency of work
- Efficiency and productivity
- Goal attainment
- Performance improvement areas`;
      break;
    
    default:
      typeSpecificPrompt = `\n\nFOCUS AREAS:
- Key professional competencies
- Interpersonal and communication skills
- Task and project management
- Teamwork and collaboration
- Professional development areas`;
  }

  // Final reminder to focus on questions
  const finalReminder = `\n\nIMPORTANT: Your response should ONLY contain assessment questions organized by perspective. DO NOT include explanations, summaries, or general information about leadership. Generate unique, specific questions that reflect the content of the document.`;

  // Combine all prompt components
  return `${basePrompt}${typeSpecificPrompt}${contextPrompt}${perspectivePrompt}${finalReminder}`;
}

// Function to create a strong prompt for the AI
function createAnalysisPrompt(documentType, templateInfo = {}) {
  // Extract template information if available
  const { name, description, purpose, department, perspectiveSettings } = templateInfo || {};
  
  // Base prompt with clear instructions and EXAMPLES
  const basePrompt = `Please analyze the attached document(s) and generate a comprehensive set of questions for a 360-degree feedback assessment.

I NEED YOU TO GENERATE SPECIFIC QUESTIONS FOR A 360-DEGREE FEEDBACK ASSESSMENT. DO NOT SUMMARIZE THE DOCUMENT OR PROVIDE GENERAL INFORMATION ABOUT LEADERSHIP. I NEED ACTUAL QUESTIONS.

FORMAT YOUR RESPONSE EXACTLY AS IN THE EXAMPLES BELOW:

MANAGER ASSESSMENT:
Question: How effectively does this person develop and articulate a clear vision for their team?
Type: rating
Category: Strategic Leadership

Question: How well does this person prioritize and align team objectives with organizational goals?
Type: rating
Category: Strategic Thinking

Question: What specific strengths have you observed in this person's leadership approach?
Type: open_ended
Category: Leadership Effectiveness

PEER ASSESSMENT:
Question: How effectively does this person collaborate across departments to achieve shared objectives?
Type: rating
Category: Collaboration

Question: How would you rate this person's ability to communicate complex ideas clearly?
Type: rating
Category: Communication

Question: What could this person do to be a more effective collaborator?
Type: open_ended
Category: Teamwork

DIRECT REPORT ASSESSMENT:
Question: How well does this person provide you with clear direction and guidance?
Type: rating
Category: Direction Setting

Question: How effectively does this person recognize and acknowledge your contributions?
Type: rating
Category: Recognition

Question: What specific actions could this person take to better support your professional development?
Type: open_ended
Category: Team Development

SELF ASSESSMENT:
Question: How effectively do you foster an environment where team members feel empowered to contribute ideas?
Type: rating
Category: Team Empowerment

Question: What do you consider to be your greatest leadership strength? Provide specific examples.
Type: open_ended
Category: Leadership Strengths

NOW FOLLOW THIS FORMAT AND GENERATE UNIQUE QUESTIONS FOR EACH PERSPECTIVE BASED ON THE DOCUMENT CONTENT.

PROVIDE QUESTIONS FOR THESE PERSPECTIVES:
- Manager Assessment (how the person is evaluated by their manager)
- Peer Assessment (how the person is evaluated by colleagues)
- Direct Report Assessment (how the person is evaluated by those reporting to them)
- Self Assessment (how the person evaluates themselves)
- External Assessment (how the person is evaluated by external stakeholders, if applicable)`;

  // Contextual information from the template settings
  let contextPrompt = '';
  if (purpose || department || name) {
    contextPrompt = `\n\nADDITIONAL CONTEXT:`;
    if (name) contextPrompt += `\n- Template Name: ${name}`;
    if (department) contextPrompt += `\n- Department/Function: ${department}`;
    if (purpose) contextPrompt += `\n- Purpose: ${purpose}`;
  }

  // Perspective-specific instructions
  let perspectivePrompt = '';
  if (perspectiveSettings) {
    perspectivePrompt = '\n\nQUESTION COUNT REQUIREMENTS:';
    Object.entries(perspectiveSettings).forEach(([perspective, settings]) => {
      if (settings.enabled) {
        const count = settings.questionCount || 10;
        perspectivePrompt += `\n- ${perspective.charAt(0).toUpperCase() + perspective.slice(1).replace('_', ' ')} Assessment: ${count} questions`;
      }
    });
  }

  // Document type specific instructions
  let typeSpecificPrompt = '';
  switch (documentType) {
    case 'leadership_model':
      typeSpecificPrompt = `\n\nFOCUS AREAS:
- Leadership qualities and behaviors described in the model
- Decision-making and strategic thinking
- Empowerment and delegation abilities
- Communication and influence skills
- Team development and coaching abilities`;
      break;
    
    case 'job_description':
      typeSpecificPrompt = `\n\nFOCUS AREAS:
- Key responsibilities and job functions
- Required skills and competencies
- Performance expectations
- Collaboration requirements
- Technical expertise relevant to the role`;
      break;
    
    case 'competency_framework':
      typeSpecificPrompt = `\n\nFOCUS AREAS:
- Core competencies from the framework
- Observable behaviors for each competency
- Skills application in different contexts
- Development opportunities
- Competency measurement criteria`;
      break;
    
    case 'company_values':
      typeSpecificPrompt = `\n\nFOCUS AREAS:
- Alignment with company values
- Demonstration of values in daily work
- Value-based decision making
- Promotion of values within teams
- Ethical considerations related to values`;
      break;
    
    case 'performance_criteria':
      typeSpecificPrompt = `\n\nFOCUS AREAS:
- Achievement against key performance indicators
- Quality and consistency of work
- Efficiency and productivity
- Goal attainment
- Performance improvement areas`;
      break;
    
    default:
      typeSpecificPrompt = `\n\nFOCUS AREAS:
- Key professional competencies
- Interpersonal and communication skills
- Task and project management
- Teamwork and collaboration
- Professional development areas`;
  }

  // Final reminder to focus on questions
  const finalReminder = `\n\nIMPORTANT: Your response should ONLY contain assessment questions organized by perspective. DO NOT include explanations, summaries, or general information about leadership. Generate unique, specific questions that reflect the content of the document.`;

  // Combine all prompt components
  return `${basePrompt}${typeSpecificPrompt}${contextPrompt}${perspectivePrompt}${finalReminder}`;
}

// Function to parse questions from AI response
function parseQuestionsFromAIResponse(aiResponse) {
  // Check if aiResponse is undefined or empty
  if (!aiResponse) {
    console.log('AI response is empty or undefined, returning empty array');
    return [];
  }
  
  console.log('Parsing AI response for questions...');
  const questions = [];
  
  try {
    // First, try to identify perspective sections in the response
    const perspectivePatterns = {
      'manager': /manager assessment|manager perspective|manager feedback|manager evaluation/i,
      'peer': /peer assessment|peer perspective|peer feedback|peer evaluation|colleague/i,
      'direct_report': /direct report assessment|direct report perspective|direct report feedback|direct report evaluation|team member|subordinate/i,
      'self': /self assessment|self perspective|self feedback|self evaluation/i,
      'external': /external assessment|external perspective|external feedback|external evaluation|external stakeholder/i
    };
    
    // Split by perspective sections
    let currentPerspective = 'peer'; // Default perspective if none found
    let currentCategory = 'General';
    let questionCounter = 1;
    
    // Split response into lines for processing
    const lines = aiResponse.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Check if this line indicates a perspective section
      let foundPerspective = false;
      for (const [perspective, pattern] of Object.entries(perspectivePatterns)) {
        if (pattern.test(line)) {
          currentPerspective = perspective;
          foundPerspective = true;
          break;
        }
      }
      if (foundPerspective) continue;
      
      // Check if this line indicates a category
      if ((line.endsWith(':') || line.match(/^#+\s+.+$/)) && line.length < 100) {
        currentCategory = line.replace(/^#+\s+/, '').replace(':', '').trim();
        continue;
      }
      
      // Look for question patterns
      // 1. Lines with "Question:" format
      const questionPattern = /^(?:Question|Q)[:\.]?\s+(.+)$/i;
      const questionMatch = line.match(questionPattern);
      
      if (questionMatch) {
        const questionText = questionMatch[1].trim();
        
        // Look for type in the next line
        let questionType = 'rating';
        if (i + 1 < lines.length) {
          const typeLine = lines[i + 1].trim();
          if (typeLine.match(/^(?:Type|Question Type)[:\.]?\s+(.+)$/i)) {
            const typeMatch = typeLine.match(/^(?:Type|Question Type)[:\.]?\s+(.+)$/i);
            if (typeMatch && typeMatch[1]) {
              const typeText = typeMatch[1].toLowerCase().trim();
              if (typeText.includes('open') || typeText.includes('text') || typeText.includes('qualitative')) {
                questionType = 'open_ended';
              }
            }
          }
        }
        
        questions.push({
          text: questionText,
          category: currentCategory,
          type: questionType,
          perspective: currentPerspective,
          required: true,
          order: questionCounter++
        });
        continue;
      }
      
      // 2. Numbered or bulleted questions
      const listedQuestionMatch = line.match(/^(\d+\.|[-*•])?\s*(.+\?)$/);
      if (listedQuestionMatch) {
        const questionText = listedQuestionMatch[2].trim();
        if (questionText.length > 10) { // Minimum length to be considered a question
          questions.push({
            text: questionText,
            category: currentCategory,
            type: questionText.toLowerCase().includes('describe') || 
                  questionText.toLowerCase().includes('explain') || 
                  questionText.toLowerCase().includes('what are') ||
                  questionText.toLowerCase().includes('provide example') ? 'open_ended' : 'rating',
            perspective: currentPerspective,
            required: true,
            order: questionCounter++
          });
        }
        continue;
      }
      
      // 3. Any line that ends with a question mark and is sufficiently long
      if (line.endsWith('?') && line.length > 15 && !line.startsWith('#')) {
        questions.push({
          text: line,
          category: currentCategory,
          type: line.toLowerCase().includes('describe') || 
                line.toLowerCase().includes('explain') || 
                line.toLowerCase().includes('what are') ||
                line.toLowerCase().includes('provide example') ? 'open_ended' : 'rating',
          perspective: currentPerspective,
          required: true,
          order: questionCounter++
        });
      }
    }
    
    // If we still don't have enough questions, look for any sentences with question marks
    if (questions.length < 5) {
      console.log('Not enough structured questions found, searching for question sentences');
      const questionSentences = aiResponse.match(/[^.!?]+\?/g);
      if (questionSentences) {
        questionSentences.forEach(sentence => {
          const cleanedSentence = sentence.trim();
          if (cleanedSentence.length > 15 && !questions.some(q => q.text === cleanedSentence)) {
            questions.push({
              text: cleanedSentence,
              category: 'General',
              type: cleanedSentence.toLowerCase().includes('describe') || 
                    cleanedSentence.toLowerCase().includes('explain') ? 'open_ended' : 'rating',
              perspective: 'peer', // Default to peer for unstructured questions
              required: true,
              order: questionCounter++
            });
          }
        });
      }
    }
  } catch (error) {
    console.error('Error parsing AI response:', error);
    // Continue execution, will return empty questions
  }
  
  console.log(`Successfully parsed ${questions.length} questions from AI response`);
  return questions;
}

// Function to implement two-step approach for question generation
async function tryTwoStepQuestionGeneration(fileIds, documentType, templateInfo = {}) {
  try {
    console.log('Attempting two-step question generation approach...');
    // Step 1: Extract key themes from the document
    const extractThemesPrompt = `
    Analyze the attached document and extract 5-8 key leadership themes or competencies.
    Return ONLY a numbered list of themes with brief descriptions.
    Do not provide any additional explanations or analysis.
    `;

    const themesResponse = await axios.post(
      `${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.chat}`,
      {
        messages: [
          {
            role: "system",
            content: "You are an expert in document analysis. Extract only the key themes from the document without additional commentary."
          },
          {
            role: "user",
            content: extractThemesPrompt
          }
        ],
        stream: false,
        attachments: {
          tags: [documentType],
          files: fileIds
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': fluxAiConfig.apiKey
        }
      }
    );

    // Extract themes from response
    let themesText = "";
    if (themesResponse.data && 
        themesResponse.data.choices && 
        themesResponse.data.choices.length > 0) {
      
      const message = themesResponse.data.choices[0].message;
      
      if (typeof message === 'object' && message.content) {
        themesText = message.content;
      } else if (typeof message === 'string') {
        themesText = message;
      } else if (typeof themesResponse.data.choices[0].message === 'string') {
        themesText = themesResponse.data.choices[0].message;
      }
    }

    if (!themesText) {
      console.log('Failed to extract themes from document');
      return null;
    }

    console.log('Extracted themes:', themesText);

    // Step 2: Generate questions based on the extracted themes
    const generateQuestionsPrompt = `
    Based on the following themes extracted from a leadership document:
    
    ${themesText}
    
    Generate specific 360-degree feedback questions for the following perspectives:
    - Manager Assessment (4 questions)
    - Peer Assessment (4 questions)
    - Direct Report Assessment (4 questions)
    - Self Assessment (4 questions)
    
    Format each question exactly as follows:
    
    MANAGER ASSESSMENT:
    Question: [Question text]
    Type: [rating or open_ended]
    Category: [Category name]
    
    PEER ASSESSMENT:
    Question: [Question text]
    Type: [rating or open_ended]
    Category: [Category name]
    
    And so on for each perspective.
    
    Include both rating-scale questions and open-ended questions for each perspective.
    The questions should directly relate to the themes.
    DO NOT include any explanations or additional text.
    `;

    // Set additional context if available
    const { name, department, purpose } = templateInfo || {};
    let contextAddition = "";
    
    if (purpose || department || name) {
      contextAddition = `\n\nAdditional context:`;
      if (name) contextAddition += `\n- Template Name: ${name}`;
      if (department) contextAddition += `\n- Department/Function: ${department}`;
      if (purpose) contextAddition += `\n- Purpose: ${purpose}`;
    }

    const questionsResponse = await axios.post(
      `${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.chat}`,
      {
        messages: [
          {
            role: "system",
            content: "You are an expert in creating 360-degree feedback questions. Generate ONLY the questions in exactly the format requested. Do not provide any other explanations or text."
          },
          {
            role: "user",
            content: generateQuestionsPrompt + contextAddition
          }
        ],
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': fluxAiConfig.apiKey
        }
      }
    );

    // Extract questions from response
    let questionsText = "";
    if (questionsResponse.data && 
        questionsResponse.data.choices && 
        questionsResponse.data.choices.length > 0) {
      
      const message = questionsResponse.data.choices[0].message;
      
      if (typeof message === 'object' && message.content) {
        questionsText = message.content;
      } else if (typeof message === 'string') {
        questionsText = message;
      } else if (typeof questionsResponse.data.choices[0].message === 'string') {
        questionsText = questionsResponse.data.choices[0].message;
      }
    }

    if (!questionsText) {
      console.log('Failed to generate questions based on themes');
      return null;
    }

    console.log('Generated questions with two-step approach');
    return questionsText;
  } catch (error) {
    console.error('Error in two-step question generation:', error);
    return null;
  }
}

// Analyze documents with Flux AI (updated version)
async function analyzeDocumentsWithFluxAI(fileIds, documentType, userId, documents, templateInfo = {}) {
  try {
    console.log('Analyzing documents with Flux AI:');
    console.log('File IDs:', fileIds);
    console.log('Document Type:', documentType);
    
    // Validate file IDs
    if (!fileIds || fileIds.length === 0) {
      console.error('No valid file IDs for analysis');
      return createTemplateWithFallbackQuestions(documentType, userId, documents, templateInfo);
    }
    
    // Create a prompt based on document type and template info
    const prompt = createAnalysisPrompt(documentType, templateInfo);
    
    // Create messages array for the chat completion
    const messages = [
      {
        role: "system",
        content: "You are a specialized AI assistant for creating 360-degree feedback assessment questions. Your only job is to generate structured, relevant questions based on document analysis. DO NOT provide general explanations or summaries. ONLY generate specific feedback questions in the exact format requested."
      },
      {
        role: "user",
        content: prompt
      }
    ];
    
    // Wait for file processing
    console.log('Waiting for file processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // MATCH EXACTLY THE FORMAT FROM THE FLUX EXAMPLE
    const requestPayload = {
      messages: messages,
      stream: false,
      attachments: {
        tags: [documentType],
        files: fileIds
      }
    };
    
    console.log('Using exact example format:', JSON.stringify(requestPayload, null, 2));
    
    // Try all possible authentication methods
    let response = null;
    let authMethods = [
      // Method 1: X-API-KEY
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': fluxAiConfig.apiKey
        }
      },
      // Method 2: Bearer token
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${fluxAiConfig.apiKey}`
        }
      },
      // Method 3: No API-KEY prefix
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': fluxAiConfig.apiKey.replace('SHqQ4nah.', '')  // Remove potential prefix
        }
      }
    ];
    
    // Try each auth method
    for (let i = 0; i < authMethods.length; i++) {
      try {
        console.log(`Trying auth method ${i+1}`);
        response = await axios.post(
          `${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.chat}`, 
          requestPayload, 
          authMethods[i]
        );
        console.log(`Auth method ${i+1} succeeded!`);
        break;  // Stop if successful
      } catch (error) {
        console.log(`Auth method ${i+1} failed:`, error.message);
        if (i === authMethods.length - 1) {
          // If all methods fail, return fallback
          console.error('All authentication methods failed');
          return createTemplateWithFallbackQuestions(documentType, userId, documents, templateInfo);
        }
      }
    }
    
    // Process the response
    console.log('Analysis response:', response.data);
    
    // Extract the AI response text
    let aiResponseText = "";
    if (response.data && 
        response.data.choices && 
        response.data.choices.length > 0) {
      
      const message = response.data.choices[0].message;
      
      // Handle different response formats
      if (typeof message === 'object' && message.content) {
        aiResponseText = message.content;
      } else if (typeof message === 'string') {
        aiResponseText = message;
      } else if (typeof response.data.choices[0].message === 'string') {
        aiResponseText = response.data.choices[0].message;
      }
    }
    
    if (!aiResponseText) {
      console.log('Cannot extract response content from Flux AI, using fallback questions');
      return createTemplateWithFallbackQuestions(documentType, userId, documents, templateInfo);
    }
    
    // Check if AI indicates it can't see the document
    const cantSeeDocument = aiResponseText.includes("don't see any attached document") || 
                          aiResponseText.includes("I don't see any attached documents") ||
                          aiResponseText.includes("I don't see the attached document") ||
                          aiResponseText.includes("Could you please provide the document");
    
    if (cantSeeDocument) {
      console.log('AI reports not seeing the documents - using fallback questions');
      return createTemplateWithFallbackQuestions(documentType, userId, documents, templateInfo);
    }
    
    console.log('AI seems to have analyzed the document successfully!');
    
    // Create a new template
    const name = templateInfo?.name || `${documentType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Template`;
    const description = templateInfo?.description || 'Generated from document analysis';
    const perspectiveSettings = templateInfo?.perspectiveSettings || {
      manager: { questionCount: 10, enabled: true },
      peer: { questionCount: 10, enabled: true },
      direct_report: { questionCount: 10, enabled: true },
      self: { questionCount: 10, enabled: true },
      external: { questionCount: 5, enabled: false }
    };
    
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
    
    // Parse questions from AI response
    const questions = parseQuestionsFromAIResponse(aiResponseText);
    
    // Check if we have enough relevant questions
    if (questions.length < 5) {
      console.log('Not enough relevant questions generated in first attempt, trying two-step approach');
      
      // Try the two-step approach
      const twoStepResponse = await tryTwoStepQuestionGeneration(fileIds, documentType, templateInfo);
      
      // If we got a response, try to parse questions from it
      if (twoStepResponse) {
        const twoStepQuestions = parseQuestionsFromAIResponse(twoStepResponse);
        
        // If we found questions, use them instead of fallback
        if (twoStepQuestions && twoStepQuestions.length >= 5) {
          console.log(`Found ${twoStepQuestions.length} questions using two-step approach`);
          
          // Create questions for the template using the two-step result
          await Promise.all(
            twoStepQuestions.map(async (q) => {
              return Question.create({
                ...q,
                templateId: template.id
              });
            })
          );
          
          // Skip to the next steps (creating source documents, etc.)
          console.log('Successfully created questions using two-step approach');
          
          // Create source document references
          await Promise.all(
            documents.map(async (doc) => {
              return SourceDocument.create({
                fluxAiFileId: doc.fluxAiFileId,
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
            { where: { id: documents.map(doc => doc.id) } }
          );
          
          console.log('Template created with ID:', template.id);
          return template;
        }
      }
      
      console.log('Two-step approach failed or did not generate enough questions, using fallback questions');
      const fallbackQuestions = generateFallbackQuestions(documentType, templateInfo.perspectiveSettings);
      
      // Add any AI-generated questions we did get to the mix
      const combinedQuestions = [...questions, ...fallbackQuestions.slice(0, Math.max(15 - questions.length, 0))];
      
      // Create questions for the template
      await Promise.all(
        combinedQuestions.map(async (q) => {
          return Question.create({
            ...q,
            templateId: template.id
          });
        })
      );
    } else {
      // We have enough questions from the first attempt, create them
      console.log(`Creating ${questions.length} questions from first AI response`);
      await Promise.all(
        questions.map(async (q) => {
          return Question.create({
            ...q,
            templateId: template.id
          });
        })
      );
    }
    
    // Create source document references
    await Promise.all(
      documents.map(async (doc) => {
        return SourceDocument.create({
          fluxAiFileId: doc.fluxAiFileId,
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
      { where: { id: documents.map(doc => doc.id) } }
    );
    
    console.log('Template created with ID:', template.id);
    return template;
  } catch (error) {
    console.error('Full error details:', error.message);
    
    // Check for specific errors that might occur
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      // If there's a specific error about mode, log it
      if (error.response.data && error.response.data.error) {
        console.error('API Error:', error.response.data.error);
      }
    }
    
    // Create fallback template
    return createTemplateWithFallbackQuestions(documentType, userId, documents, templateInfo);
  }
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
    
    // Import required models
    const { Document, SourceDocument, Template } = require('../models');
    const fluxAiConfig = require('../config/flux-ai');
    const fs = require('fs');
    
    // First, check if document exists without filtering by uploadedBy
    const document = await Document.findByPk(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Check if the document is referenced by any templates
    const sourceDocuments = await SourceDocument.findAll({
      where: { documentId: document.id }
    });
    
    // If document is referenced by templates, delete those references first
    if (sourceDocuments && sourceDocuments.length > 0) {
      console.log(`Found ${sourceDocuments.length} references to this document in source_documents table`);
      for (const sourceDoc of sourceDocuments) {
        console.log(`Deleting source document reference: ${sourceDoc.id}`);
        await sourceDoc.destroy();
      }
    }
    
    // If document was uploaded to FluxAI and we have an API key, delete it there too
    if (document.fluxAiFileId && fluxAiConfig.isConfigured() && !document.fluxAiFileId.startsWith('dev-mode-')) {
      try {
        const axios = require('axios');
        // Use the correct endpoint from the documentation: /v1/files/{file_id}
        await axios.delete(`${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.files}/${document.fluxAiFileId}`, {
          headers: {
            'X-API-KEY': fluxAiConfig.apiKey  // Use X-API-KEY as per documentation
          }
        });
        console.log('Successfully deleted file from FluxAI:', document.fluxAiFileId);
      } catch (aiError) {
        console.error('Error deleting file from FluxAI:', aiError);
        // Continue with deletion even if FluxAI deletion fails
      }
    }
    
    // Delete local file if it exists (use try/catch for robustness)
    if (document.path) {
      try {
        if (fs.existsSync(document.path)) {
          fs.unlinkSync(document.path);
          console.log('Successfully deleted local file:', document.path);
        } else {
          console.log('Local file not found (already deleted):', document.path);
        }
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

// Function to generate fallback questions
function generateFallbackQuestions(documentType = '', perspectiveSettings = null) {
  // Get active perspectives
  const activePerspectives = [];
  
  if (perspectiveSettings) {
    Object.entries(perspectiveSettings).forEach(([perspective, settings]) => {
      if (settings.enabled) {
        activePerspectives.push(perspective);
      }
    });
  }
  
  // If no active perspectives defined, use defaults
  if (activePerspectives.length === 0) {
    activePerspectives.push('manager', 'peer', 'direct_report', 'self');
  }
  
  const fallbackQuestions = [];
  let questionCounter = 1;
  
  // Generic fallback questions for each active perspective
  activePerspectives.forEach(perspective => {
    // Add common questions
    if (perspective === 'self') {
      fallbackQuestions.push(
        {
          text: "How effectively do you communicate with team members?",
          type: "rating",
          category: "Communication",
          perspective: perspective,
          required: true,
          order: questionCounter++
        },
        {
          text: "What do you consider to be your key strengths? Please provide specific examples.",
          type: "open_ended",
          category: "Strengths",
          perspective: perspective,
          required: true,
          order: questionCounter++
        },
        {
          text: "In what areas could you improve? Please be specific.",
          type: "open_ended",
          category: "Development Areas",
          perspective: perspective,
          required: true,
          order: questionCounter++
        }
      );
    } else {
      fallbackQuestions.push(
        {
          text: perspective === 'manager' 
            ? "How effectively does this person communicate with the team?"
            : perspective === 'direct_report'
              ? "How effectively does this person communicate with you and others?"
              : "How effectively does this person communicate with team members?",
          type: "rating",
          category: "Communication",
          perspective: perspective,
          required: true,
          order: questionCounter++
        },
        {
          text: "What are this person's key strengths? Please provide specific examples.",
          type: "open_ended",
          category: "Strengths",
          perspective: perspective,
          required: true,
          order: questionCounter++
        },
        {
          text: "In what areas could this person improve? Please be specific and constructive.",
          type: "open_ended",
          category: "Development Areas",
          perspective: perspective,
          required: true,
          order: questionCounter++
        }
      );
    }

    // Add document-type specific questions
    switch (documentType) {
      case 'leadership_model':
        addLeadershipModelFallbackQuestions(fallbackQuestions, perspective, questionCounter);
        questionCounter += 3;
        break;
      case 'job_description':
        addJobDescriptionFallbackQuestions(fallbackQuestions, perspective, questionCounter);
        questionCounter += 3;
        break;
      case 'competency_framework':
        addCompetencyFrameworkFallbackQuestions(fallbackQuestions, perspective, questionCounter);
        questionCounter += 3;
        break;
      case 'company_values':
        addCompanyValuesFallbackQuestions(fallbackQuestions, perspective, questionCounter);
        questionCounter += 3;
        break;
      case 'performance_criteria':
        addPerformanceCriteriaFallbackQuestions(fallbackQuestions, perspective, questionCounter);
        questionCounter += 3;
        break;
      default:
        addGenericFallbackQuestions(fallbackQuestions, perspective, questionCounter);
        questionCounter += 3;
        break;
    }
  });
  
  return fallbackQuestions;
}

// This implements a two-step approach if the first attempt fails
async function tryTwoStepQuestionGeneration(fileIds, documentType, templateInfo = {}) {
  try {
    console.log('Attempting two-step question generation approach...');
    // Step 1: Extract key themes from the document
    const extractThemesPrompt = `
    Analyze the attached document and extract 5-8 key leadership themes or competencies.
    Return ONLY a numbered list of themes with brief descriptions.
    Do not provide any additional explanations or analysis.
    `;

    const themesResponse = await axios.post(
      `${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.chat}`,
      {
        messages: [
          {
            role: "system",
            content: "You are an expert in document analysis. Extract only the key themes from the document without additional commentary."
          },
          {
            role: "user",
            content: extractThemesPrompt
          }
        ],
        stream: false,
        attachments: {
          tags: [documentType],
          files: fileIds
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': fluxAiConfig.apiKey
        }
      }
    );

    // Extract themes from response
    let themesText = "";
    if (themesResponse.data && 
        themesResponse.data.choices && 
        themesResponse.data.choices.length > 0) {
      
      const message = themesResponse.data.choices[0].message;
      
      if (typeof message === 'object' && message.content) {
        themesText = message.content;
      } else if (typeof message === 'string') {
        themesText = message;
      } else if (typeof themesResponse.data.choices[0].message === 'string') {
        themesText = themesResponse.data.choices[0].message;
      }
    }

    if (!themesText) {
      console.log('Failed to extract themes from document');
      return null;
    }

    console.log('Extracted themes:', themesText);

    // Step 2: Generate questions based on the extracted themes
    const generateQuestionsPrompt = `
    Based on the following themes extracted from a leadership document:
    
    ${themesText}
    
    Generate specific 360-degree feedback questions for the following perspectives:
    - Manager Assessment (4 questions)
    - Peer Assessment (4 questions)
    - Direct Report Assessment (4 questions)
    - Self Assessment (4 questions)
    
    Format each question exactly as follows:
    
    MANAGER ASSESSMENT:
    Question: [Question text]
    Type: [rating or open_ended]
    Category: [Category name]
    
    PEER ASSESSMENT:
    Question: [Question text]
    Type: [rating or open_ended]
    Category: [Category name]
    
    And so on for each perspective.
    
    Include both rating-scale questions and open-ended questions for each perspective.
    The questions should directly relate to the themes.
    DO NOT include any explanations or additional text.
    `;

    // Set additional context if available
    const { name, department, purpose } = templateInfo || {};
    let contextAddition = "";
    
    if (purpose || department || name) {
      contextAddition = `\n\nAdditional context:`;
      if (name) contextAddition += `\n- Template Name: ${name}`;
      if (department) contextAddition += `\n- Department/Function: ${department}`;
      if (purpose) contextAddition += `\n- Purpose: ${purpose}`;
    }

    const questionsResponse = await axios.post(
      `${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.chat}`,
      {
        messages: [
          {
            role: "system",
            content: "You are an expert in creating 360-degree feedback questions. Generate ONLY the questions in exactly the format requested. Do not provide any other explanations or text."
          },
          {
            role: "user",
            content: generateQuestionsPrompt + contextAddition
          }
        ],
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': fluxAiConfig.apiKey
        }
      }
    );

    // Extract questions from response
    let questionsText = "";
    if (questionsResponse.data && 
        questionsResponse.data.choices && 
        questionsResponse.data.choices.length > 0) {
      
      const message = questionsResponse.data.choices[0].message;
      
      if (typeof message === 'object' && message.content) {
        questionsText = message.content;
      } else if (typeof message === 'string') {
        questionsText = message;
      } else if (typeof questionsResponse.data.choices[0].message === 'string') {
        questionsText = questionsResponse.data.choices[0].message;
      }
    }

    if (!questionsText) {
      console.log('Failed to generate questions based on themes');
      return null;
    }

    console.log('Generated questions with two-step approach');
    return questionsText;
  } catch (error) {
    console.error('Error in two-step question generation:', error);
    return null;
  }
}

// Add these helper functions for the fallback questions by document type
// Place these functions after the generateFallbackQuestions function

function addLeadershipModelFallbackQuestions(questions, perspective, startOrder) {
  let order = startOrder;
  
  if (perspective === 'manager') {
    questions.push(
      {
        text: "How effectively does this person demonstrate strategic thinking?",
        type: "rating",
        category: "Strategic Thinking",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person develop team members?",
        type: "rating",
        category: "Talent Development",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person make decisions?",
        type: "rating",
        category: "Decision Making",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'peer') {
    questions.push(
      {
        text: "How well does this person collaborate across teams?",
        type: "rating",
        category: "Collaboration",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate this person's ability to influence without authority?",
        type: "rating",
        category: "Influence",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person handle conflicts?",
        type: "rating",
        category: "Conflict Resolution",
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
        text: "How well does this person support your professional development?",
        type: "rating",
        category: "Development Support",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'self') {
    questions.push(
      {
        text: "How effectively do you communicate vision and strategy?",
        type: "rating",
        category: "Vision",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well do you develop and empower your team members?",
        type: "rating",
        category: "Team Development",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate your ability to make difficult decisions?",
        type: "rating",
        category: "Decision Making",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  }
}

function addJobDescriptionFallbackQuestions(questions, perspective, startOrder) {
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
        text: "How well does this person demonstrate the technical skills required for their role?",
        type: "rating",
        category: "Technical Skills",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate this person's productivity and efficiency?",
        type: "rating",
        category: "Productivity",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'peer') {
    questions.push(
      {
        text: "How effectively does this person fulfill their role when working with you?",
        type: "rating",
        category: "Role Fulfillment",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate this person's technical skills in your collaborative work?",
        type: "rating",
        category: "Technical Skills",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person meet deadlines in shared projects?",
        type: "rating",
        category: "Timeliness",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'direct_report') {
    questions.push(
      {
        text: "How well does this person support you in achieving your job responsibilities?",
        type: "rating",
        category: "Job Support",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How clearly does this person communicate expectations to you?",
        type: "rating",
        category: "Expectation Setting",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person provide technical guidance when needed?",
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
        text: "How effectively do you fulfill the core responsibilities of your role?",
        type: "rating",
        category: "Job Performance",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate your efficiency and quality of work?",
        type: "rating",
        category: "Work Quality",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well do you apply your technical skills to your role?",
        type: "rating",
        category: "Technical Application",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  }
}

function addCompetencyFrameworkFallbackQuestions(questions, perspective, startOrder) {
  let order = startOrder;
  
  if (perspective === 'manager') {
    questions.push(
      {
        text: "How well does this person demonstrate problem-solving abilities?",
        type: "rating",
        category: "Problem Solving",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "Rate this person's ability to innovate and bring new ideas.",
        type: "rating",
        category: "Innovation",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person apply their expertise to achieve results?",
        type: "rating",
        category: "Expertise Application",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'peer') {
    questions.push(
      {
        text: "How effectively does this person collaborate with you and others?",
        type: "rating",
        category: "Collaboration",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person adapt to changing priorities and requirements?",
        type: "rating",
        category: "Adaptability",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate this person's ability to communicate complex information?",
        type: "rating",
        category: "Communication",
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
        text: "How effectively does this person help you solve problems?",
        type: "rating",
        category: "Problem Solving Support",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate this person's ability to give constructive feedback?",
        type: "rating",
        category: "Feedback",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'self') {
    questions.push(
      {
        text: "How would you rate your ability to solve complex problems?",
        type: "rating",
        category: "Problem Solving",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively do you collaborate with others across the organization?",
        type: "rating",
        category: "Collaboration",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well do you adapt to changing priorities and environments?",
        type: "rating",
        category: "Adaptability",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  }
}

function addCompanyValuesFallbackQuestions(questions, perspective, startOrder) {
  let order = startOrder;
  
  if (perspective === 'manager') {
    questions.push(
      {
        text: "How well does this person embody our company values in their leadership approach?",
        type: "rating",
        category: "Values Alignment",
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
        text: "How would you rate this person's commitment to our organizational mission?",
        type: "rating",
        category: "Mission Alignment",
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
        category: "Values Alignment",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate this person's integrity and ethical behavior?",
        type: "rating",
        category: "Ethics",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person showcase our values in challenging situations?",
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
        category: "Values Alignment",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person create an inclusive environment that respects diversity?",
        type: "rating",
        category: "Inclusion",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person recognize behaviors that align with our values?",
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
        text: "How well do you foster an inclusive environment that respects diversity?",
        type: "rating",
        category: "Inclusion",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively do you promote our company values with your colleagues?",
        type: "rating",
        category: "Values Advocacy",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  }
}

function addPerformanceCriteriaFallbackQuestions(questions, perspective, startOrder) {
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
        text: "How effectively does this person take initiative and drive results?",
        type: "rating",
        category: "Initiative",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate the quality and consistency of this person's work?",
        type: "rating",
        category: "Work Quality",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'peer') {
    questions.push(
      {
        text: "How effectively does this person contribute to team goals and outcomes?",
        type: "rating",
        category: "Team Contribution",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person meet deadlines when working with you?",
        type: "rating",
        category: "Timeliness",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate the quality of this person's contributions to shared projects?",
        type: "rating",
        category: "Contribution Quality",
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
        text: "How effectively does this person provide feedback on your performance?",
        type: "rating",
        category: "Feedback Quality",
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
        text: "How well do you prioritize and manage your time?",
        type: "rating",
        category: "Time Management",
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

function addGenericFallbackQuestions(questions, perspective, startOrder) {
  let order = startOrder;
  
  if (perspective === 'manager') {
    questions.push(
      {
        text: "How well does this person demonstrate accountability for their work?",
        type: "rating",
        category: "Accountability",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How effectively does this person contribute to team goals?",
        type: "rating",
        category: "Team Contribution",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate this person's problem-solving abilities?",
        type: "rating",
        category: "Problem Solving",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'peer') {
    questions.push(
      {
        text: "How effectively does this person work with others on the team?",
        type: "rating",
        category: "Teamwork",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate this person's ability to adapt to change?",
        type: "rating",
        category: "Adaptability",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person share information and knowledge?",
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
        text: "How effectively does this person provide clear direction and guidance?",
        type: "rating",
        category: "Leadership",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well does this person listen to your ideas and concerns?",
        type: "rating",
        category: "Listening",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate this person's ability to provide helpful feedback?",
        type: "rating",
        category: "Feedback",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  } else if (perspective === 'self') {
    questions.push(
      {
        text: "How effectively do you manage your tasks and responsibilities?",
        type: "rating",
        category: "Task Management",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How well do you work with others on the team?",
        type: "rating",
        category: "Teamwork",
        perspective: perspective,
        required: true,
        order: order++
      },
      {
        text: "How would you rate your ability to adapt to new situations?",
        type: "rating",
        category: "Adaptability",
        perspective: perspective,
        required: true,
        order: order++
      }
    );
  }
}

// Function to create template with fallback questions
async function createTemplateWithFallbackQuestions(documentType, userId, documents, templateInfo = {}) {
  try {
    console.log('Creating template with fallback questions');
    
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
    
    // Generate fallback questions - enhanced to use template info
    const fallbackQuestions = generateFallbackQuestions(documentType, templateInfo.perspectiveSettings);
    
    // Create questions for the template
    await Promise.all(
      fallbackQuestions.map(async (q) => {
        return Question.create({
          ...q,
          templateId: template.id
        });
      })
    );
    
    // Create source document references
    await Promise.all(
      documents.map(async (doc) => {
        return SourceDocument.create({
          fluxAiFileId: doc.fluxAiFileId,
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
      { where: { id: documents.map(doc => doc.id) } }
    );
    
    console.log('Fallback template created:', template.id);
    return template;
  } catch (fallbackError) {
    console.error('Error creating fallback template:', fallbackError);
    
    // Update documents with error status
    const documentIds = documents.map(doc => doc.id);
    await Document.update(
      { status: 'analysis_failed', analysisError: fallbackError.message },
      { where: { id: documentIds } }
    );
    
    throw fallbackError;
  }
}

// Run it manually for testing API connectivity

// Test Flux AI API connectivity
exports.testFluxAiApi = async (req, res) => {
  try {
    const axios = require('axios');
    const fluxAiConfig = require('../config/flux-ai');
    
    console.log('Testing Flux AI API connectivity...');
    
    // First, try to get available models
    let modelsResponse;
    try {
      modelsResponse = await axios.get(
        `${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.llms}`,
        {
          headers: {
            'X-API-KEY': fluxAiConfig.apiKey
          }
        }
      );
      console.log('Models API response:', modelsResponse.data);
    } catch (modelsError) {
      console.error('Models API error:', modelsError.message);
      
      // Try with different auth
      try {
        modelsResponse = await axios.get(
          `${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.llms}`,
          {
            headers: {
              'Authorization': `Bearer ${fluxAiConfig.apiKey}`
            }
          }
        );
        console.log('Models API response with Bearer auth:', modelsResponse.data);
      } catch (bearerError) {
        console.error('Models API error with Bearer auth:', bearerError.message);
      }
    }
    
    // Second, try to get balance
    let balanceResponse;
    try {
      balanceResponse = await axios.get(
        `${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.balance}`,
        {
          headers: {
            'X-API-KEY': fluxAiConfig.apiKey
          }
        }
      );
      console.log('Balance API response:', balanceResponse.data);
    } catch (balanceError) {
      console.error('Balance API error:', balanceError.message);
      
      // Try with different auth
      try {
        balanceResponse = await axios.get(
          `${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.balance}`,
          {
            headers: {
              'Authorization': `Bearer ${fluxAiConfig.apiKey}`
            }
          }
        );
        console.log('Balance API response with Bearer auth:', balanceResponse.data);
      } catch (bearerError) {
        console.error('Balance API error with Bearer auth:', bearerError.message);
      }
    }
    
    // Third, make a simple chat request without files
    let chatResponse;
    try {
      chatResponse = await axios.post(
        `${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.chat}`,
        {
          messages: [
            {
              role: "user",
              content: "Hello, can you tell me how to attach files to API requests?"
            }
          ],
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': fluxAiConfig.apiKey
          }
        }
      );
      console.log('Chat API response:', chatResponse.data);
    } catch (chatError) {
      console.error('Chat API error:', chatError.message);
      
      // Try with different auth
      try {
        chatResponse = await axios.post(
          `${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.chat}`,
          {
            messages: [
              {
                role: "user",
                content: "Hello, can you tell me how to attach files to API requests?"
              }
            ],
            stream: false
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${fluxAiConfig.apiKey}`
            }
          }
        );
        console.log('Chat API response with Bearer auth:', chatResponse.data);
      } catch (bearerError) {
        console.error('Chat API error with Bearer auth:', bearerError.message);
      }
    }
    
    // Return results
    res.status(200).json({
      message: 'API test completed',
      endpoints: {
        models: modelsResponse?.data || null,
        balance: balanceResponse?.data || null,
        chat: chatResponse?.data || null
      }
    });
  } catch (error) {
    console.error('API test error:', error);
    res.status(500).json({ 
      message: 'API test failed', 
      error: error.message 
    });
  }
};

// Mark documents as ready for template creation (development mode)
exports.markDocumentsReady = async (req, res) => {
  try {
    const { documentIds } = req.body;
    
    if (!documentIds || !documentIds.length) {
      return res.status(400).json({ message: 'Document IDs are required' });
    }
    
    console.log('Marking documents as ready:', documentIds);
    
    // Update documents to analysis_complete status
    await Document.update(
      { 
        status: 'analysis_complete',
        fluxAiFileId: 'dev-mode-' + uuidv4() // Generate a fake file ID
      },
      { where: { id: documentIds } }
    );
    
    res.status(200).json({ 
      success: true,
      message: 'Documents marked as ready for template creation',
      documentIds
    });
  } catch (error) {
    console.error('Error marking documents as ready:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to mark documents as ready', 
      error: error.message 
    });
  }
};

// Mark documents as ready for template creation (development mode)
exports.markDocumentsReady = async (req, res) => {
  try {
    const { documentIds } = req.body;
    
    if (!documentIds || !documentIds.length) {
      return res.status(400).json({ message: 'Document IDs are required' });
    }
    
    console.log('Marking documents as ready:', documentIds);
    
    // Update documents to analysis_complete status
    await Document.update(
      { 
        status: 'analysis_complete',
        fluxAiFileId: 'dev-mode-' + uuidv4() // Generate a fake file ID
      },
      { where: { id: documentIds } }
    );
    
    res.status(200).json({ 
      success: true,
      message: 'Documents marked as ready for template creation',
      documentIds
    });
  } catch (error) {
    console.error('Error marking documents as ready:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to mark documents as ready', 
      error: error.message 
    });
  }
};

exports.startDevelopmentModeAnalysis = startDevelopmentModeAnalysis;
exports.startDocumentAnalysis = startDocumentAnalysis;
exports.generateMockQuestionsForDocumentType = generateMockQuestionsForDocumentType;