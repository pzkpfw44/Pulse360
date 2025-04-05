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
      { 
        status: 'analysis_complete'
      },
      { where: { id: documents.map(doc => doc.id) } }
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
  
  // Enhanced base prompt with stronger emphasis on template metadata
  const basePrompt = `Please analyze the attached document(s) and generate a comprehensive set of questions for a 360-degree feedback assessment.

I NEED YOU TO GENERATE SPECIFIC QUESTIONS FOR A 360-DEGREE FEEDBACK ASSESSMENT${purpose ? ` FOR ${purpose.toUpperCase()}` : ''}${department ? ` IN THE ${department.toUpperCase()} DEPARTMENT` : ''}.

${description ? `THE ASSESSMENT FOCUS IS: ${description.toUpperCase()}\n\n` : ''}

DO NOT SUMMARIZE THE DOCUMENT OR PROVIDE GENERAL INFORMATION ABOUT LEADERSHIP. I NEED ACTUAL QUESTIONS.

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

  // Contextual information from the template settings - Enhanced with more specific wording
  let contextPrompt = '';
  if (purpose || department || name) {
    contextPrompt = `\n\nIMPORTANT CONTEXT TO INCORPORATE INTO QUESTIONS:`;
    if (name) contextPrompt += `\n- Assessment Name: ${name}`;
    if (department) contextPrompt += `\n- Department/Function: ${department} (Make questions specific to this department)`;
    if (purpose) contextPrompt += `\n- Purpose: ${purpose} (Tailor questions to assess this role/purpose)`;
    if (description) contextPrompt += `\n- Focus Areas: ${description} (Questions should assess these specific areas)`;
  }

  // Perspective-specific instructions - more detailed about question counts
  let perspectivePrompt = '';
  if (perspectiveSettings) {
    perspectivePrompt = '\n\nGENERATE EXACTLY THIS MANY QUESTIONS FOR EACH PERSPECTIVE:';
    Object.entries(perspectiveSettings).forEach(([perspective, settings]) => {
      if (settings.enabled) {
        const count = settings.questionCount || 10;
        perspectivePrompt += `\n- ${perspective.charAt(0).toUpperCase() + perspective.slice(1).replace('_', ' ')} Assessment: ${count} questions (${Math.ceil(count * 0.7)} rating questions and ${Math.floor(count * 0.3)} open-ended questions)`;
      } else {
        perspectivePrompt += `\n- ${perspective.charAt(0).toUpperCase() + perspective.slice(1).replace('_', ' ')} Assessment: SKIP (not required)`;
      }
    });
  }

  // Document type specific instructions - enhanced with more guidance
  let typeSpecificPrompt = '';
  switch (documentType) {
    case 'leadership_model':
      typeSpecificPrompt = `\n\nFOCUS AREAS FOR ${department || 'LEADERSHIP'} MODEL QUESTIONS:
- Leadership qualities and behaviors described in the model
- Vision-setting and strategic thinking for ${department || 'the organization'}
- Team development and empowerment${purpose ? ` for ${purpose}` : ''}
- Communication and influence skills needed for ${department || 'leadership roles'}
- Decision-making processes and effectiveness
- Change management and adaptability`;
      break;
    
    case 'job_description':
      typeSpecificPrompt = `\n\nFOCUS AREAS FOR ${purpose || 'JOB DESCRIPTION'} QUESTIONS:
- Key responsibilities and job functions specific to ${department || 'this role'}
- Required skills and competencies for success${purpose ? ` as ${purpose}` : ''}
- Performance expectations and deliverables
- Collaboration requirements with other roles/teams
- Technical expertise relevant to ${department || 'the role'}
- Problem-solving and decision-making within role scope`;
      break;
    
    // Add similar enhancements for other document types
    case 'competency_framework':
      typeSpecificPrompt = `\n\nFOCUS AREAS FOR COMPETENCY FRAMEWORK QUESTIONS:
- Core competencies from the framework specific to ${department || 'this organization'}
- Observable behaviors for each competency${purpose ? ` relevant to ${purpose}` : ''}
- Skills application in different contexts and situations
- Development opportunities for each competency area
- Competency measurement criteria and success indicators
- Gaps between current and desired competency levels`;
      break;
    
    case 'company_values':
      typeSpecificPrompt = `\n\nFOCUS AREAS FOR COMPANY VALUES QUESTIONS:
- Alignment with company values in daily work
- Demonstration of values in interactions with ${department ? `the ${department} team` : 'teams'}
- Value-based decision making${purpose ? ` for ${purpose}` : ''}
- Promotion of values within teams and across the organization
- Ethical considerations related to values
- Living the values during challenging situations`;
      break;
    
    case 'performance_criteria':
      typeSpecificPrompt = `\n\nFOCUS AREAS FOR PERFORMANCE CRITERIA QUESTIONS:
- Achievement against key performance indicators for ${department || 'this role'}
- Quality and consistency of work output${purpose ? ` as ${purpose}` : ''}
- Efficiency and productivity metrics
- Goal attainment and objective completion
- Performance improvement areas and growth potential
- Balance between short-term results and long-term development`;
      break;
    
    default:
      typeSpecificPrompt = `\n\nFOCUS AREAS FOR QUESTIONS:
- Key professional competencies for ${department || 'this role'}
- Interpersonal and communication skills${purpose ? ` needed for ${purpose}` : ''}
- Task and project management effectiveness
- Teamwork and collaboration capabilities
- Professional development areas
- Overall performance and contribution`;
  }

  // Final reminder to focus on questions - more specific about quality
  const finalReminder = `\n\nIMPORTANT: Your response should ONLY contain assessment questions organized by perspective. DO NOT include explanations, summaries, or general information about leadership. Generate unique, specific questions that:
1. Directly relate to the content of the document
2. Are tailored to ${department || 'the organization'}'s context
3. Are specific to ${purpose || 'the role'} being assessed
4. Follow best practices for 360-degree feedback (behavioral, actionable, specific)
5. Include both strengths assessment and development opportunities

REMINDER ON FORMAT: For each perspective (MANAGER ASSESSMENT, PEER ASSESSMENT, etc.), provide questions in this exact format:
Question: [Your question text here]
Type: [rating or open_ended]
Category: [The category/theme of the question]

