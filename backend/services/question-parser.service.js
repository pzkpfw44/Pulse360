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
// Initialize result as a flat array
const questions = [];

// Check if AI response is valid
if (!aiResponse || typeof aiResponse !== 'string') {
  console.error('Invalid AI response format');
  return questions;
}

// Split by perspective sections
const sections = aiResponse.split(/\n\s*(MANAGER|PEER|DIRECT REPORT|SELF|EXTERNAL)\s*ASSESSMENT\s*:\s*\n/i);

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
        const preSanitized = questionText
          .replace(/for the General purpose template/gi, '')
          .replace(/the General purpose template's/gi, 'their')
          .replace(/the General purpose template/gi, '')
          .replace(/General purpose template/gi, '')
          .replace(/in the General Department/gi, ' in this role')
          .replace(/for the General Department/gi, ' for this role')
          .replace(/the General Department/gi, 'this role')
          .replace(/General Department/gi, 'team');
        
        questions.push({
          text: preSanitized,
          type: questionType === 'open_ended' ? 'open_ended' : 
              (questionType === 'multiple_choice' ? 'multiple_choice' : 'rating'),
          category: category || 'General',
          perspective: currentPerspective,
          required: true,
          order: questionOrder++
        });
      }
    }
    
    // If no questions were matched with the regex above, fall back to the original method
    if (questions.filter(q => q.perspective === currentPerspective).length === 0) {
      const questionLines = section.split(/\n\s*Question\s*:\s*/i).filter(Boolean);
      
      for (let j = 0; j < questionLines.length; j++) {
        let question = questionLines[j].trim();
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
          .replace(/General purpose template/gi, '')
          .replace(/in the General Department/gi, ' in this role')
          .replace(/for the General Department/gi, ' for this role')
          .replace(/the General Department/gi, 'this role')
          .replace(/General Department/gi, 'team');
        
        questionText = questionText.trim();
        
        // Add the question
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
  }
}

// If we still don't have questions, try a non-perspective based approach
if (questions.length === 0) {
  // Try to find any questions in the format "Question: XXX" regardless of sections
  const questionMatches = aiResponse.match(/Question:\s*(.*?)(?:\r?\n|\r|$)/g);
  
  if (questionMatches && questionMatches.length > 0) {
    console.log(`Found ${questionMatches.length} questions without perspective sections`);
    
    // Distribute questions across enabled perspectives
    const activePerspectives = Object.entries(perspectiveSettings || {})
      .filter(([_, settings]) => settings.enabled)
      .map(([perspective]) => perspective);
    
    // Default perspectives if none enabled
    const defaultPerspectives = ['manager', 'peer', 'direct_report', 'self'];
    const perspectivesToUse = activePerspectives.length > 0 ? activePerspectives : defaultPerspectives;
    
    let perspectiveIndex = 0;
    
    questionMatches.forEach(match => {
      const questionText = match.replace('Question:', '').trim()
        .replace(/in the General Department/gi, ' in this role')
        .replace(/for the General Department/gi, ' for this role')
        .replace(/the General Department/gi, 'this role')
        .replace(/General Department/gi, 'team');
        
      if (questionText) {
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

// Log success
console.log(`Successfully parsed ${questions.length} questions from AI response`);

return questions;
}

module.exports = { 
parseQuestionsFromAiResponse,
sanitizeQuestionText 
};