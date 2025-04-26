// backend/services/question-parser.service.js

/**
 * Sanitizes question text by removing department/template references
 * @param {string} text - The question text to sanitize
 * @param {string} departmentName - The department name to sanitize (default: 'General')
 * @returns {string} - Sanitized question text
 */
function sanitizeQuestionText(text, departmentName = 'General') {
  if (!text) return text;
  
  console.log(`Sanitizing question text with department: "${departmentName}"`);
  
  let cleanedText = text.trim();
  
  // Handle leader references first - these occur frequently
  cleanedText = cleanedText.replace(/the leader in the (.*?) Department/gi, 'this person');
  cleanedText = cleanedText.replace(/this person's/gi, 'this person\'s');
  
  // Handle "General Department" references explicitly first
  const generalPatterns = [
    { regex: /for the General Department/gi, replacement: ' for this role' },
    { regex: /in the General Department/gi, replacement: ' in this role' },
    { regex: /of the General Department/gi, replacement: ' of the team' },
    { regex: /to the General Department/gi, replacement: ' to the team' },
    { regex: /within the General Department/gi, replacement: ' within the organization' },
    { regex: /the General Department's/gi, replacement: 'this role\'s' },
    { regex: /the General department/gi, replacement: 'this role' },
    { regex: /General department/gi, replacement: 'team' },
    
    // Handle lowercase version too
    { regex: /for the general department/gi, replacement: ' for this role' },
    { regex: /in the general department/gi, replacement: ' in this role' },
    { regex: /of the general department/gi, replacement: ' of the team' },
    { regex: /to the general department/gi, replacement: ' to the team' },
    { regex: /within the general department/gi, replacement: ' within the organization' },
    { regex: /the general department's/gi, replacement: 'this role\'s' },
    { regex: /the general department/gi, replacement: 'this role' },
    { regex: /general department/gi, replacement: 'team' },
  ];
  
  // Apply General Department patterns first
  generalPatterns.forEach(pattern => {
    cleanedText = cleanedText.replace(pattern.regex, pattern.replacement);
  });
  
  // Now create dynamic regex patterns based on the actual department name
  // Skip if the department name is "General" since we already handled that
  if (departmentName && departmentName.toLowerCase() !== 'general') {
    const departmentPatterns = [
      { regex: new RegExp(`for the ${departmentName} Department`, 'gi'), replacement: ' for this role' },
      { regex: new RegExp(`in the ${departmentName} Department`, 'gi'), replacement: ' in this role' },
      { regex: new RegExp(`of the ${departmentName} Department`, 'gi'), replacement: ' of the team' },
      { regex: new RegExp(`to the ${departmentName} Department`, 'gi'), replacement: ' to the team' },
      { regex: new RegExp(`within the ${departmentName} Department`, 'gi'), replacement: ' within the organization' },
      { regex: new RegExp(`the ${departmentName} Department's`, 'gi'), replacement: 'this role\'s' },
      { regex: new RegExp(`the ${departmentName} department`, 'gi'), replacement: 'this role' },
      { regex: new RegExp(`${departmentName} department`, 'gi'), replacement: 'team' },
      
      // Also handle lowercase versions
      { regex: new RegExp(`for the ${departmentName.toLowerCase()} department`, 'gi'), replacement: ' for this role' },
      { regex: new RegExp(`in the ${departmentName.toLowerCase()} department`, 'gi'), replacement: ' in this role' },
      { regex: new RegExp(`of the ${departmentName.toLowerCase()} department`, 'gi'), replacement: ' of the team' },
      { regex: new RegExp(`to the ${departmentName.toLowerCase()} department`, 'gi'), replacement: ' to the team' },
      { regex: new RegExp(`within the ${departmentName.toLowerCase()} department`, 'gi'), replacement: ' within the organization' },
      { regex: new RegExp(`the ${departmentName.toLowerCase()} department's`, 'gi'), replacement: 'this role\'s' },
      { regex: new RegExp(`the ${departmentName.toLowerCase()} department`, 'gi'), replacement: 'this role' },
      { regex: new RegExp(`${departmentName.toLowerCase()} department`, 'gi'), replacement: 'team' },
      
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
    
    // Apply department-specific patterns
    departmentPatterns.forEach(pattern => {
      cleanedText = cleanedText.replace(pattern.regex, pattern.replacement);
    });
  }
  
  // Handle template-specific references
  const templatePatterns = [
    // Handle "General purpose template" references
    { regex: /for the General purpose template/gi, replacement: '' },
    { regex: /the General purpose template's/gi, replacement: 'their' },
    { regex: /the General purpose template/gi, replacement: '' },
    { regex: /General purpose template/gi, replacement: '' },
    
    // Handle "General use template" references
    { regex: /for the General use template/gi, replacement: '' },
    { regex: /the General use template's/gi, replacement: 'your' },
    { regex: /the General use template/gi, replacement: '' },
    { regex: /General use template/gi, replacement: '' },
    { regex: /\s+in the general use template/g, replacement: '' },
    { regex: /\s+for the general use template/g, replacement: '' },
    
    // Handle general purpose references
    { regex: /\s+in general\b/gi, replacement: '' },
    { regex: /\s+for general\b/gi, replacement: '' }
  ];
  
  // Add department-specific templates if department provided and not General
  if (departmentName && departmentName.toLowerCase() !== 'general') {
    templatePatterns.push(
      { regex: new RegExp(`for the ${departmentName} purpose template`, 'gi'), replacement: '' },
      { regex: new RegExp(`the ${departmentName} purpose template's`, 'gi'), replacement: 'their' },
      { regex: new RegExp(`the ${departmentName} purpose template`, 'gi'), replacement: '' },
      { regex: new RegExp(`${departmentName} purpose template`, 'gi'), replacement: '' },
      { regex: new RegExp(`for the ${departmentName} use template`, 'gi'), replacement: '' },
      { regex: new RegExp(`the ${departmentName} use template's`, 'gi'), replacement: 'your' },
      { regex: new RegExp(`the ${departmentName} use template`, 'gi'), replacement: '' },
      { regex: new RegExp(`${departmentName} use template`, 'gi'), replacement: '' }
    );
  }
  
  // Apply template patterns
  templatePatterns.forEach(pattern => {
    cleanedText = cleanedText.replace(pattern.regex, pattern.replacement);
  });
  
  // Final cleanup
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
 * Parses questions from AI response and returns flat array
 * @param {string} aiResponse - The text response from AI
 * @param {Object} perspectiveSettings - Settings for perspectives
 * @returns {Array} - Flat array of questions with perspective property
 */
function parseQuestionsFromAiResponse(aiResponse, perspectiveSettings = {}) {
  console.log('Extracted 30 raw questions from AI response');

  // Initialize result as a flat array
  const questions = [];

  // Check if AI response is valid
  if (!aiResponse || typeof aiResponse !== 'string') {
    console.error('Invalid AI response format');
    return questions;
  }

  // IMPROVED PATTERN: Match both with and without a colon
  // This fixes the issue where sections weren't being recognized properly
  const sectionRegexes = [
    // Match standard format with colon
    /\n\s*(MANAGER|PEER|DIRECT REPORT|SELF|EXTERNAL)\s*ASSESSMENT\s*:\s*\n/i,
    // Match format without colon
    /\n\s*(MANAGER|PEER|DIRECT REPORT|SELF|EXTERNAL)\s*ASSESSMENT\s*\n/i,
    // Match format with a period
    /\n\s*(MANAGER|PEER|DIRECT REPORT|SELF|EXTERNAL)\s*ASSESSMENT\s*\.\s*\n/i
  ];

  // Try each pattern until we get a good split
  let sections = [];
  let bestPattern = null;

  for (const regex of sectionRegexes) {
    const test = aiResponse.split(regex);
    // If we got multiple sections, use this pattern
    if (test.length > 1) {
      sections = test;
      bestPattern = regex;
      console.log('Found matching pattern for sections:', regex);
      break;
    }
  }

  // If no pattern worked, try a more flexible approach
  if (sections.length <= 1) {
    console.log('No standard section pattern detected, trying flexible approach');
    
    // Try to identify sections based on keywords at beginning of lines
    const flexiblePattern = /\n\s*(MANAGER|PEER|DIRECT REPORT|SELF|EXTERNAL)\s+/i;
    let matches = [...aiResponse.matchAll(new RegExp(flexiblePattern, 'g'))];
    
    if (matches.length > 0) {
      sections = [];
      matches.forEach((match, index) => {
        const start = match.index;
        const end = (index < matches.length - 1) ? matches[index + 1].index : aiResponse.length;
        const section = aiResponse.substring(start, end);
        // Extract perspective from the match
        const perspective = match[1].toUpperCase();
        // Add the perspective as a separate entry followed by the content
        sections.push(perspective);
        sections.push(section.replace(match[0], '').trim());
      });
    }
  }

  // Process each section
  let currentPerspective = null;
  let questionOrder = 1;

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
    
    // Skip if perspective is disabled
    if (currentPerspective && 
        perspectiveSettings[currentPerspective] && 
        perspectiveSettings[currentPerspective].enabled === false) {
      continue;
    }
    
    // If we have a valid perspective, process the questions in this section
    if (currentPerspective) {
      // NEW: First try to match question blocks using "Question:" prefix
      const questionBlocks = section.split(/\s*Question\s*:\s*/i).filter(Boolean);
      
      // If we found blocks, process each one
      if (questionBlocks.length > 0) {
        console.log(`Found ${questionBlocks.length} question blocks for ${currentPerspective}`);
        
        for (let j = 0; j < questionBlocks.length; j++) {
          const block = questionBlocks[j].trim();
          // Extract the question text (everything up to the next keyword)
          let questionText = block.split(/\s*(Type|Category)\s*:/i)[0].trim();
          let questionType = 'rating'; // Default
          let category = '';
          
          // Extract type if present
          const typeMatch = block.match(/\s*Type\s*:\s*([^\n]+)/i);
          if (typeMatch) {
            questionType = typeMatch[1].trim().toLowerCase();
          }
          
          // Extract category if present
          const categoryMatch = block.match(/\s*Category\s*:\s*([^\n]+)/i);
          if (categoryMatch) {
            category = categoryMatch[1].trim();
          }
          
          // Add the question if we have text
          if (questionText && questionText.length > 5) {
            questions.push({
              text: questionText,
              type: questionType === 'open_ended' ? 'open_ended' : 
                  (questionType === 'multiple_choice' ? 'multiple_choice' : 'rating'),
              category: category || 'General',
              perspective: currentPerspective,
              required: true,
              order: questionOrder++
            });
          }
        }
      } else {
        // If no blocks found, try the regex approach as a backup
        const questionPattern = /Question:\s*(.*?)(?:\n|$)(?:Type:\s*(.*?)(?:\n|$))?(?:Category:\s*(.*?)(?:\n\n|\n$|$))?/gs;
        let match;
        
        while ((match = questionPattern.exec(section)) !== null) {
          const questionText = match[1]?.trim() || '';
          const questionType = (match[2]?.trim() || 'rating').toLowerCase();
          const category = match[3]?.trim() || '';
          
          // Only add questions that have text
          if (questionText) {
            questions.push({
              text: questionText,
              type: questionType === 'open_ended' ? 'open_ended' : 
                  (questionType === 'multiple_choice' ? 'multiple_choice' : 'rating'),
              category: category || 'General',
              perspective: currentPerspective,
              required: true,
              order: questionOrder++
            });
          }
        }
      }
      
      // NEW: Look for questions based on formatting (first sentence after perspective) 
      // as a last resort
      if (questions.filter(q => q.perspective === currentPerspective).length === 0) {
        const sentences = section.split(/\.\s+/).filter(s => 
          s.trim().length > 10 && 
          s.includes('?') && 
          !s.toLowerCase().includes('question:')
        );
        
        console.log(`Found ${sentences.length} potential question sentences for ${currentPerspective}`);
        
        for (const sentence of sentences) {
          questions.push({
            text: sentence.trim() + (sentence.endsWith('?') ? '' : '?'),
            type: 'rating',  // Default
            category: 'General',  // Default
            perspective: currentPerspective,
            required: true,
            order: questionOrder++
          });
        }
      }
    }
  }

  // If we still don't have questions, try a non-perspective based approach
  if (questions.length === 0) {
    // Try to find any questions in the format "Question: XXX" or any sentences with question marks
    const potentialQuestions = [
      ...aiResponse.match(/Question:\s*(.*?)(?:\r?\n|\r|$)/g) || [],
      ...aiResponse.match(/[A-Z][^.!?]*\?/g) || []
    ];
    
    if (potentialQuestions && potentialQuestions.length > 0) {
      console.log(`Found ${potentialQuestions.length} questions without perspective sections`);
      
      // Distribute questions across enabled perspectives
      const activePerspectives = Object.entries(perspectiveSettings || {})
        .filter(([_, settings]) => settings.enabled)
        .map(([perspective]) => perspective);
      
      // Default perspectives if none enabled
      const defaultPerspectives = ['manager', 'peer', 'direct_report', 'self'];
      const perspectivesToUse = activePerspectives.length > 0 ? activePerspectives : defaultPerspectives;
      
      let perspectiveIndex = 0;
      
      potentialQuestions.forEach(match => {
        let questionText = match;
        
        // Clean up the question text
        if (questionText.startsWith('Question:')) {
          questionText = questionText.replace('Question:', '').trim();
        }
          
        if (questionText && questionText.length > 5) {
          const perspective = perspectivesToUse[perspectiveIndex % perspectivesToUse.length];
          
          questions.push({
            text: questionText,
            type: "rating", // Default to rating
            category: "General", // Default category
            perspective: perspective,
            required: true,
            order: questionOrder++
          });
          
          perspectiveIndex++;
        }
      });
    }
  }

  // NEW: Deduplicate questions by perspective and similar text
  const uniqueQuestions = deduplicateQuestions(questions);
  
  // Log success
  console.log(`Successfully parsed ${uniqueQuestions.length} questions from AI response`);
  console.log('Sample questions after parsing:');
  uniqueQuestions.slice(0, 2).forEach((q, i) => console.log(`  ${i+1}. ${q.text}`));

  return uniqueQuestions;
}

/**
 * Deduplicates questions based on perspective and text similarity
 * @param {Array} questions - Array of question objects
 * @returns {Array} - Deduplicated array of questions
 */
function deduplicateQuestions(questions) {
  const uniqueQuestions = [];
  const textMap = new Map(); // Maps perspective to set of question texts
  
  for (const question of questions) {
    const perspective = question.perspective || 'unknown';
    
    // Initialize set for this perspective if it doesn't exist
    if (!textMap.has(perspective)) {
      textMap.set(perspective, new Set());
    }
    
    // Normalize the question text for comparison
    const normalizedText = question.text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[.,?!;:]/g, '')
      .trim();
    
    // Check if this question is unique for its perspective
    const perspectiveSet = textMap.get(perspective);
    
    // Also check for high similarity with existing questions
    let isDuplicate = false;
    
    for (const existingText of perspectiveSet) {
      // Use Levenshtein distance or a simpler similarity metric
      if (calculateSimilarity(normalizedText, existingText) > 0.8) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      perspectiveSet.add(normalizedText);
      uniqueQuestions.push(question);
    }
  }
  
  return uniqueQuestions;
}

/**
 * Calculate similarity between two strings (0-1 scale)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score between 0 and 1
 */
function calculateSimilarity(str1, str2) {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;
  
  // Simple word overlap coefficient
  const words1 = new Set(str1.split(' '));
  const words2 = new Set(str2.split(' '));
  
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const smaller = Math.min(words1.size, words2.size);
  
  return intersection.size / smaller;
}

/**
 * Ensures we have the exact requested number of questions for each perspective
 * @param {Object} questions - Questions grouped by perspective
 * @param {Object} perspectiveSettings - Settings with question counts
 * @param {string} documentType - Type of document
 * @returns {Object} - Balanced questions
 */
function ensurePerspectiveQuestionCounts(questionsMap, perspectiveSettings, documentType) {
  const { generateFallbackQuestions } = require('./fallback-questions.service');
  const result = {};
  
  // Process each perspective
  for (const perspective in perspectiveSettings) {
    // Skip disabled perspectives
    if (!perspectiveSettings[perspective]?.enabled) {
      continue;
    }
    
    const targetCount = perspectiveSettings[perspective]?.questionCount || 10;
    const availableQuestions = questionsMap[perspective] || [];
    
    if (availableQuestions.length < targetCount) {
      // Need to generate more questions
      const neededCount = targetCount - availableQuestions.length;
      const fallbackQuestions = generateFallbackQuestions(
        perspective, 
        neededCount, 
        documentType, 
        availableQuestions
      );
      
      // Combine existing and new questions
      result[perspective] = [...availableQuestions, ...fallbackQuestions];
    } else if (availableQuestions.length > targetCount) {
      // Need to select a subset of questions
      result[perspective] = availableQuestions.slice(0, targetCount);
    } else {
      // We have exactly the right number
      result[perspective] = availableQuestions;
    }
  }
  
  return result;
}

// Modify the exports at the bottom of the file to include the new function
module.exports = { 
  parseQuestionsFromAiResponse,
  sanitizeQuestionText,
  deduplicateQuestions,
  ensurePerspectiveQuestionCounts
};