Do not include any other text, explanations, or formats. Only use the example format.`;

  // Combine all prompt components
  return `${basePrompt}${typeSpecificPrompt}${contextPrompt}${perspectivePrompt}${finalReminder}`;
}

// Function to parse questions from AI response
function parseQuestionsFromAIResponse(aiResponseText, perspectiveSettings = {}) {
  console.log('Parsing questions from AI response');
  const questions = [];
  let questionOrder = 1;
  
  try {
    // First, check if response contains the message that it can't see documents
    if (aiResponseText.includes("don't see any attached document") || 
        aiResponseText.includes("I don't see the document") ||
        aiResponseText.includes("I don't have access") ||
        aiResponseText.includes("I don't see any text")) {
      console.log('AI indicates it cannot see the document.');
      return [];
    }
    
    // Check if we have a structured response with assessment sections
    const hasPerspectives = 
      aiResponseText.includes('MANAGER ASSESSMENT') || 
      aiResponseText.includes('PEER ASSESSMENT') || 
      aiResponseText.includes('DIRECT REPORT ASSESSMENT') || 
      aiResponseText.includes('SELF ASSESSMENT');
      
    if (!hasPerspectives) {
      // If AI returned a summary instead of structured questions,
      // try to extract insights and create questions
      console.log('AI response does not contain structured questions, attempting to extract insights...');
      return extractQuestionsFromSummary(aiResponseText, perspectiveSettings);
    }

    // Split the text into perspective sections
    const sections = [
      {
        perspective: 'manager',
        text: extractSection(aiResponseText, 'MANAGER ASSESSMENT', ['PEER ASSESSMENT', 'DIRECT REPORT ASSESSMENT', 'SELF ASSESSMENT', 'EXTERNAL ASSESSMENT'])
      },
      {
        perspective: 'peer',
        text: extractSection(aiResponseText, 'PEER ASSESSMENT', ['MANAGER ASSESSMENT', 'DIRECT REPORT ASSESSMENT', 'SELF ASSESSMENT', 'EXTERNAL ASSESSMENT'])
      },
      {
        perspective: 'direct_report',
        text: extractSection(aiResponseText, 'DIRECT REPORT ASSESSMENT', ['MANAGER ASSESSMENT', 'PEER ASSESSMENT', 'SELF ASSESSMENT', 'EXTERNAL ASSESSMENT'])
      },
      {
        perspective: 'self',
        text: extractSection(aiResponseText, 'SELF ASSESSMENT', ['MANAGER ASSESSMENT', 'PEER ASSESSMENT', 'DIRECT REPORT ASSESSMENT', 'EXTERNAL ASSESSMENT'])
      },
      {
        perspective: 'external',
        text: extractSection(aiResponseText, 'EXTERNAL ASSESSMENT', ['MANAGER ASSESSMENT', 'PEER ASSESSMENT', 'DIRECT REPORT ASSESSMENT', 'SELF ASSESSMENT'])
      }
    ];

    // Process each section to extract questions
    for (const section of sections) {
      // Skip sections without content or for disabled perspectives
      if (!section.text || (perspectiveSettings[section.perspective] && !perspectiveSettings[section.perspective].enabled)) {
        continue;
      }

      // Extract questions from the section text
      const extractedQuestions = extractQuestionsFromSection(section.text, section.perspective);
      
      // Add the questions with proper order
      extractedQuestions.forEach(question => {
        questions.push({
          ...question,
          order: questionOrder++,
          perspective: section.perspective
        });
      });
    }

    console.log(`Successfully parsed ${questions.length} questions from AI response`);
    return questions;
  } catch (error) {
    console.error('Error parsing questions from AI response:', error);
    return [];
  }
}

// Helper function to extract a section from the AI response
function extractSection(text, sectionName, otherSections) {
  if (!text.includes(sectionName)) return '';
  
  const startIndex = text.indexOf(sectionName);
  let endIndex = text.length;
  
  // Find the start of the next section
  for (const otherSection of otherSections) {
    const otherIndex = text.indexOf(otherSection, startIndex + sectionName.length);
    if (otherIndex > startIndex && otherIndex < endIndex) {
      endIndex = otherIndex;
    }
  }
  
  return text.substring(startIndex, endIndex).trim();
}

// Helper function to extract questions from a section
function extractQuestionsFromSection(sectionText, perspective) {
  const questions = [];
  
  // Extract blocks that start with "Question:" and include Type: and Category:
  const questionPattern = /Question:\s*(.*?)(?:\r?\n|\r)Type:\s*(.*?)(?:\r?\n|\r)Category:\s*(.*?)(?=(?:\r?\n|\r)Question:|$)/gs;
  
  let match;
  while ((match = questionPattern.exec(sectionText)) !== null) {
    const questionText = removeMarkdownFormatting(match[1].trim());
    const questionType = match[2].trim().toLowerCase();
    const category = removeMarkdownFormatting(match[3].trim());
    
    if (questionText && (questionType === 'rating' || questionType === 'open_ended' || questionType === 'multiple_choice')) {
      questions.push({
        text: questionText,
        type: questionType,
        category: category,
        required: true,
        perspective: perspective
      });
    }
  }
  
  // If no structured questions found, try a less strict pattern
  if (questions.length === 0) {
    // Look for lines that look like questions
    const lines = sectionText.split('\n');
    let currentQuestion = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('Question:')) {
        // Start a new question
        currentQuestion = {
          text: removeMarkdownFormatting(trimmedLine.substring('Question:'.length).trim()),
          type: 'rating', // Default type
          category: 'General', // Default category
          required: true,
          perspective: perspective
        };
        questions.push(currentQuestion);
      } else if (currentQuestion && trimmedLine.startsWith('Type:')) {
        currentQuestion.type = trimmedLine.substring('Type:'.length).trim().toLowerCase();
      } else if (currentQuestion && trimmedLine.startsWith('Category:')) {
        currentQuestion.category = removeMarkdownFormatting(trimmedLine.substring('Category:'.length).trim());
      }
    }
  }
  
  return questions;
}

// Function to remove markdown formatting from text
function removeMarkdownFormatting(text) {
  if (!text) return '';
  
  // Remove bold/italic markers
  return text.replace(/\*\*/g, '').replace(/\*/g, '')
            // Remove underscores used for emphasis
            .replace(/\_\_/g, '').replace(/\_/g, '')
            // Remove hash symbols for headers
            .replace(/^\s*#{1,6}\s/gm, '')
            // Remove backticks for code
            .replace(/`/g, '');
}

