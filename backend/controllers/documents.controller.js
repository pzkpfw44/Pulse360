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

    // Start FluxAI analysis in the background
    // This will be asynchronous to not block the response
    startDocumentAnalysis(uploadedDocuments, documentType, req.user.id);

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
    const document = await Document.findOne({
      where: {
        id: req.params.id,
        uploadedBy: req.user.id
      }
    });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // If document was uploaded to FluxAI, delete it there too
    if (document.fluxAiFileId) {
      try {
        await axios.delete(`${fluxAiConfig.baseUrl}/v1/files/${document.fluxAiFileId}`, {
          headers: {
            'Authorization': `Bearer ${fluxAiConfig.apiKey}`
          }
        });
      } catch (aiError) {
        console.error('Error deleting file from FluxAI:', aiError);
        // Continue with deletion even if FluxAI deletion fails
      }
    }
    
    // Delete local file if it exists
    if (document.path) {
      try {
        fs.unlinkSync(document.path);
      } catch (fsError) {
        console.error('Error deleting local file:', fsError);
        // Continue with deletion even if file deletion fails
      }
    }
    
    await document.destroy();
    
    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Failed to delete document', error: error.message });
  }
};