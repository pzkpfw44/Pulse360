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
    
    // More comprehensive pattern matching
    const departmentPatterns = [
      /the leader in the (.*?) Department/gi,
      /in the General Department/gi,
      /for the General Department/gi,
      /within the General Department/gi,
      /at the General Department/gi,
      /General Department/gi,
      /the General department/gi,
      /general department/gi,
      /in general/gi
    ];
    
    const replacements = departmentName && departmentName !== 'General' 
      ? [`in ${departmentName}`, `at ${departmentName}`, `within ${departmentName}`]
      : ['in their role', 'in the organization', 'within the organization'];
    
    // Apply all pattern replacements
    departmentPatterns.forEach((pattern, i) => {
      sanitized = sanitized.replace(pattern, 
        i < replacements.length ? replacements[i] : replacements[0]);
    });
    
    // Replace template references
    sanitized = sanitized.replace(/for the General purpose template/gi, '');
    sanitized = sanitized.replace(/the General purpose template('s)?/gi, 'their');
    sanitized = sanitized.replace(/General purpose template/gi, 'overall');
    
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
    
    const prompt = `
  I need you to analyze documents and generate questions for a 360-degree feedback assessment for a leadership role.
  
  Document Type: ${documentType.replace(/_/g, ' ')}
  Purpose: ${templateInfo.purpose || 'Leadership assessment'}
  Department: ${departmentName}
  
  IMPORTANT: DO NOT mention departments in your questions. Do not include phrases like "in the General department" or any department name. Instead, use phrases like "in this role" or "in their position".
  
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