// Extract questions from a summary when AI doesn't return structured questions
function extractQuestionsFromSummary(summaryText, perspectiveSettings = {}) {
  console.log('Extracting questions from summary text');
  const questions = [];
  let questionOrder = 1;
  
  // Extract key points/themes from the summary
  const themes = extractThemesFromSummary(summaryText);
  
  // Generate questions for each enabled perspective based on themes
  Object.entries(perspectiveSettings || {}).forEach(([perspective, settings]) => {
    if (!settings.enabled) return;
    
    // How many questions to generate for this perspective
    const questionCount = settings.questionCount || 10;
    
    // Generate questions for each theme
    themes.forEach((theme, index) => {
      // Skip if we've generated enough questions for this perspective
      if (questions.filter(q => q.perspective === perspective).length >= questionCount) return;
      
      // Create a rating question based on the theme
      questions.push({
        text: generateQuestionForTheme(theme, perspective, 'rating'),
        type: 'rating',
        category: theme.category,
        required: true,
        perspective: perspective,
        order: questionOrder++
      });
      
      // Add an open-ended question for some themes (but not all to keep balance)
      if (index % 3 === 0 && questions.filter(q => q.perspective === perspective).length < questionCount) {
        questions.push({
          text: generateQuestionForTheme(theme, perspective, 'open_ended'),
          type: 'open_ended',
          category: theme.category,
          required: true,
          perspective: perspective,
          order: questionOrder++
        });
      }
    });
    
    // If we don't have enough questions yet, add generic ones to reach the count
    const remainingCount = questionCount - questions.filter(q => q.perspective === perspective).length;
    if (remainingCount > 0) {
      const genericQuestions = generateGenericQuestionsForPerspective(perspective, remainingCount, questionOrder);
      questions.push(...genericQuestions);
      questionOrder += genericQuestions.length;
    }
  });
  
  console.log(`Generated ${questions.length} questions from summary text`);
  return questions;
}

// Extract themes from a summary
function extractThemesFromSummary(summaryText) {
  const themes = [];
  
  // Look for numbered or bulleted lists
  const listPattern = /(?:^|\n)(?:\d+\.\s*|\*\s*|\-\s*)([^:\n.]+)(?::|\.)\s*([^\n]*)/g;
  let match;
  
  while ((match = listPattern.exec(summaryText)) !== null) {
    const themeTitle = removeMarkdownFormatting(match[1].trim());
    const themeDesc = removeMarkdownFormatting(match[2].trim());
    
    themes.push({
      title: themeTitle,
      description: themeDesc,
      category: themeTitle
    });
  }
  
  // If no list found, try to extract sentences with keywords
  if (themes.length === 0) {
    const keywords = [
      'leadership', 'communication', 'decision', 'strategy', 'vision', 
      'teamwork', 'collaboration', 'empathy', 'innovation', 'integrity',
      'accountability', 'performance', 'development', 'coaching', 'feedback'
    ];
    
    const sentences = summaryText.match(/[^.!?]+[.!?]+/g) || [];
    
    sentences.forEach(sentence => {
      const cleanSentence = removeMarkdownFormatting(sentence);
      for (const keyword of keywords) {
        if (cleanSentence.toLowerCase().includes(keyword)) {
          const theme = {
            title: keyword.charAt(0).toUpperCase() + keyword.slice(1),
            description: cleanSentence.trim(),
            category: keyword.charAt(0).toUpperCase() + keyword.slice(1)
          };
          
          // Check if we already have this theme
          if (!themes.some(t => t.title.toLowerCase() === theme.title.toLowerCase())) {
            themes.push(theme);
          }
          
          break;
        }
      }
    });
  }
  
  // If still no themes, create some default ones
  if (themes.length === 0) {
    themes.push(
      { title: 'Communication', description: 'Effective communication skills', category: 'Communication' },
      { title: 'Leadership', description: 'Leadership abilities', category: 'Leadership' },
      { title: 'Decision Making', description: 'Decision making approach', category: 'Decision Making' },
      { title: 'Teamwork', description: 'Collaboration and teamwork', category: 'Teamwork' },
      { title: 'Strategic Thinking', description: 'Strategic planning and vision', category: 'Strategic Thinking' }
    );
  }
  
  return themes;
}

// Generate generic questions for a perspective if needed
function generateGenericQuestionsForPerspective(perspective, count, startOrder) {
  const questions = [];
  
  // Generic questions by perspective
  const genericQuestions = {
    manager: [
      { text: "How effectively does this person communicate with the team?", type: "rating", category: "Communication" },
      { text: "How well does this person develop team members?", type: "rating", category: "Team Development" },
      { text: "How effectively does this person solve problems?", type: "rating", category: "Problem Solving" },
      { text: "How would you rate this person's ability to deliver results?", type: "rating", category: "Performance" },
      { text: "What are this person's greatest strengths as a leader?", type: "open_ended", category: "Leadership Strengths" }
    ],
    peer: [
      { text: "How effectively does this person collaborate with colleagues?", type: "rating", category: "Collaboration" },
      { text: "How well does this person communicate ideas and information?", type: "rating", category: "Communication" },
      { text: "How would you rate this person's reliability?", type: "rating", category: "Reliability" },
      { text: "How effectively does this person contribute to team objectives?", type: "rating", category: "Team Contribution" },
      { text: "What could this person do to be a more effective collaborator?", type: "open_ended", category: "Collaboration" }
    ],
    direct_report: [
      { text: "How effectively does this person provide direction and guidance?", type: "rating", category: "Leadership" },
      { text: "How well does this person listen to your ideas and concerns?", type: "rating", category: "Listening" },
      { text: "How would you rate this person's ability to provide helpful feedback?", type: "rating", category: "Feedback" },
      { text: "How effectively does this person support your development?", type: "rating", category: "Development Support" },
      { text: "What could this person do to better support your success?", type: "open_ended", category: "Leadership Improvement" }
    ],
    self: [
      { text: "How effectively do you communicate with team members?", type: "rating", category: "Communication" },
      { text: "How well do you prioritize and manage your workload?", type: "rating", category: "Time Management" },
      { text: "How would you rate your ability to achieve objectives?", type: "rating", category: "Goal Achievement" },
      { text: "How effectively do you develop team members?", type: "rating", category: "Team Development" },
      { text: "What leadership skills would you like to develop further?", type: "open_ended", category: "Development Areas" }
    ],
    external: [
      { text: "How effectively does this person communicate with external stakeholders?", type: "rating", category: "External Communication" },
      { text: "How would you rate this person's professionalism?", type: "rating", category: "Professionalism" },
      { text: "How well does this person understand and address your needs?", type: "rating", category: "Customer Focus" },
      { text: "How effectively does this person build relationships?", type: "rating", category: "Relationship Building" },
      { text: "What could this person do to improve their effectiveness with external partners?", type: "open_ended", category: "External Effectiveness" }
    ]
  };
  
  // Get questions for this perspective
  const perspectiveQuestions = genericQuestions[perspective] || genericQuestions.peer;
  
  // Add the requested number of questions
  for (let i = 0; i < count; i++) {
    // If we need more than available, cycle through the array
    const questionTemplate = perspectiveQuestions[i % perspectiveQuestions.length];
    
    questions.push({
      text: questionTemplate.text,
      type: questionTemplate.type,
      category: questionTemplate.category,
      required: true,
      perspective: perspective,
      order: startOrder + i
    });
  }
  
  return questions;
}

