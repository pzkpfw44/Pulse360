// backend/services/prompt-helper.service.js

/**
 * Sanitizes question text to remove template artifacts
 * @param {string} text - The original question text
 * @param {string} departmentName - The department name
 * @returns {string} - The sanitized question text
 */
function sanitizeQuestionText(text, departmentName = '') {
    if (!text) return '';
    
    // First, handle department references
    let sanitized = text;
    
    // Replace variations of "the leader in the [Department] Department"
    sanitized = sanitized.replace(
      /the leader in the (.*?) Department/gi, 
      'this person'
    );
    
    // Replace "General Department" references
    sanitized = sanitized.replace(
      /General Department/gi, 
      departmentName !== 'General' ? departmentName : 'the organization'
    );
    
    // Replace template references
    sanitized = sanitized.replace(
      /for the General purpose template/gi, 
      ''
    );
    
    sanitized = sanitized.replace(
      /the General purpose template('s)?/gi, 
      'their'
    );
    
    sanitized = sanitized.replace(
      /General purpose template/gi, 
      'overall'
    );
    
    // Clean up any double spaces created by our replacements
    sanitized = sanitized.replace(/\s{2,}/g, ' ').trim();
    
    return sanitized;
  }
  
  /**
   * Creates a prompt for analyzing documents and generating questions
   * @param {string} documentType - Type of document
   * @param {object} templateInfo - Template information
   * @returns {string} - Formatted prompt
   */
  function createAnalysisPrompt(documentType, templateInfo = {}) {
    const departmentName = templateInfo.department || 'General';
    
    // Create a prompt that abstracts away specific department names
    const prompt = `
  I need you to analyze documents and generate questions for a 360-degree feedback assessment for a leadership role.
  
  Document Type: ${documentType.replace(/_/g, ' ')}
  Purpose: ${templateInfo.purpose || 'Leadership assessment'}
  
  For each perspective below, generate specific, actionable 360-degree feedback questions:
  
  1. MANAGER ASSESSMENT (questions that a manager would answer about the person)
  2. PEER ASSESSMENT (questions that peers would answer)
  3. DIRECT REPORT ASSESSMENT (questions that direct reports would answer)
  4. SELF ASSESSMENT (questions for self-evaluation)
  5. EXTERNAL ASSESSMENT (questions for external stakeholders)
  
  For each question, specify:
  - Question: [The question text]
  - Type: [rating or open_ended]
  - Category: [A relevant category like "Communication", "Leadership", etc.]
  
  Don't mention specific department names in your responses - use generic terms like "in this role" instead of "in the ${departmentName} department".
  
  Focus on leadership competencies such as:
  - Vision-setting and strategic thinking
  - Team development and empowerment
  - Communication and influence skills
  - Decision-making processes and effectiveness
  - Change management and adaptability
  
  Generate questions that will help assess these competencies effectively.
  `;
  
    return prompt;
  }
  
  module.exports = {
    sanitizeQuestionText,
    createAnalysisPrompt
  };