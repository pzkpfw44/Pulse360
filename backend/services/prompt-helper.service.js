// backend/services/prompt-helper.service.js

/**
 * Sanitizes question text to remove template artifacts, department names,
 * and the word "General" when used incorrectly by the AI as a placeholder.
 * @param {string} text - The original question text
 * @param {string} departmentName - The department name (optional, used to detect if 'General' was the input)
 * @returns {string} - The sanitized question text
 */
function sanitizeQuestionText(text, departmentName = 'General') {
  if (!text || typeof text !== 'string') return '';

  // console.log(`Sanitizing: "${text}" with dept: "${departmentName}"`); // Uncomment for intense debugging

  let cleanedText = text.trim();

  // --- PRIORITY: Replace incorrect AI usage of "General" ---
  // This needs to happen BEFORE department/template replacements
  const isGeneralInput = departmentName && departmentName.toLowerCase() === 'general';

  if (isGeneralInput) {
      // More specific phrases first to avoid accidental replacements in valid contexts
      cleanedText = cleanedText.replace(/How would you rate the General's ability/gi, "How would you rate this person's ability");
      cleanedText = cleanedText.replace(/What are some areas where the General excels/gi, "What are some areas where this person excels");
      cleanedText = cleanedText.replace(/What are some areas where the General could improve/gi, "What are some areas where this person could improve");
      cleanedText = cleanedText.replace(/How does the General demonstrate/gi, "How does this person demonstrate");
      cleanedText = cleanedText.replace(/the General's/gi, "this person's"); // Possessive
      cleanedText = cleanedText.replace(/the General\b/gi, "this person");   // Word boundary to avoid replacing "general" in other contexts
      // Add more specific replacements if other patterns emerge
  }
  // --- END Priority Replacement ---


  // Handle standard leader/person references (apply AFTER specific "General" fix)
  cleanedText = cleanedText.replace(/the leader in the (.*?) Department/gi, 'this person');
  cleanedText = cleanedText.replace(/the leader/gi, 'this person'); // Replace "the leader" broadly
  cleanedText = cleanedText.replace(/this person's/gi, 'this person\'s'); // Ensure possessive apostrophe is correct


  // Handle "General Department" references specifically
  const generalDeptPatterns = [
      { regex: /for the General Department/gi, replacement: ' for this role' },
      { regex: /in the General Department/gi, replacement: ' in this role' },
      { regex: /of the General Department/gi, replacement: ' of the team' },
      { regex: /within the General Department/gi, replacement: ' within the organization' },
      { regex: /the General Department's/gi, replacement: 'this role\'s' },
      { regex: /General Department/gi, replacement: 'team' }, // Broader replacement last
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
      const escapedDeptName = departmentName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'); // Escape special regex characters
      const specificDeptPatterns = [
          // Patterns including "Department"
          { regex: new RegExp(`for the ${escapedDeptName} Department`, 'gi'), replacement: ' for this role' },
          { regex: new RegExp(`in the ${escapedDeptName} Department`, 'gi'), replacement: ' in this role' },
          { regex: new RegExp(`of the ${escapedDeptName} Department`, 'gi'), replacement: ' of the team' },
          { regex: new RegExp(`within the ${escapedDeptName} Department`, 'gi'), replacement: ' within the organization' },
          { regex: new RegExp(`the ${escapedDeptName} Department's`, 'gi'), replacement: 'this role\'s' },
          { regex: new RegExp(`${escapedDeptName} Department`, 'gi'), replacement: 'team' }, // Broader replacement last
          // Patterns including lowercase "department"
          { regex: new RegExp(`for the ${escapedDeptName.toLowerCase()} department`, 'gi'), replacement: ' for this role' },
          { regex: new RegExp(`in the ${escapedDeptName.toLowerCase()} department`, 'gi'), replacement: ' in this role' },
          { regex: new RegExp(`of the ${escapedDeptName.toLowerCase()} department`, 'gi'), replacement: ' of the team' },
          { regex: new RegExp(`within the ${escapedDeptName.toLowerCase()} department`, 'gi'), replacement: ' within the organization' },
          { regex: new RegExp(`the ${escapedDeptName.toLowerCase()} department's`, 'gi'), replacement: 'this role\'s' },
          { regex: new RegExp(`${escapedDeptName.toLowerCase()} department`, 'gi'), replacement: 'team' }, // Broader replacement last
          // Patterns with just the department name (use word boundaries) - replace with generic term
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
      { regex: /\s+in general\b/gi, replacement: '' } // remove dangling "in general"
  ];
  templatePatterns.forEach(pattern => {
      cleanedText = cleanedText.replace(pattern.regex, pattern.replacement);
  });


  // Final cleanup
  cleanedText = cleanedText
      // .replace(/the leader/gi, 'this person') // Covered by earlier replacements now
      .replace(/achieve the goals\?/gi, 'achieve goals?')
      .replace(/ ,/g, ',') // Fix space before comma
      .replace(/ \./g, '.') // Fix space before period
      .replace(/ \?/g, '?') // Fix space before question mark
      .replace(/\s{2,}/g, ' ') // Remove multiple spaces
      .trim();

  // Ensure the first letter is capitalized if the text is not empty
    if (cleanedText.length > 0) {
        cleanedText = cleanedText.charAt(0).toUpperCase() + cleanedText.slice(1);
    }

  // console.log(`Sanitized To: "${cleanedText}"`); // Uncomment for intense debugging
  return cleanedText;
}

/**
* Creates a prompt for analyzing documents and generating questions
* @param {string} documentType - Type of document
* @param {object} templateInfo - Template information { name, description, purpose, department, perspectiveSettings }
* @returns {string} - Formatted prompt
*/
function createAnalysisPrompt(documentType, templateInfo = {}) {
  const perspectiveSettings = templateInfo.perspectiveSettings || {};
  const purpose = templateInfo.purpose || 'Leadership assessment';
  const department = templateInfo.department || 'General';
  const description = templateInfo.description || 'General feedback';

  // Calculate the required question counts string for enabled perspectives
  const countsArray = Object.entries(perspectiveSettings)
    .filter(([_, settings]) => settings?.enabled) // Add safety check for settings object
    .map(([perspective, settings]) => {
      let perspectiveName = perspective.toUpperCase();
      if (perspective === 'direct_report') perspectiveName = 'DIRECT REPORT';
      if (perspective === 'external') perspectiveName = 'EXTERNAL STAKEHOLDER';
      // Ensure questionCount is a number, default if missing
      const count = typeof settings?.questionCount === 'number' ? settings.questionCount : 5;
      return `${perspectiveName}: ${count} questions`;
    });

   const counts = countsArray.join(', ');

  // Determine if external is enabled
  const externalEnabled = perspectiveSettings.external?.enabled;
  const externalCount = typeof perspectiveSettings.external?.questionCount === 'number' ? perspectiveSettings.external.questionCount : 0;

// Construct the prompt using template literals
// ADDED EXPLICIT NEGATIVE CONSTRAINTS
return `Analyze the attached document(s) and generate unique questions for a 360-degree feedback assessment.

CONTEXT FOR ASSESSMENT:
Document Type: ${documentType.replace(/_/g, ' ')}
Purpose: ${purpose}
Department/Function: ${department}
Focus Areas/Description: ${description}

CRITICAL INSTRUCTIONS - FOLLOW EXACTLY:
1.  **SUBJECT:** Refer to the person being assessed as "this person", "the individual", or "they/them". For Self Assessment, use "you/your". **DO NOT use the words "${purpose}", "${department}", or "${description}" as a substitute for the person's name or title.** For example, DO NOT write "How would you rate the ${department}'s ability...". Instead, write "How would you rate this person's ability...".
2.  **QUESTION COUNT:** Generate the following EXACT number of unique, non-duplicate questions for each enabled perspective: ${counts}. Do not generate questions for disabled perspectives.
3.  **RESPONSE FORMAT:** Adhere STRICTLY to the required response format below. Do NOT include any extra text, explanations, summaries, introductions, or apologies. ONLY provide the formatted questions.
4.  **RELEVANCE:** Ensure questions are relevant to the document content, document type, purpose, and focus areas provided above.
5.  **QUESTION TYPES:** Include a mix of 'rating' and 'open_ended' questions for each perspective. Phrase 'rating' questions for a Likert scale (e.g., "How effectively...", "To what extent..."). Phrase 'open_ended' questions to ask for specific examples or details (e.g., "Provide examples of...", "Describe how...").
6.  **AVOID DEPARTMENT/METADATA IN QUESTIONS:** Do NOT include specific department names (like "${department} Department") or metadata words ("${purpose}", "${description}") directly in the question text itself. Use generic phrases like "in this role", "within the team", "in the organization", "for their position" instead.

REQUIRED RESPONSE FORMAT (USE EXACTLY):

=== MANAGER ASSESSMENT ===
Question: [Text of the question for Manager perspective]
Type: [rating or open_ended]
Category: [A relevant category, e.g., Strategic Thinking]

=== PEER ASSESSMENT ===
Question: [Text of the question for Peer perspective]
Type: [rating or open_ended]
Category: [A relevant category, e.g., Collaboration]

=== DIRECT REPORT ASSESSMENT ===
Question: [Text of the question for Direct Report perspective]
Type: [rating or open_ended]
Category: [A relevant category, e.g., Team Development]

=== SELF ASSESSMENT ===
Question: [Text of the question for Self perspective]
Type: [rating or open_ended]
Category: [A relevant category, e.g., Self-Awareness]

${externalEnabled ? `
=== EXTERNAL STAKEHOLDER ASSESSMENT ===
Question: [Text of the question for External Stakeholder perspective, focusing on interactions with clients, partners, or external parties]
Type: [rating or open_ended]
Category: [A relevant category, e.g., Client Focus, Partnership Building, Professionalism]
` : ''/* End of External Stakeholder Format */}
${externalEnabled && externalCount > 0 ? `\nREMEMBER: Generate exactly ${externalCount} unique questions for EXTERNAL STAKEHOLDER ASSESSMENT focusing on external interactions.` : ''}

FINAL CHECK: Ensure ONLY the formatted questions are present in your response, respecting the exact counts and subject references. Do not add any introductory or concluding remarks.
`;
} // End of createAnalysisPrompt function

// Ensure both functions are exported
module.exports = {
  sanitizeQuestionText,
  createAnalysisPrompt
};