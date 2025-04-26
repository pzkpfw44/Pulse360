// backend/services/prompt-helper.service.js

/**
 * Sanitizes question text to remove template artifacts
 * @param {string} text - The original question text
 * @param {string} departmentName - The department name
 * @returns {string} - The sanitized question text
 */
function sanitizeQuestionText(text, departmentName = '') {
  if (!text) return '';

  // First, handle department references
  let sanitized = text;

  // More comprehensive pattern matching
  const departmentPatterns = [
    /the leader in the (.*?) Department/gi,
    /in the General Department/gi,
    /for the General Department/gi,
    /within the General Department/gi,
    /at the General Department/gi,
    /General Department/gi,
    /the General department/gi,
    /general department/gi,
    /in general/gi
  ];

  const replacements = departmentName && departmentName !== 'General'
    ? [`in ${departmentName}`, `at ${departmentName}`, `within ${departmentName}`]
    : ['in their role', 'in the organization', 'within the organization'];

  // Apply all pattern replacements
  departmentPatterns.forEach((pattern, i) => {
    sanitized = sanitized.replace(pattern,
      i < replacements.length ? replacements[i] : replacements[0]);
  });

  // Replace template references
  sanitized = sanitized.replace(/for the General purpose template/gi, '');
  sanitized = sanitized.replace(/the General purpose template('s)?/gi, 'their');
  sanitized = sanitized.replace(/General purpose template/gi, 'overall');

  // Clean up any double spaces created by our replacements
  sanitized = sanitized.replace(/\s{2,}/g, ' ').trim();

  return sanitized;
}

/**
* Creates a prompt for analyzing documents and generating questions
* @param {string} documentType - Type of document
* @param {object} templateInfo - Template information
* @returns {string} - Formatted prompt
*/
function createAnalysisPrompt(documentType, templateInfo = {}) {
const perspectiveSettings = templateInfo.perspectiveSettings || {};
// Calculate the required question counts string for enabled perspectives
const counts = Object.entries(perspectiveSettings)
  .filter(([_, settings]) => settings.enabled) // Only include enabled perspectives
  .map(([perspective, settings]) => {
    // Map internal names to display names used in the prompt format
    let perspectiveName = perspective.toUpperCase();
    if (perspective === 'direct_report') perspectiveName = 'DIRECT REPORT';
    if (perspective === 'external') perspectiveName = 'EXTERNAL STAKEHOLDER';
    return `${perspectiveName}: ${settings.questionCount} questions`;
  })
  .join(', '); // Join with commas

// Construct the prompt using template literals
return `I need you to analyze documents and generate questions for a 360-degree feedback assessment.
Document Type: ${documentType.replace(/_/g, ' ')}
Purpose: ${templateInfo.purpose || 'Leadership assessment'}
Department: ${templateInfo.department || 'General'}

IMPORTANT: Generate the following EXACT number of questions for each perspective:
${counts}

FORMAT YOUR RESPONSE USING THIS EXACT STRUCTURE FOR EACH PERSPECTIVE:

=== MANAGER ASSESSMENT ===
Question: [Text of the question]
Type: [rating or open_ended]
Category: [A relevant category]

=== PEER ASSESSMENT ===
Question: [Text of the question]
Type: [rating or open_ended]
Category: [A relevant category]

=== DIRECT REPORT ASSESSMENT ===
Question: [Text of the question]
Type: [rating or open_ended]
Category: [A relevant category]

=== SELF ASSESSMENT ===
Question: [Text of the question]
Type: [rating or open_ended]
Category: [A relevant category]

=== EXTERNAL STAKEHOLDER ===
Question: [Text of the question]
Type: [rating or open_ended]
Category: [A relevant category]

Generate unique, non-duplicate questions for each perspective. For EXTERNAL STAKEHOLDER, focus on how the person interacts with clients, partners, or other organizations.`;
} //

module.exports = {
sanitizeQuestionText,
createAnalysisPrompt
};