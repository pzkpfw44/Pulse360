// backend/services/prompt-helper.service.js

// Keep sanitizeQuestionText function as is...
function sanitizeQuestionText(text, departmentName = 'General') {
  // ... keep existing implementation ...
  if (!text || typeof text !== 'string') return '';
  let cleanedText = text.trim();
  // --- PRIORITY: Replace incorrect AI usage of "General" ---
  const isGeneralInput = departmentName && departmentName.toLowerCase() === 'general';
  if (isGeneralInput) {
      cleanedText = cleanedText.replace(/How would you rate the General's ability/gi, "How would you rate this person's ability");
      cleanedText = cleanedText.replace(/What are some areas where the General excels/gi, "What are some areas where this person excels");
      cleanedText = cleanedText.replace(/What are some areas where the General could improve/gi, "What are some areas where this person could improve");
      cleanedText = cleanedText.replace(/How does the General demonstrate/gi, "How does this person demonstrate");
      cleanedText = cleanedText.replace(/the General's/gi, "this person's");
      cleanedText = cleanedText.replace(/the General\b/gi, "this person");
  }
  // Handle standard leader/person references
  cleanedText = cleanedText.replace(/the leader in the (.*?) Department/gi, 'this person');
  cleanedText = cleanedText.replace(/the leader/gi, 'this person');
  cleanedText = cleanedText.replace(/this person's/gi, 'this person\'s');
  // Handle "General Department" references
  const generalDeptPatterns = [ { regex: /for the General Department/gi, replacement: ' for this role' }, { regex: /in the General Department/gi, replacement: ' in this role' }, { regex: /of the General Department/gi, replacement: ' of the team' }, { regex: /within the General Department/gi, replacement: ' within the organization' }, { regex: /the General Department's/gi, replacement: 'this role\'s' }, { regex: /General Department/gi, replacement: 'team' }, { regex: /for the general department/gi, replacement: ' for this role' }, { regex: /in the general department/gi, replacement: ' in this role' }, { regex: /of the general department/gi, replacement: ' of the team' }, { regex: /within the general department/gi, replacement: ' within the organization' }, { regex: /the general department's/gi, replacement: 'this role\'s' }, { regex: /general department/gi, replacement: 'team' }, ];
  generalDeptPatterns.forEach(pattern => { cleanedText = cleanedText.replace(pattern.regex, pattern.replacement); });
  // Handle Specific Department Name
  if (departmentName && departmentName.toLowerCase() !== 'general') {
      const escapedDeptName = departmentName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const specificDeptPatterns = [ { regex: new RegExp(`for the ${escapedDeptName} Department`, 'gi'), replacement: ' for this role' }, { regex: new RegExp(`in the ${escapedDeptName} Department`, 'gi'), replacement: ' in this role' }, { regex: new RegExp(`of the ${escapedDeptName} Department`, 'gi'), replacement: ' of the team' }, { regex: new RegExp(`within the ${escapedDeptName} Department`, 'gi'), replacement: ' within the organization' }, { regex: new RegExp(`the ${escapedDeptName} Department's`, 'gi'), replacement: 'this role\'s' }, { regex: new RegExp(`${escapedDeptName} Department`, 'gi'), replacement: 'team' }, { regex: new RegExp(`for the ${escapedDeptName.toLowerCase()} department`, 'gi'), replacement: ' for this role' }, { regex: new RegExp(`in the ${escapedDeptName.toLowerCase()} department`, 'gi'), replacement: ' in this role' }, { regex: new RegExp(`of the ${escapedDeptName.toLowerCase()} department`, 'gi'), replacement: ' of the team' }, { regex: new RegExp(`within the ${escapedDeptName.toLowerCase()} department`, 'gi'), replacement: ' within the organization' }, { regex: new RegExp(`the ${escapedDeptName.toLowerCase()} department's`, 'gi'), replacement: 'this role\'s' }, { regex: new RegExp(`${escapedDeptName.toLowerCase()} department`, 'gi'), replacement: 'team' }, { regex: new RegExp(`\\b${escapedDeptName}\\b`, 'gi'), replacement: 'the team' }, ];
      specificDeptPatterns.forEach(pattern => { cleanedText = cleanedText.replace(pattern.regex, pattern.replacement); });
  }
  // Handle template-specific references
  const templatePatterns = [ { regex: /for the General purpose template/gi, replacement: '' }, { regex: /the General purpose template's/gi, replacement: 'their' }, { regex: /General purpose template/gi, replacement: 'overall' }, { regex: /for the General use template/gi, replacement: '' }, { regex: /the General use template's/gi, replacement: 'your' }, { regex: /General use template/gi, replacement: '' }, { regex: /\s+in the general use template/g, replacement: '' }, { regex: /\s+for the general use template/g, replacement: '' }, { regex: /\s+general purpose/gi, replacement: '' }, { regex: /\s+in general\b/gi, replacement: '' } ];
  templatePatterns.forEach(pattern => { cleanedText = cleanedText.replace(pattern.regex, pattern.replacement); });
  // Final cleanup
  cleanedText = cleanedText .replace(/achieve the goals\?/gi, 'achieve goals?') .replace(/ ,/g, ',') .replace(/ \./g, '.') .replace(/ \?/g, '?') .replace(/\s{2,}/g, ' ') .trim();
  if (cleanedText.length > 0) { cleanedText = cleanedText.charAt(0).toUpperCase() + cleanedText.slice(1); }
  return cleanedText;
}


// --- PASTE SIMPLIFIED PROMPT FUNCTION HERE ---
/**
* Creates a STRONGER prompt for analyzing documents and generating questions
* @param {string} documentType - Type of document
* @param {object} templateInfo - Template information { perspectiveSettings }
* @returns {string} - Formatted prompt
*/
function createAnalysisPrompt(documentType, templateInfo = {}) {
  const perspectiveSettings = templateInfo.perspectiveSettings || {};

  const perspectiveInstructions = Object.entries(perspectiveSettings)
    .filter(([_, settings]) => settings?.enabled)
    .map(([perspective, settings]) => {
       const name = perspective.toUpperCase().replace('_', ' ');
       const count = settings.questionCount || 10;
       // Simplified instruction:
       return `\n=== ${name} ASSESSMENT ===\nGenerate ${count} questions using the format below.`;
    })
    .join('');

  // Radically simplified prompt focusing ONLY on format and perspectives
  // ADDED INSTRUCTION AT THE VERY BEGINNING
  return `DO NOT write any introduction, explanation, or text before the first === header line. Your response MUST start directly with the first === header.

Generate 360 feedback questions based on the attached ${documentType.replace(/_/g, ' ')} document.

STRICT FORMATTING REQUIRED:
For each perspective listed below, provide the exact number of questions requested.
Use ONLY the following format for each question:

Question: [The question text]
Type: [rating or open_ended]
Category: [A relevant category]

DO NOT include any text before the first === header.
DO NOT include any text after the last question.
DO NOT include summaries, introductions, or explanations.
Refer to the subject as "this person" (or "you" for Self Assessment).
${perspectiveInstructions}
`;
}
// --- END NEW PROMPT FUNCTION ---

module.exports = {
  sanitizeQuestionText,
  createAnalysisPrompt
};
