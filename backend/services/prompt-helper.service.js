// backend/services/prompt-helper.service.js

/**
 * Sanitizes question text to remove department references
 * @param {string} text - The original question text
 * @param {string} departmentName - The department name to sanitize
 * @returns {string} - The sanitized question text
 */
function sanitizeQuestionText(text, departmentName) {
    if (!text) return text;
    
    // Create a regex pattern that matches the department name in various contexts
    const pattern = new RegExp(`(in|for|of|to|within) the ${departmentName} Department`, 'gi');
    text = text.replace(pattern, (match) => {
      if (match.toLowerCase().startsWith('in the')) return 'in this role';
      if (match.toLowerCase().startsWith('for the')) return 'for this role';
      if (match.toLowerCase().startsWith('of the')) return 'of the team';
      if (match.toLowerCase().startsWith('to the')) return 'to the team';
      if (match.toLowerCase().startsWith('within the')) return 'within the organization';
      return match; // Fallback
    });
    
    // Handle possessive form
    text = text.replace(new RegExp(`the ${departmentName} Department's`, 'gi'), 'this role\'s');
    
    return text;
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