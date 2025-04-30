// backend/services/prompt-helper.service.js

/**
 * Sanitizes question text to remove template artifacts, department names,
 * and the word "General" when used incorrectly by the AI as a placeholder.
 * @param {string} text - The original question text
 * @param {string} departmentName - The department name (optional, used to detect if 'General' was the input)
 * @returns {string} - The sanitized question text
 */
function sanitizeQuestionText(text, departmentName = 'General') {
  // --- (Keep the existing sanitizeQuestionText function unchanged) ---
  if (!text || typeof text !== 'string') return '';

  // console.log(`Sanitizing: "${text}" with dept: "${departmentName}"`); // Uncomment for intense debugging

  let cleanedText = text.trim();

  // --- PRIORITY: Replace incorrect AI usage of "General" ---
  const isGeneralInput = departmentName && departmentName.toLowerCase() === 'general';

  if (isGeneralInput) {
      // More specific phrases first
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

  // Handle "General Department" references specifically
  const generalDeptPatterns = [
      { regex: /for the General Department/gi, replacement: ' for this role' },
      { regex: /in the General Department/gi, replacement: ' in this role' },
      { regex: /of the General Department/gi, replacement: ' of the team' },
      { regex: /within the General Department/gi, replacement: ' within the organization' },
      { regex: /the General Department's/gi, replacement: 'this role\'s' },
      { regex: /General Department/gi, replacement: 'team' },
      // lowercase versions
      { regex: /for the general department/gi, replacement: ' for this role' },
      { regex: /in the general department/gi, replacement: ' in this role' },
      { regex: /of the general department/gi, replacement: ' of the team' },
      { regex: /within the general department/gi, replacement: ' within the organization' },
      { regex: /the general department's/gi, replacement: 'this role\'s' },
      { regex: /general department/gi, replacement: 'team' },
  ];
  generalDeptPatterns.forEach(pattern => {
      cleanedText = cleanedText.replace(pattern.regex, pattern.replacement);
  });

  // Handle Specific Department Name (if provided and not "General")
  if (departmentName && departmentName.toLowerCase() !== 'general') {
      const escapedDeptName = departmentName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const specificDeptPatterns = [
          // Patterns including "Department" / "department"
          { regex: new RegExp(`for the ${escapedDeptName} Department`, 'gi'), replacement: ' for this role' },
          { regex: new RegExp(`in the ${escapedDeptName} Department`, 'gi'), replacement: ' in this role' },
          { regex: new RegExp(`of the ${escapedDeptName} Department`, 'gi'), replacement: ' of the team' },
          { regex: new RegExp(`within the ${escapedDeptName} Department`, 'gi'), replacement: ' within the organization' },
          { regex: new RegExp(`the ${escapedDeptName} Department's`, 'gi'), replacement: 'this role\'s' },
          { regex: new RegExp(`${escapedDeptName} Department`, 'gi'), replacement: 'team' },
          { regex: new RegExp(`for the ${escapedDeptName.toLowerCase()} department`, 'gi'), replacement: ' for this role' },
          { regex: new RegExp(`in the ${escapedDeptName.toLowerCase()} department`, 'gi'), replacement: ' in this role' },
          { regex: new RegExp(`of the ${escapedDeptName.toLowerCase()} department`, 'gi'), replacement: ' of the team' },
          { regex: new RegExp(`within the ${escapedDeptName.toLowerCase()} department`, 'gi'), replacement: ' within the organization' },
          { regex: new RegExp(`the ${escapedDeptName.toLowerCase()} department's`, 'gi'), replacement: 'this role\'s' },
          { regex: new RegExp(`${escapedDeptName.toLowerCase()} department`, 'gi'), replacement: 'team' },
          // Just the department name
          { regex: new RegExp(`\\b${escapedDeptName}\\b`, 'gi'), replacement: 'the team' },
      ];
      specificDeptPatterns.forEach(pattern => {
          cleanedText = cleanedText.replace(pattern.regex, pattern.replacement);
      });
  }

  // Handle template-specific references
  const templatePatterns = [
      { regex: /for the General purpose template/gi, replacement: '' },
      { regex: /the General purpose template's/gi, replacement: 'their' },
      { regex: /General purpose template/gi, replacement: 'overall' },
      { regex: /for the General use template/gi, replacement: '' },
      { regex: /the General use template's/gi, replacement: 'your' },
      { regex: /General use template/gi, replacement: '' },
      { regex: /\s+in the general use template/g, replacement: '' },
      { regex: /\s+for the general use template/g, replacement: '' },
      { regex: /\s+general purpose/gi, replacement: '' },
      { regex: /\s+in general\b/gi, replacement: '' }
  ];
  templatePatterns.forEach(pattern => {
      cleanedText = cleanedText.replace(pattern.regex, pattern.replacement);
  });

  // Final cleanup
  cleanedText = cleanedText
      .replace(/achieve the goals\?/gi, 'achieve goals?')
      .replace(/ ,/g, ',')
      .replace(/ \./g, '.')
      .replace(/ \?/g, '?')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (cleanedText.length > 0) {
        cleanedText = cleanedText.charAt(0).toUpperCase() + cleanedText.slice(1);
    }

  // console.log(`Sanitized To: "${cleanedText}"`); // Uncomment for intense debugging
  return cleanedText;
}

/**
* Creates a prompt for analyzing documents and generating questions
* @param {string} documentType - Type of document
* @param {object} templateInfo - Template information { name, description, purpose, department, perspectiveSettings, questionMixPercentage }
* @returns {string} - Formatted prompt
*/
// --- START: MODIFY createAnalysisPrompt TO USE templateInfo ---
function createAnalysisPrompt(documentType, templateInfo = {}) {
  // Destructure properties from templateInfo, providing defaults
  const {
      perspectiveSettings = {},
      purpose = 'Leadership assessment',
      department = 'General',
      description = 'General feedback',
      questionMixPercentage = 75 // Default mix if not provided
  } = templateInfo;

  // Calculate the open-ended percentage
  const openEndedPercentage = 100 - questionMixPercentage;

  // Calculate the required question counts string for enabled perspectives
  const buffer = 5; // Extra questions to request per perspective
  const countsArray = Object.entries(perspectiveSettings)
    .filter(([_, settings]) => settings?.enabled)
    .map(([perspective, settings]) => {
      let perspectiveName = perspective.toUpperCase();
      if (perspective === 'direct_report') perspectiveName = 'DIRECT REPORT';
      if (perspective === 'external') perspectiveName = 'EXTERNAL STAKEHOLDER';

      const actualCount = typeof settings?.questionCount === 'number' ? settings.questionCount : 5;
      const requestCount = actualCount + buffer; // Request more than needed

      return `${perspectiveName}: ${requestCount} questions (we'll select the best ${actualCount})`;
    });
  const counts = countsArray.join(', ');

  // Determine if external is enabled
  const externalEnabled = perspectiveSettings.external?.enabled;
  // No need for externalCount calculation here unless used later in the prompt

  // Construct the prompt using template literals
  return `Analyze the attached document(s) and generate unique questions for a 360-degree feedback assessment.

CONTEXT FOR ASSESSMENT:
Document Type: ${documentType.replace(/_/g, ' ')}
Purpose: ${purpose}
Department/Function: ${department}
Focus Areas/Description: ${description}

CRITICAL INSTRUCTIONS - FOLLOW THE EXACT FORMAT BELOW:
1. Generate high-quality 360-degree feedback questions.
2. Use ONLY the following format - this is mandatory:

=== MANAGER ASSESSMENT ===
Question: [Manager question text]
Type: [rating or open_ended]
Category: [Category name]

=== PEER ASSESSMENT ===
Question: [Peer question text]
Type: [rating or open_ended]
Category: [Category name]

=== DIRECT REPORT ASSESSMENT ===
Question: [Direct report question text]
Type: [rating or open_ended]
Category: [Category name]

=== SELF ASSESSMENT ===
Question: [Self question text]
Type: [rating or open_ended]
Category: [Category name]

${externalEnabled ? `=== EXTERNAL STAKEHOLDER ASSESSMENT ===
Question: [External stakeholder question text]
Type: [rating or open_ended]
Category: [Category name]
` : ''}

IMPORTANT GUIDELINES:
1. **FORMAT REQUIREMENTS:**
   - Each section MUST start with "=== PERSPECTIVE ASSESSMENT ===" (using exact === symbols)
   - Each question MUST use the "Question:", "Type:", "Category:" format exactly
   - DO NOT number questions or add extra formatting

2. **QUANTITY:** Generate these exact numbers of questions:
   ${counts}

3. **SUBJECT REFERENCES:** Refer to the person being assessed as "this person" for manager/peer/direct report/external. Use "you/your" for self-assessment.

4. **QUESTION TYPE MIX:** Generate approximately **${questionMixPercentage}% 'rating'** questions (e.g., "How effectively...") and **${openEndedPercentage}% 'open_ended'** questions (e.g., "Describe how..."). Distribute this mix across all requested perspectives.

5. **AVOID REFERENCES:** DO NOT include specific department names (like "${department} Department") in questions. Use generic phrases like "in this role", "within the team", etc.

6. **STRICTLY ADHERE TO FORMAT:** Do not add any introductions, explanations, notes, or conclusions. ONLY include the specified sections and question format.

Remember: The EXACT format with "===" section headers and proper indentation is critical for automated processing. Adherence to the QUESTION TYPE MIX is also very important.
`;
}
// --- END: MODIFY createAnalysisPrompt TO USE templateInfo ---

// Ensure both functions are exported
module.exports = {
  sanitizeQuestionText,
  createAnalysisPrompt
};