// Generate a question based on a theme and perspective
function generateQuestionForTheme(theme, perspective, type) {
  const themeTitle = removeMarkdownFormatting(theme.title);
  
  // Rating question templates by perspective
  const ratingTemplates = {
    manager: [
      `How effectively does this person demonstrate ${themeTitle.toLowerCase()}?`,
      `How would you rate this person's ${themeTitle.toLowerCase()} skills?`,
      `To what extent does this person excel in ${themeTitle.toLowerCase()}?`
    ],
    peer: [
      `How would you rate this person's ability to ${themeTitle.toLowerCase()} when working with colleagues?`,
      `How effectively does this person demonstrate ${themeTitle.toLowerCase()} in team settings?`,
      `How well does this person apply ${themeTitle.toLowerCase()} principles in collaborative work?`
    ],
    direct_report: [
      `How effectively does this person demonstrate ${themeTitle.toLowerCase()} when working with you?`,
      `How would you rate this person's ${themeTitle.toLowerCase()} approach when leading your team?`,
      `How well does this person utilize ${themeTitle.toLowerCase()} skills in their interactions with you?`
    ],
    self: [
      `How effectively do you demonstrate ${themeTitle.toLowerCase()}?`,
      `How would you rate your own ${themeTitle.toLowerCase()} abilities?`,
      `How well do you apply ${themeTitle.toLowerCase()} principles in your role?`
    ],
    external: [
      `How would you rate this person's ${themeTitle.toLowerCase()} when interacting with external stakeholders?`,
      `How effectively does this person demonstrate ${themeTitle.toLowerCase()} in professional contexts?`,
      `How well does this person apply ${themeTitle.toLowerCase()} principles in external relations?`
    ]
  };
  
  // Open-ended question templates by perspective
  const openEndedTemplates = {
    manager: [
      `What specific examples demonstrate this person's ${themeTitle.toLowerCase()} abilities?`,
      `How could this person improve their approach to ${themeTitle.toLowerCase()}?`,
      `What impact has this person's ${themeTitle.toLowerCase()} had on the team or organization?`
    ],
    peer: [
      `What specific examples have you observed of this person's ${themeTitle.toLowerCase()} when working with you?`,
      `How could this person enhance their ${themeTitle.toLowerCase()} when collaborating with colleagues?`,
      `What makes this person's approach to ${themeTitle.toLowerCase()} effective or ineffective?`
    ],
    direct_report: [
      `How has this person's ${themeTitle.toLowerCase()} impacted your work or development?`,
      `What specific examples illustrate this person's ${themeTitle.toLowerCase()} when leading your team?`,
      `How could this person improve their ${themeTitle.toLowerCase()} approach to better support you?`
    ],
    self: [
      `What specific examples demonstrate your ${themeTitle.toLowerCase()} abilities?`,
      `How do you plan to further develop your ${themeTitle.toLowerCase()} skills?`,
      `What challenges have you faced related to ${themeTitle.toLowerCase()}, and how have you addressed them?`
    ],
    external: [
      `How has this person's ${themeTitle.toLowerCase()} impacted your professional relationship?`,
      `What specific examples have you observed of this person's ${themeTitle.toLowerCase()}?`,
      `How could this person enhance their ${themeTitle.toLowerCase()} when working with external partners?`
    ]
  };
  
  // Select templates based on question type
  const templates = type === 'rating' ? ratingTemplates : openEndedTemplates;
  
  // Get random template for this perspective and type
  const perspectiveTemplates = templates[perspective] || templates.peer;
  const selectedTemplate = perspectiveTemplates[Math.floor(Math.random() * perspectiveTemplates.length)];
  
  return selectedTemplate;
}

