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
    const purpose = templateInfo.purpose || 'General Purpose Assessment';
    
    return `Generate 360-degree feedback assessment questions based on the uploaded ${documentType.replace(/_/g, ' ')} document.
      
      ⚠️ CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE EXACTLY:
      1. NEVER mention "${purpose}" anywhere in any question
      2. NEVER use phrases like "General Purpose Assessment team" or similar
      3. ALWAYS refer to the person being evaluated as "this person" ONLY
      4. NEVER use the department name "${department}" in any form
      5. When referring to teams or roles, use "their team" or "their role" ONLY
      6. Avoid all specific references to departments, purposes, or assessment names
      7. For self-assessment, use "I" and "my" instead of "this person"
      
      Create questions for each perspective:
      - Manager Assessment (refer to person as "this person")
      - Peer Assessment (refer to person as "this person")
      - Direct Report Assessment (refer to manager as "your manager")
      - Self Assessment (use "I" and "my" instead of "this person")
      - External Stakeholder Assessment (refer to person as "this person")
      
      For each question include:
      - Question text (with NO references to specific teams/purposes)
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
    
    // Extract purpose phrase if it exists in the question
    let purpose = 'General Purpose Assessment';
    if (questionText.includes('General Purpose Assessment')) {
      purpose = 'General Purpose Assessment';
    }
    
    // Comprehensive list of patterns to replace
    const replacements = [
      // Fix manager references
      { pattern: /the manager/gi, replacement: "this person" },
      { pattern: /your manager/gi, replacement: "your manager" }, // Keep for direct reports
      
      // Replace template purpose references - most specific first
      { pattern: new RegExp(`${purpose} team`, 'gi'), replacement: "their team" },
      { pattern: new RegExp(`the ${purpose} team`, 'gi'), replacement: "their team" },
      { pattern: new RegExp(`for the ${purpose}`, 'gi'), replacement: "for their role" },
      { pattern: new RegExp(`${purpose}`, 'gi'), replacement: "their responsibilities" },
      
      // Department specific references
      { pattern: new RegExp(`${departmentName}'s`, 'gi'), replacement: "this person's" },
      { pattern: new RegExp(`does ${departmentName}`, 'gi'), replacement: "does this person" },
      { pattern: new RegExp(`rate ${departmentName}`, 'gi'), replacement: "rate this person" },
      { pattern: /for the General department/gi, replacement: "in their role" },
      { pattern: /in the General department/gi, replacement: "in their team" },
      { pattern: /General department/gi, replacement: "their team" },
      
      // Team references
      { pattern: /the team's/gi, replacement: "their team's" },
      
      // Replace specific category references
      { pattern: /Vision-setting and strategic thinking/gi, replacement: "Strategic thinking" },
      { pattern: /Communication and influence skills needed for General/gi, replacement: "Communication skills" },
      { pattern: /Team development and empowerment for Template/gi, replacement: "Team development" },
      
      // Fix "the individual" references
      { pattern: /the individual/gi, replacement: "this person" },
      
      // Clean up any remaining department references
      { pattern: new RegExp(`\\b${departmentName}\\b`, 'g'), replacement: "this person" },
      
      // Final cleanup for any phrases that might have been missed
      { pattern: /General Purpose/gi, replacement: "their responsibilities" },
      { pattern: /Assessment team/gi, replacement: "team" },
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