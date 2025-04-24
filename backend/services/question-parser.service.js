// backend/services/question-parser.service.js

/**
 * Sanitizes question text by removing department/template references
 * @param {string} text - The question text to sanitize
 * @param {string} departmentName - The department name to sanitize (default: 'General')
 * @returns {string} - Sanitized question text
 */
function sanitizeQuestionText(text, departmentName = 'General') {
    if (!text) return text;
    
    let cleanedText = text.trim();
    
    // Handle leader references first - these occur frequently
    cleanedText = cleanedText.replace(/the leader in the (.*?) Department/gi, 'this person');
    cleanedText = cleanedText.replace(/this person's/gi, 'this person\'s');
    
    // Create dynamic regex patterns based on the actual department name
    const patterns = [
      { regex: new RegExp(`\\s+in the ${departmentName} Department`, 'gi'), replacement: ' in this role' },
      { regex: new RegExp(`\\s+for the ${departmentName} Department`, 'gi'), replacement: ' for this role' },
      { regex: new RegExp(`\\s+of the ${departmentName} Department`, 'gi'), replacement: ' of the team' },
      { regex: new RegExp(`\\s+to the ${departmentName} Department`, 'gi'), replacement: ' to the team' },
      { regex: new RegExp(`\\s+within the ${departmentName} Department`, 'gi'), replacement: ' within the organization' },
      { regex: new RegExp(`the ${departmentName} Department's`, 'gi'), replacement: 'this role\'s' },
      { regex: new RegExp(`the ${departmentName} department`, 'gi'), replacement: 'this role' },
      { regex: new RegExp(`${departmentName} department`, 'gi'), replacement: 'team' },
      
      // Handle "General purpose template" references - new patterns
      { regex: new RegExp(`for the ${departmentName} purpose template`, 'gi'), replacement: '' },
      { regex: new RegExp(`the ${departmentName} purpose template's`, 'gi'), replacement: 'their' },
      { regex: new RegExp(`the ${departmentName} purpose template`, 'gi'), replacement: '' },
      { regex: new RegExp(`${departmentName} purpose template`, 'gi'), replacement: '' },
      
      // Handle "use template" references
      { regex: new RegExp(`\\s+in the ${departmentName} use template`, 'gi'), replacement: '' },
      { regex: new RegExp(`\\s+for the ${departmentName} use template`, 'gi'), replacement: '' },
      { regex: new RegExp(`\\s+of the ${departmentName} use template`, 'gi'), replacement: '' },
      { regex: new RegExp(`\\s+to the ${departmentName} use template`, 'gi'), replacement: '' },
      { regex: new RegExp(`\\s+within the ${departmentName} use template`, 'gi'), replacement: '' },
      { regex: new RegExp(`the ${departmentName} use template's`, 'gi'), replacement: 'your' },
      { regex: new RegExp(`the ${departmentName} use template`, 'gi'), replacement: '' },
      { regex: new RegExp(`${departmentName} use template`, 'gi'), replacement: '' },
      
      // General purpose references without "Department"
      { regex: new RegExp(`\\s+in the ${departmentName}\\b`, 'gi'), replacement: ' in this role' },
      { regex: new RegExp(`\\s+for the ${departmentName}\\b`, 'gi'), replacement: ' for this role' },
      { regex: new RegExp(`\\s+of the ${departmentName}\\b`, 'gi'), replacement: ' of the team' },
      { regex: new RegExp(`\\s+to the ${departmentName}\\b`, 'gi'), replacement: ' to the team' },
      { regex: new RegExp(`\\s+within the ${departmentName}\\b`, 'gi'), replacement: ' within the organization' },
      
      // Final cleanup for any remaining references
      { regex: new RegExp(`\\s+in ${departmentName}\\b`, 'gi'), replacement: '' },
      { regex: new RegExp(`\\s+for ${departmentName}\\b`, 'gi'), replacement: '' }
    ];
    
    // Apply all regex patterns
    patterns.forEach(pattern => {
      cleanedText = cleanedText.replace(pattern.regex, pattern.replacement);
    });
    
    // Also apply standard cleanup for "General" references
    // These are crucial for the "General purpose template" mentions we're seeing
    const generalPatterns = [
      // Handle "General purpose template" references
      { regex: /for the General purpose template/gi, replacement: '' },
      { regex: /the General purpose template's/gi, replacement: 'their' },
      { regex: /the General purpose template/gi, replacement: '' },
      { regex: /General purpose template/gi, replacement: '' },
      
      // Standard department patterns
      { regex: /\s+in the General Department/gi, replacement: ' in this role' },
      { regex: /\s+for the General Department/gi, replacement: ' for this role' },
      { regex: /\s+of the General Department/gi, replacement: ' of the team' },
      { regex: /\s+to the General Department/gi, replacement: ' to the team' },
      { regex: /\s+within the General Department/gi, replacement: ' within the organization' },
      { regex: /the General Department's/gi, replacement: 'this role\'s' },
      { regex: /the General department/gi, replacement: 'this role' },
      { regex: /General department/gi, replacement: 'team' },
      { regex: /\s+in the General use template/gi, replacement: '' },
      { regex: /\s+for the General use template/gi, replacement: '' },
      { regex: /\s+of the General use template/gi, replacement: '' },
      { regex: /\s+to the General use template/gi, replacement: '' },
      { regex: /\s+within the General use template/gi, replacement: '' },
      { regex: /the General use template's/gi, replacement: 'your' },
      { regex: /the General use template/gi, replacement: '' },
      { regex: /General use template/gi, replacement: '' },
      { regex: /\s+in the general department/g, replacement: ' in this role' },
      { regex: /\s+for the general department/g, replacement: ' for this role' },
      { regex: /\s+in the general use template/g, replacement: '' },
      { regex: /\s+for the general use template/g, replacement: '' },
      { regex: /\s+in general\b/gi, replacement: '' },
      { regex: /\s+for general\b/gi, replacement: '' }
    ];
    
    generalPatterns.forEach(pattern => {
      cleanedText = cleanedText.replace(pattern.regex, pattern.replacement);
    });
    
    // One more cleanup pass for leader references and common phrases
    cleanedText = cleanedText
      .replace(/the leader in the/gi, 'this person')
      .replace(/the leader's/gi, 'this person\'s')
      .replace(/the leader/gi, 'this person')
      .replace(/achieve the goals\?/gi, 'achieve goals?')
      .replace(/\s{2,}/g, ' ') // Remove double spaces
      .trim();
    
    return cleanedText;
  }
  
  /**
   * Parses questions from AI response organized by perspective
   * @param {string} aiResponse - The text response from AI
   * @returns {Object} - Questions organized by perspective
   */
  function parseQuestionsFromAiResponse(aiResponse) {
    // Initialize result structure
    const result = {
      manager: [],
      peer: [],
      direct_report: [],
      self: [],
      external: []
    };
    
    // Check if AI response is valid
    if (!aiResponse || typeof aiResponse !== 'string') {
      console.error('Invalid AI response format');
      return result;
    }
    
    // Split by perspective sections
    const sections = aiResponse.split(/\n\s*(MANAGER|PEER|DIRECT REPORT|SELF|EXTERNAL)\s*ASSESSMENT\s*:\s*\n/i);
    
    // Process each section
    let currentPerspective = null;
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      
      // If this is a perspective header, set the current perspective
      if (/^(MANAGER|PEER|DIRECT REPORT|SELF|EXTERNAL)$/.test(section)) {
        if (section.toUpperCase() === 'MANAGER') currentPerspective = 'manager';
        else if (section.toUpperCase() === 'PEER') currentPerspective = 'peer';
        else if (section.toUpperCase() === 'DIRECT REPORT') currentPerspective = 'direct_report';
        else if (section.toUpperCase() === 'SELF') currentPerspective = 'self';
        else if (section.toUpperCase() === 'EXTERNAL') currentPerspective = 'external';
        continue;
      }
      
      // If we have a valid perspective, process the questions in this section
      if (currentPerspective) {
        // Try to match question blocks with their type and category
        const questionPattern = /Question:\s*(.*?)(?:\n|$)(?:Type:\s*(.*?)(?:\n|$))?(?:Category:\s*(.*?)(?:\n\n|\n$|$))?/gs;
        let match;
        
        while ((match = questionPattern.exec(section)) !== null) {
          const questionText = match[1]?.trim() || '';
          const questionType = (match[2]?.trim() || 'rating').toLowerCase();
          const category = match[3]?.trim() || '';
          
          // Only add questions that have text
          if (questionText) {
            // Pre-sanitize to strip out template-specific mentions
            // sanitizeQuestionText will be fully applied later by the caller
            const preSanitized = questionText
              .replace(/for the General purpose template/gi, '')
              .replace(/the General purpose template's/gi, 'their')
              .replace(/the General purpose template/gi, '')
              .replace(/General purpose template/gi, '');
            
            result[currentPerspective].push({
              text: preSanitized,
              type: questionType === 'open_ended' ? 'open_ended' : 
                   (questionType === 'multiple_choice' ? 'multiple_choice' : 'rating'),
              category: category,
              perspective: currentPerspective,
              required: true,
              order: result[currentPerspective].length + 1
            });
          }
        }
        
        // If no questions were matched with the regex above, fall back to the original method
        if (result[currentPerspective].length === 0) {
          const questions = section.split(/\n\s*Question\s*:\s*/i).filter(Boolean);
          
          for (let j = 0; j < questions.length; j++) {
            let question = questions[j].trim();
            let questionText = question;
            let questionType = 'rating'; // Default
            let category = '';
            
            // Extract type if present
            const typeMatch = question.match(/\nType\s*:\s*([^\n]+)/i);
            if (typeMatch) {
              questionType = typeMatch[1].trim().toLowerCase();
              questionText = questionText.replace(typeMatch[0], '');
            }
            
            // Extract category if present
            const categoryMatch = question.match(/\nCategory\s*:\s*([^\n]+)/i);
            if (categoryMatch) {
              category = categoryMatch[1].trim();
              questionText = questionText.replace(categoryMatch[0], '');
            }
            
            // Apply immediate sanitization for template references
            questionText = questionText
              .replace(/for the General purpose template/gi, '')
              .replace(/the General purpose template's/gi, 'their')
              .replace(/the General purpose template/gi, '')
              .replace(/General purpose template/gi, '');
            
            questionText = questionText.trim();
            
            // Add the question
            if (questionText) {
              result[currentPerspective].push({
                text: questionText,
                type: questionType === 'open_ended' ? 'open_ended' : 
                     (questionType === 'multiple_choice' ? 'multiple_choice' : 'rating'),
                category: category,
                perspective: currentPerspective,
                required: true,
                order: result[currentPerspective].length + 1
              });
            }
          }
        }
      }
    }
    
    // Log success
    const totalQuestions = Object.values(result).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`Successfully parsed ${totalQuestions} questions from AI response`);
    
    return result;
  }
  
  module.exports = { 
    parseQuestionsFromAiResponse,
    sanitizeQuestionText 
  };