// Function to balance questions according to perspective settings
function balanceQuestionsByPerspective(questions, perspectiveSettings = {}) {
  // If no perspective settings or no questions, return original questions
  if (!perspectiveSettings || Object.keys(perspectiveSettings).length === 0 || questions.length === 0) {
    return questions;
  }
  
  console.log('Balancing questions by perspective settings');
  
  // Group questions by perspective
  const groupedQuestions = {};
  questions.forEach(question => {
    const perspective = question.perspective || 'peer'; // Default to peer if missing
    if (!groupedQuestions[perspective]) {
      groupedQuestions[perspective] = [];
    }
    groupedQuestions[perspective].push(question);
  });
  
  // Create balanced questions array
  const balancedQuestions = [];
  let questionOrder = 1;
  
  // For each perspective in the settings
  Object.entries(perspectiveSettings).forEach(([perspective, settings]) => {
    // Skip disabled perspectives
    if (!settings.enabled) {
      return;
    }
    
    // Get the target count and available questions
    const targetCount = settings.questionCount || 10;
    const availableQuestions = groupedQuestions[perspective] || [];
    
    // If we have more questions than needed, select a subset
    if (availableQuestions.length > targetCount) {
      console.log(`Perspective ${perspective}: selecting ${targetCount} questions from ${availableQuestions.length} available`);
      
      // Ensure we have at least one open-ended question if possible
      const ratingQuestions = availableQuestions.filter(q => q.type === 'rating');
      const openEndedQuestions = availableQuestions.filter(q => q.type === 'open_ended');
      
      // First, add at least one open-ended question if available
      let selectedQuestions = [];
      if (openEndedQuestions.length > 0) {
        selectedQuestions = openEndedQuestions.slice(0, Math.min(2, openEndedQuestions.length));
      }
      
      // Then fill the rest with rating questions
      const remainingCount = targetCount - selectedQuestions.length;
      if (remainingCount > 0 && ratingQuestions.length > 0) {
        selectedQuestions = [...selectedQuestions, ...ratingQuestions.slice(0, remainingCount)];
      }
      
      // If we still don't have enough, add more open-ended questions
      if (selectedQuestions.length < targetCount && openEndedQuestions.length > selectedQuestions.filter(q => q.type === 'open_ended').length) {
        const additionalOpenEnded = openEndedQuestions.slice(
          selectedQuestions.filter(q => q.type === 'open_ended').length,
          targetCount - selectedQuestions.filter(q => q.type === 'rating').length
        );
        selectedQuestions = [...selectedQuestions, ...additionalOpenEnded];
      }
      
      // If we're still short, just add questions in order until we reach target count
      if (selectedQuestions.length < targetCount) {
        const remainingQuestions = availableQuestions.filter(q => 
          !selectedQuestions.some(sq => sq.text === q.text)
        );
        selectedQuestions = [
          ...selectedQuestions,
          ...remainingQuestions.slice(0, targetCount - selectedQuestions.length)
        ];
      }
      
      // Add the selected questions with updated order
      selectedQuestions.forEach(question => {
        balancedQuestions.push({
          ...question,
          order: questionOrder++
        });
      });
    } 
    // If we have exactly the right number or fewer, use all available
    else if (availableQuestions.length > 0) {
      console.log(`Perspective ${perspective}: using all ${availableQuestions.length} available questions (target: ${targetCount})`);
      
      // Add all available questions with updated order
      availableQuestions.forEach(question => {
        balancedQuestions.push({
          ...question,
          order: questionOrder++
        });
      });
      
      // If we're short, generate additional generic questions
      const shortfall = targetCount - availableQuestions.length;
      if (shortfall > 0) {
        console.log(`Perspective ${perspective}: generating ${shortfall} additional generic questions`);
        
        // Generate generic questions for this perspective
        const additionalQuestions = generateGenericQuestions(perspective, shortfall, questionOrder);
        
        // Add the additional questions
        additionalQuestions.forEach(question => {
          balancedQuestions.push({
            ...question,
            perspective: perspective,
            order: questionOrder++
          });
        });
      }
    }
    // If no questions available for this perspective, generate all generic ones
    else if (targetCount > 0) {
      console.log(`Perspective ${perspective}: generating ${targetCount} generic questions (none available)`);
      
      // Generate generic questions for this perspective
      const genericQuestions = generateGenericQuestions(perspective, targetCount, questionOrder);
      
      // Add the generic questions
      genericQuestions.forEach(question => {
        balancedQuestions.push({
          ...question,
          perspective: perspective,
          order: questionOrder++
        });
      });
    }
  });
  
  console.log(`Balanced questions: ${balancedQuestions.length} total questions`);
  return balancedQuestions;
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
    // REMOVED ERROR-CAUSING LINE: console.log('Analysis response:', response.data);
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

    // Default generation method
    let generationMethod = 'flux_ai';

    // No response text means we'll need to use fallback
    if (!aiResponseText) {
      console.log('No AI response text, will use fallback generation');
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

    // Extract perspectiveSettings from templateInfo
    const perspectiveSettings = templateInfo?.perspectiveSettings || {
      manager: { questionCount: 10, enabled: true },
      peer: { questionCount: 10, enabled: true },
      direct_report: { questionCount: 10, enabled: true },
      self: { questionCount: 10, enabled: true },
      external: { questionCount: 5, enabled: false }
    };

    // Check if the response has sections in the expected format
    const hasExpectedFormat = 
      aiResponseText.includes("MANAGER ASSESSMENT:") && 
      aiResponseText.includes("PEER ASSESSMENT:") && 
      aiResponseText.includes("Question:") && 
      aiResponseText.includes("Type:") && 
      aiResponseText.includes("Category:");

    if (!hasExpectedFormat) {
      console.log('AI response does not follow the expected format, trying one more time...');
      
      // Try one more time with a simplified prompt
      const retryResponseText = await retryWithSimplifiedPrompt(fileIds, documentType, templateInfo);
      
      if (retryResponseText && 
          retryResponseText.includes("MANAGER ASSESSMENT:") && 
          retryResponseText.includes("Question:")) {
        console.log('Retry successful - got formatted questions');
        aiResponseText = retryResponseText;
        generationMethod = 'flux_ai';
      } else {
        console.log('Retry failed - using fallback questions');
        return createTemplateWithFallbackQuestions(documentType, userId, documents, templateInfo);
      }
    }

    // Parse questions from AI response
    const questions = parseQuestionsFromAIResponse(aiResponseText, perspectiveSettings);

    // If we still don't have questions, use fallback
    if (questions.length === 0) {
      console.log('No questions extracted from AI response, will use fallback');
      return createTemplateWithFallbackQuestions(documentType, userId, documents, templateInfo);
    }
    
    // Create a new template
    const name = templateInfo?.name || `${documentType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Template`;
    const description = templateInfo?.description || 'Generated from document analysis';
    
    const template = await Template.create({
      name: name,
      description: description,
      purpose: templateInfo?.purpose || '',
      department: templateInfo?.department || '',
      documentType,
      generatedBy: generationMethod,
      createdBy: userId,
      status: 'pending_review',
      perspectiveSettings: perspectiveSettings
    });
    
    // Check if we have enough relevant questions
    if (questions.length < 5) {
      console.log('Not enough relevant questions generated in first attempt, trying two-step approach');
      
      // Try the two-step approach
      const twoStepResponse = await tryTwoStepQuestionGeneration(fileIds, documentType, templateInfo);
      
      // If we got a response, try to parse questions from it
      if (twoStepResponse) {
        const twoStepQuestions = parseQuestionsFromAIResponse(twoStepResponse, perspectiveSettings);
        
        // If we found questions, use them instead of fallback
        if (twoStepQuestions && twoStepQuestions.length >= 5) {
          console.log(`Found ${twoStepQuestions.length} questions using two-step approach`);
          
          // Balance questions according to perspective settings
          const balancedQuestions = balanceQuestionsByPerspective(twoStepQuestions, perspectiveSettings);
          
          // Create questions for the template using the two-step result
          await Promise.all(
            balancedQuestions.map(async (q) => {
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
              status: 'analysis_complete'
              // We're not setting associatedTemplateId here, so documents can be reused
            },
            { where: { id: documents.map(doc => doc.id) } }
          );
          
          console.log('Template created with ID:', template.id);
          return template;
        }
      }
      
      console.log('Two-step approach failed or did not generate enough questions, using fallback questions');
      const fallbackQuestions = generateFallbackQuestions(documentType, perspectiveSettings, templateInfo);
      
      // Add any AI-generated questions we did get to the mix
      const combinedQuestions = [...questions, ...fallbackQuestions.slice(0, Math.max(15 - questions.length, 0))];
      
      // Balance the combined questions
      const balancedQuestions = balanceQuestionsByPerspective(combinedQuestions, perspectiveSettings);
      
      // Create questions for the template
      await Promise.all(
        balancedQuestions.map(async (q) => {
          return Question.create({
            ...q,
            templateId: template.id
          });
        })
      );
    } else {
      // We have enough questions from the first attempt, balance and create them
      console.log(`Found ${questions.length} questions from first AI response, balancing by perspective`);
      
      // Balance questions according to perspective settings
      const balancedQuestions = balanceQuestionsByPerspective(questions, perspectiveSettings);
      
      // Create balanced questions
      await Promise.all(
        balancedQuestions.map(async (q) => {
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
        status: 'analysis_complete'
        // We're not setting associatedTemplateId here, so documents can be reused
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

// A retry function to handle cases where the AI doesn't follow the format
async function retryWithSimplifiedPrompt(fileIds, documentType, templateInfo) {
  try {
    console.log('Retrying with simplified prompt...');
    
    // Create a simpler, more direct prompt
    const simplifiedPrompt = `GENERATE EXACTLY THE FOLLOWING AND NOTHING ELSE:

MANAGER ASSESSMENT:
Question: [question about leadership]
Type: rating
Category: [relevant category]

Question: [another question]
Type: [rating or open_ended]
Category: [relevant category]

PEER ASSESSMENT:
Question: [question for peers]
Type: rating
Category: [relevant category]

Question: [another question]
Type: [rating or open_ended]
Category: [relevant category]

DIRECT REPORT ASSESSMENT:
Question: [question for direct reports]
Type: rating
Category: [relevant category]

Question: [another question]
Type: [rating or open_ended]
Category: [relevant category]

SELF ASSESSMENT:
Question: [question for self-assessment]
Type: rating
Category: [relevant category]

Question: [another question]
Type: [rating or open_ended]
Category: [relevant category]`;

    // Set up request
    const messages = [
      {
        role: "system",
        content: "You are a question generator. Follow these instructions EXACTLY."
      },
      {
        role: "user",
        content: simplifiedPrompt
      }
    ];
    
    const requestPayload = {
      messages: messages,
      stream: false,
      attachments: {
        tags: [documentType],
        files: fileIds
      }
    };
    
    const response = await axios.post(
      `${fluxAiConfig.baseUrl}${fluxAiConfig.endpoints.chat}`, 
      requestPayload, 
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': fluxAiConfig.apiKey
        }
      }
    );
    
    // Extract the AI response text
    let aiResponseText = "";
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const message = response.data.choices[0].message;
      
      if (typeof message === 'object' && message.content) {
        aiResponseText = message.content;
      } else if (typeof message === 'string') {
        aiResponseText = message;
      }
    }
    
    return aiResponseText;
  } catch (error) {
    console.error('Error in retry attempt:', error);
    return null;
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
function generateFallbackQuestions(documentType = '', perspectiveSettings = null, templateInfo = {}) {
  // Extract template information
  const { name, description, purpose, department } = templateInfo || {};
  const domainContext = department ? ` in ${department}` : '';
  const purposeContext = purpose ? ` for ${purpose}` : '';
  
  // Get active perspectives
  const activePerspectives = [];
  
  if (perspectiveSettings) {
    Object.entries(perspectiveSettings).forEach(([perspective, settings]) => {
      if (settings.enabled) {
        activePerspectives.push({
          key: perspective,
          count: settings.questionCount || 10
        });
      }
    });
  }
  
  // If no active perspectives defined, use defaults
  if (activePerspectives.length === 0) {
    activePerspectives.push(
      { key: 'manager', count: 10 },
      { key: 'peer', count: 10 },
      { key: 'direct_report', count: 10 },
      { key: 'self', count: 10 }
    );
  }
  
  const fallbackQuestions = [];
  let questionCounter = 1;
  
  // Generate fallback questions for each active perspective
  activePerspectives.forEach(({ key: perspective, count }) => {
    console.log(`Generating ${count} fallback questions for ${perspective} perspective`);
    
    // Common questions for all types and perspectives - but limit to requested count
    const commonCount = Math.min(3, Math.ceil(count * 0.3)); // About 30% of questions are common
    
    if (perspective === 'self') {
      // Self assessment common questions
      for (let i = 0; i < commonCount; i++) {
        if (i === 0) {
          fallbackQuestions.push({
            text: `How effectively do you communicate with team members${domainContext}?`,
            type: "rating",
            category: "Communication",
            perspective: perspective,
            required: true,
            order: questionCounter++
          });
        } else if (i === 1) {
          fallbackQuestions.push({
            text: `What do you consider to be your key strengths${purposeContext}? Please provide specific examples.`,
            type: "open_ended",
            category: "Strengths",
            perspective: perspective,
            required: true,
            order: questionCounter++
          });
        } else if (i === 2) {
          fallbackQuestions.push({
            text: `In what areas could you improve${purposeContext}? Please be specific.`,
            type: "open_ended",
            category: "Development Areas",
            perspective: perspective,
            required: true,
            order: questionCounter++
          });
        }
      }
    } else {
      // Other perspectives common questions
      for (let i = 0; i < commonCount; i++) {
        if (i === 0) {
          fallbackQuestions.push({
            text: perspective === 'manager' 
              ? `How effectively does this person communicate with the team${domainContext}?`
              : perspective === 'direct_report'
                ? `How effectively does this person communicate with you and others${domainContext}?`
                : `How effectively does this person communicate with team members${domainContext}?`,
            type: "rating",
            category: "Communication",
            perspective: perspective,
            required: true,
            order: questionCounter++
          });
        } else if (i === 1) {
          fallbackQuestions.push({
            text: `What are this person's key strengths${purposeContext}? Please provide specific examples.`,
            type: "open_ended",
            category: "Strengths",
            perspective: perspective,
            required: true,
            order: questionCounter++
          });
        } else if (i === 2) {
          fallbackQuestions.push({
            text: `In what areas could this person improve${purposeContext}? Please be specific and constructive.`,
            type: "open_ended",
            category: "Development Areas",
            perspective: perspective,
            required: true,
            order: questionCounter++
          });
        }
      }
    }

    // Calculate how many document-type specific questions to add
    const typeSpecificCount = count - commonCount;
    
    // Add document-type specific questions
    switch (documentType) {
      case 'leadership_model':
        addLeadershipModelFallbackQuestions(fallbackQuestions, perspective, questionCounter, typeSpecificCount, templateInfo);
        break;
      case 'job_description':
        addJobDescriptionFallbackQuestions(fallbackQuestions, perspective, questionCounter, typeSpecificCount, templateInfo);
        break;
      case 'competency_framework':
        addCompetencyFrameworkFallbackQuestions(fallbackQuestions, perspective, questionCounter, typeSpecificCount, templateInfo);
        break;
      case 'company_values':
        addCompanyValuesFallbackQuestions(fallbackQuestions, perspective, questionCounter, typeSpecificCount, templateInfo);
        break;
      case 'performance_criteria':
        addPerformanceCriteriaFallbackQuestions(fallbackQuestions, perspective, questionCounter, typeSpecificCount, templateInfo);
        break;
      default:
        addGenericFallbackQuestions(fallbackQuestions, perspective, questionCounter, typeSpecificCount, templateInfo);
        break;
    }
    
    // Update question counter
    questionCounter += typeSpecificCount;
  });
  
  console.log(`Generated ${fallbackQuestions.length} total fallback questions`);
  return fallbackQuestions;
}

// Modified helper functions that respect question count
function addLeadershipModelFallbackQuestions(questions, perspective, startOrder, count, templateInfo = {}) {
  const { department, purpose } = templateInfo || {};
  const contextStr = department ? ` in the ${department} department` : '';
  const roleContext = purpose ? ` related to ${purpose}` : '';
  
  let order = startOrder;
  let questionsAdded = 0;
  const candidates = [];
  
  if (perspective === 'manager') {
    candidates.push(
      {
        text: `How effectively does this person demonstrate strategic thinking${contextStr}?`,
        type: "rating",
        category: "Strategic Thinking"
      },
      {
        text: `How well does this person develop team members${contextStr}?`,
        type: "rating",
        category: "Talent Development"
      },
      {
        text: `How effectively does this person make decisions${roleContext}?`,
        type: "rating",
        category: "Decision Making"
      },
      {
        text: `How well does this person align team goals with organizational objectives${contextStr}?`,
        type: "rating",
        category: "Strategic Alignment"
      },
      {
        text: `How effectively does this person handle complex challenges${contextStr}?`,
        type: "rating",
        category: "Problem Solving"
      },
      {
        text: `How would you describe this person's leadership style and its impact${roleContext}?`,
        type: "open_ended",
        category: "Leadership Style"
      }
    );
  } else if (perspective === 'peer') {
    candidates.push(
      {
        text: `How well does this person collaborate across teams${contextStr}?`,
        type: "rating",
        category: "Collaboration"
      },
      {
        text: `How would you rate this person's ability to influence without authority${contextStr}?`,
        type: "rating",
        category: "Influence"
      },
      {
        text: `How effectively does this person handle conflicts${roleContext}?`,
        type: "rating",
        category: "Conflict Resolution"
      },
      {
        text: `How well does this person share knowledge and resources${contextStr}?`,
        type: "rating",
        category: "Knowledge Sharing"
      },
      {
        text: `How effectively does this person contribute to a positive team culture${contextStr}?`,
        type: "rating",
        category: "Team Culture"
      },
      {
        text: `How could this person be a more effective peer collaborator${roleContext}?`,
        type: "open_ended",
        category: "Collaboration"
      }
    );
  } else if (perspective === 'direct_report') {
    candidates.push(
      {
        text: `How well does this person provide clear direction and guidance${roleContext}?`,
        type: "rating",
        category: "Direction Setting"
      },
      {
        text: `How effectively does this person delegate tasks and empower you${contextStr}?`,
        type: "rating",
        category: "Delegation"
      },
      {
        text: `How well does this person support your professional development${roleContext}?`,
        type: "rating",
        category: "Development Support"
      },
      {
        text: `How effectively does this person provide constructive feedback${contextStr}?`,
        type: "rating",
        category: "Feedback"
      },
      {
        text: `How well does this person recognize your achievements${roleContext}?`,
        type: "rating",
        category: "Recognition"
      },
      {
        text: `What could this person do to be a more effective leader for you${contextStr}?`,
        type: "open_ended", 
        category: "Leadership Effectiveness"
      }
    );
  } else if (perspective === 'self') {
    candidates.push(
      {
        text: `How effectively do you communicate vision and strategy${contextStr}?`,
        type: "rating",
        category: "Vision"
      },
      {
        text: `How well do you develop and empower your team members${roleContext}?`,
        type: "rating",
        category: "Team Development"
      },
      {
        text: `How would you rate your ability to make difficult decisions${contextStr}?`,
        type: "rating",
        category: "Decision Making"
      },
      {
        text: `How effectively do you lead through times of change${roleContext}?`,
        type: "rating",
        category: "Change Leadership"
      },
      {
        text: `How well do you balance strategic thinking with tactical execution${contextStr}?`,
        type: "rating",
        category: "Strategic Execution"
      },
      {
        text: `What leadership skills would you like to develop further${roleContext}?`,
        type: "open_ended",
        category: "Development Goals"
      }
    );
  } else if (perspective === 'external') {
    candidates.push(
      {
        text: `How effectively does this person represent the organization${contextStr}?`,
        type: "rating",
        category: "Representation"
      },
      {
        text: `How well does this person build relationships with external stakeholders${roleContext}?`,
        type: "rating",
        category: "Relationship Building"
      },
      {
        text: `How effectively does this person communicate the organization's vision${contextStr}?`,
        type: "rating",
        category: "External Communication"
      },
      {
        text: `How would you rate this person's professionalism${contextStr}?`,
        type: "rating",
        category: "Professionalism"
      },
      {
        text: `How well does this person understand your needs as an external stakeholder${roleContext}?`,
        type: "rating",
        category: "Stakeholder Understanding"
      },
      {
        text: `What could this person do to improve their effectiveness in working with external stakeholders${contextStr}?`,
        type: "open_ended",
        category: "External Effectiveness"
      }
    );
  }
  
  // Add questions up to the requested count
  for (let i = 0; i < Math.min(count, candidates.length); i++) {
    questions.push({
      ...candidates[i],
      perspective: perspective,
      required: true,
      order: order++
    });
    questionsAdded++;
  }
  
  // If we still need more questions, cycle through candidates again
  while (questionsAdded < count) {
    const index = questionsAdded % candidates.length;
    // Slightly modify the question to avoid exact duplicates
    const modified = {...candidates[index]};
    if (modified.text.startsWith("How ")) {
      modified.text = modified.text.replace("How ", "To what extent ");
    } else if (modified.text.startsWith("What ")) {
      modified.text = modified.text.replace("What ", "Which ");
    }
    
    questions.push({
      ...modified,
      perspective: perspective,
      required: true,
      order: order++
    });
    questionsAdded++;
  }
}

// Update the remaining helper functions similarly to respect question count parameter
// The pattern is the same: maintain a list of candidate questions, then add as many as needed to meet the count

function addJobDescriptionFallbackQuestions(questions, perspective, startOrder, count) {
  let order = startOrder;
  let questionsAdded = 0;
  const candidates = [];
  
  if (perspective === 'manager') {
    candidates.push(
      {
        text: "How effectively does this person fulfill their core job responsibilities?",
        type: "rating",
        category: "Job Performance"
      },
      {
        text: "How well does this person demonstrate the technical skills required for their role?",
        type: "rating",
        category: "Technical Skills"
      },
      {
        text: "How would you rate this person's productivity and efficiency?",
        type: "rating",
        category: "Productivity"
      },
      {
        text: "How effectively does this person meet deadlines and deliverables?",
        type: "rating",
        category: "Reliability"
      },
      {
        text: "How well does this person adapt to changing priorities in their role?",
        type: "rating",
        category: "Adaptability"
      },
      {
        text: "What specific accomplishments has this person achieved in their role?",
        type: "open_ended",
        category: "Achievements"
      }
    );
  } else if (perspective === 'peer') {
    candidates.push(
      {
        text: "How effectively does this person fulfill their role when working with you?",
        type: "rating",
        category: "Role Fulfillment"
      },
      {
        text: "How would you rate this person's technical skills in your collaborative work?",
        type: "rating",
        category: "Technical Skills"
      },
      {
        text: "How well does this person meet deadlines in shared projects?",
        type: "rating",
        category: "Timeliness"
      },
      {
        text: "How effectively does this person balance their workload with team needs?",
        type: "rating",
        category: "Workload Management"
      },
      {
        text: "How would you rate this person's reliability as a collaborator?",
        type: "rating",
        category: "Reliability"
      },
      {
        text: "How does this person's work contribute to team objectives?",
        type: "open_ended",
        category: "Team Contribution"
      }
    );
  } else if (perspective === 'direct_report') {
    candidates.push(
      {
        text: "How well does this person support you in achieving your job responsibilities?",
        type: "rating",
        category: "Job Support"
      },
      {
        text: "How clearly does this person communicate expectations to you?",
        type: "rating",
        category: "Expectation Setting"
      },
      {
        text: "How effectively does this person provide technical guidance when needed?",
        type: "rating",
        category: "Technical Guidance"
      },
      {
        text: "How well does this person help you understand how your role fits into broader objectives?",
        type: "rating",
        category: "Role Context"
      },
      {
        text: "How effectively does this person remove obstacles that impact your work?",
        type: "rating",
        category: "Obstacle Removal"
      },
      {
        text: "What could this person do to better support you in your role?",
        type: "open_ended",
        category: "Support Needs"
      }
    );
  } else if (perspective === 'self') {
    candidates.push(
      {
        text: "How effectively do you fulfill the core responsibilities of your role?",
        type: "rating",
        category: "Job Performance"
      },
      {
        text: "How would you rate your efficiency and quality of work?",
        type: "rating",
        category: "Work Quality"
      },
      {
        text: "How well do you apply your technical skills to your role?",
        type: "rating",
        category: "Technical Application"
      },
      {
        text: "How effectively do you manage your time and priorities?",
        type: "rating",
        category: "Time Management"
      },
      {
        text: "How well do you adapt to changing requirements in your role?",
        type: "rating",
        category: "Adaptability"
      },
      {
        text: "What aspects of your role would you like to develop further?",
        type: "open_ended",
        category: "Development Areas"
      }
    );
  } else if (perspective === 'external') {
    candidates.push(
      {
        text: "How effectively does this person perform their role when working with you?",
        type: "rating",
        category: "Role Effectiveness"
      },
      {
        text: "How would you rate this person's expertise in their area?",
        type: "rating",
        category: "Subject Expertise"
      },
      {
        text: "How well does this person deliver on commitments to external stakeholders?",
        type: "rating",
        category: "Delivery"
      },
      {
        text: "How effectively does this person represent their organization's interests?",
        type: "rating",
        category: "Representation"
      },
      {
        text: "How would you rate this person's professionalism?",
        type: "rating",
        category: "Professionalism"
      },
      {
        text: "What could this person do to be more effective in their role when working with external stakeholders?",
        type: "open_ended",
        category: "External Effectiveness"
      }
    );
  }
  
  // Add questions up to the requested count
  for (let i = 0; i < Math.min(count, candidates.length); i++) {
    questions.push({
      ...candidates[i],
      perspective: perspective,
      required: true,
      order: order++
    });
    questionsAdded++;
  }
  
  // If we still need more questions, cycle through candidates again
  while (questionsAdded < count) {
    const index = questionsAdded % candidates.length;
    // Slightly modify the question to avoid exact duplicates
    const modified = {...candidates[index]};
    if (modified.text.startsWith("How ")) {
      modified.text = modified.text.replace("How ", "To what extent ");
    } else if (modified.text.startsWith("What ")) {
      modified.text = modified.text.replace("What ", "Which ");
    }
    
    questions.push({
      ...modified,
      perspective: perspective,
      required: true,
      order: order++
    });
    questionsAdded++;
  }
}

// Implement similar pattern for other question type functions
function addCompetencyFrameworkFallbackQuestions(questions, perspective, startOrder, count) {
  // Implementation similar to the above functions with respect to count
  let order = startOrder;
  let questionsAdded = 0;
  const candidates = [];
  
  // Fill with candidate questions based on perspective...
  if (perspective === 'manager') {
    candidates.push(
      {
        text: "How well does this person demonstrate problem-solving abilities?",
        type: "rating",
        category: "Problem Solving"
      },
      {
        text: "Rate this person's ability to innovate and bring new ideas.",
        type: "rating",
        category: "Innovation"
      },
      {
        text: "How effectively does this person apply their expertise to achieve results?",
        type: "rating", 
        category: "Expertise Application"
      },
      {
        text: "How well does this person adapt to changing circumstances?",
        type: "rating",
        category: "Adaptability"
      },
      {
        text: "How would you rate this person's critical thinking skills?",
        type: "rating",
        category: "Critical Thinking"
      },
      {
        text: "In which competency areas does this person show the most strength?",
        type: "open_ended",
        category: "Competency Strengths"
      }
    );
  }
  // Add similar candidate sets for other perspectives
  
  // Add questions up to the requested count
  for (let i = 0; i < Math.min(count, candidates.length); i++) {
    questions.push({
      ...candidates[i],
      perspective: perspective,
      required: true,
      order: order++
    });
    questionsAdded++;
  }
  
  // Handle case where we need more questions than candidates
  while (questionsAdded < count) {
    // Similar implementation to cycle through and modify questions
    questionsAdded++;
  }
}

// Implement the remaining helper functions using the same pattern
function addCompanyValuesFallbackQuestions(questions, perspective, startOrder, count) {
  // Similar implementation
}

function addPerformanceCriteriaFallbackQuestions(questions, perspective, startOrder, count) {
  // Similar implementation
}

function addGenericFallbackQuestions(questions, perspective, startOrder, count) {
  // Similar implementation
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
      name: templateInfo.name || `${documentType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Template`,
      description: templateInfo.description || 'Generated with standard questions',
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
      generatedBy: 'Pre-loaded Template',
      createdBy: userId,
      status: 'pending_review'
    });
    
    // Generate fallback questions - enhanced to use template info
    const fallbackQuestions = generateFallbackQuestions(documentType, templateInfo.perspectiveSettings, templateInfo);
    
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
        status: 'analysis_complete'
        // We're not setting associatedTemplateId here, so documents can be reused
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
        status: 'analysis_complete'
        // We're not setting associatedTemplateId here, so documents can be reused
      },
      { where: { id: documents.map(doc => doc.id) } }
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
        status: 'analysis_complete'
        // We're not setting associatedTemplateId here, so documents can be reused
      },
      { where: { id: documents.map(doc => doc.id) } }
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