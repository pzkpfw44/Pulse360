// backend/services/prompt-helper.service.js

/**
 * Creates a prompt that explicitly instructs the AI to use generic references
 * @param {string} documentType - Type of document being analyzed
 * @param {object} templateInfo - Template information including department, name, etc.
 * @returns {string} - AI prompt
 */
function createAnalysisPrompt(documentType, templateInfo = {}) {
    // Get information about the template for context
    const department = templateInfo.department || 'General';
    
    return `Generate 360-degree feedback assessment questions based on the uploaded ${documentType.replace(/_/g, ' ')} document.
      
      IMPORTANT: Always refer to the person being evaluated as "this person" or "they/them" 
      - DO NOT use department names or specific titles in the questions.
      - DO NOT use the word "${department}" as a reference to the person.
      - ALWAYS use "this person" instead of any specific title or department name.
      
      Create questions for each perspective:
      - Manager Assessment
      - Peer Assessment
      - Direct Report Assessment
      - Self Assessment (use "you" and "your" instead of "this person")
      - External Stakeholder Assessment
      
      For each question include:
      - Question text
      - Type (rating or open_ended)
      - Category (specific skill/competency area)
      
      Each perspective should have a mix of rating scale and open-ended questions.`;
  }
  
  /**
   * Sanitizes AI-generated questions to replace department references with generic ones
   * @param {string} questionText - Original question text
   * @param {string} departmentName - Department name to remove
   * @returns {string} - Sanitized question text
   */
  function sanitizeQuestionText(questionText, departmentName = 'General') {
    if (!questionText) return questionText;
    
    // Common patterns to replace
    const replacements = [
      // Replace "[Department]'s" with "this person's"
      { pattern: new RegExp(`${departmentName}'s`, 'gi'), replacement: "this person's" },
      
      // Replace "does [Department]" with "does this person"
      { pattern: new RegExp(`does ${departmentName}`, 'gi'), replacement: "does this person" },
      
      // Replace "rate [Department]" with "rate this person"
      { pattern: new RegExp(`rate ${departmentName}`, 'gi'), replacement: "rate this person" },
      
      // Replace "for the [Department] department" with "in their role"
      { pattern: new RegExp(`for the ${departmentName} department`, 'gi'), replacement: "in their role" },
      
      // Replace "in the [Department] department" with "in their department"
      { pattern: new RegExp(`in the ${departmentName} department`, 'gi'), replacement: "in their department" },
      
      // Replace any remaining standalone department name with "this person"
      { pattern: new RegExp(`\\b${departmentName}\\b`, 'g'), replacement: "this person" }
    ];
    
    let sanitizedText = questionText;
    
    // Apply all replacements
    replacements.forEach(({ pattern, replacement }) => {
      sanitizedText = sanitizedText.replace(pattern, replacement);
    });
    
    return sanitizedText;
  }
  
  module.exports = {
    createAnalysisPrompt,
    sanitizeQuestionText
  };