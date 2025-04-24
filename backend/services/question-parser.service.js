// backend/services/question-parser.service.js

/**
 * Parses questions from AI response organized by perspective
 * @param {string} aiResponse - The text response from AI
 * @returns {Object} - Questions organized by perspective
 */
function parseQuestionsFromAiResponse(aiResponse) {
    try {
      console.log('Parsing AI response for questions...');
      
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
      const perspectiveSections = {
        'MANAGER ASSESSMENT': 'manager',
        'PEER ASSESSMENT': 'peer',
        'DIRECT REPORT ASSESSMENT': 'direct_report',
        'SELF ASSESSMENT': 'self',
        'EXTERNAL ASSESSMENT': 'external' 
      };
      
      // Find all perspective sections
      let currentPerspective = null;
      const lines = aiResponse.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check if this line defines a perspective section
        Object.keys(perspectiveSections).forEach(section => {
          if (line.includes(section)) {
            currentPerspective = perspectiveSections[section];
          }
        });
        
        // Skip if not in a valid perspective section
        if (!currentPerspective) continue;
        
        // Parse questions (they usually start with a number followed by "Question:")
        if (/^\d+\.\s*Question:/.test(line)) {
          // Extract question text
          const questionText = line.replace(/^\d+\.\s*Question:\s*/, '').trim();
          
          // Look ahead for type and category
          let questionType = 'rating'; // Default
          let category = '';
          
          // Check the next lines for type and category
          if (i + 1 < lines.length && lines[i + 1].includes('Type:')) {
            questionType = lines[i + 1].replace(/^Type:\s*/, '').trim().toLowerCase();
          }
          
          if (i + 2 < lines.length && lines[i + 2].includes('Category:')) {
            category = lines[i + 2].replace(/^Category:\s*/, '').trim();
          }
          
          // Add the question to the appropriate perspective
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
      
      // Count total questions extracted
      const totalQuestions = Object.values(result).reduce((sum, questions) => sum + questions.length, 0);
      console.log(`Successfully parsed ${totalQuestions} questions from AI response (${Object.keys(result).map(key => `${key}: ${result[key].length}`).join(', ')})`);
      
      return result;
    } catch (error) {
      console.error('Error parsing questions from AI response:', error);
      return {
        manager: [],
        peer: [],
        direct_report: [],
        self: [],
        external: []
      };
    }
  }
  
  module.exports = { parseQuestionsFromAiResponse };