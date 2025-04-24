// backend/services/question-parser.service.js

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
    let currentText = "";
    
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
          
          // Clean up question text - SANITIZE HERE DIRECTLY
          questionText = questionText.trim();
          
          // Remove department references directly
          questionText = questionText.replace(/\s+in the General Department/gi, ' in this role');
          questionText = questionText.replace(/\s+for the General Department/gi, ' for this role');
          questionText = questionText.replace(/\s+of the General Department/gi, ' of the team');
          questionText = questionText.replace(/\s+to the General Department/gi, ' to the team');
          questionText = questionText.replace(/\s+within the General Department/gi, ' within the organization');
          questionText = questionText.replace(/the General Department's/gi, 'this role\'s');
          questionText = questionText.replace(/the General department/gi, 'this role');
          questionText = questionText.replace(/General department/gi, 'team');
          
          // Add the sanitized question
          if (questionText) {
            result[currentPerspective].push({
              text: questionText,
              type: questionType,
              category: category,
              perspective: currentPerspective,
              required: true,
              order: result[currentPerspective].length + 1
            });
          }
        }
      }
    }
    
    console.log(`Successfully parsed ${Object.values(result).reduce((sum, arr) => sum + arr.length, 0)} questions`);
    
    return result;
  }
  
  module.exports = { parseQuestionsFromAiResponse };