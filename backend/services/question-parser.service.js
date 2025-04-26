// backend/services/question-parser.service.js

/**
 * Sanitizes question text by removing department/template references
 * @param {string} text - The question text to sanitize
 * @param {string} departmentName - The department name to sanitize (default: 'General')
 * @returns {string} - Sanitized question text
 */
function sanitizeQuestionText(text, departmentName = 'General') {
  // (Original sanitizeQuestionText function remains unchanged)
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
  // Initialize result by perspective
  const questionsByPerspective = {
    manager: [],
    peer: [],
    direct_report: [],
    self: [],
    external: [] // Use 'external' to match perspectiveSettings keys
  };

  // Check for invalid input
  if (!aiResponse || typeof aiResponse !== 'string') {
      console.error('Invalid AI response provided to parser.');
      return [];
  }

  // Try multiple section divider patterns, ordered from most specific to least
  const sectionPatterns = [
    /===\s*(MANAGER|PEER|DIRECT REPORT|SELF|EXTERNAL STAKEHOLDER)\s*ASSESSMENT\s*===/gi, // Exact format requested
    /\n\s*(MANAGER|PEER|DIRECT REPORT|SELF|EXTERNAL STAKEHOLDER)\s*ASSESSMENT\s*:\s*\n/gi, // Format with colon
    /\n\s*(MANAGER|PEER|DIRECT REPORT|SELF|EXTERNAL STAKEHOLDER)\s*ASSESSMENT\s*\n/gi // Format without colon
  ];

  // Find the first pattern that successfully divides the text
  let sections = [];
  let currentPattern = null;
  let perspectiveMap = {}; // To store mapping from regex capture group index to perspective

  for (const pattern of sectionPatterns) {
    // Use regex.exec in a loop to capture both the delimiter and the text after it
    let lastIndex = 0;
    let match;
    const tempSections = [];
    const tempPerspectiveMap = {};
    let matchFound = false;

    // Reset regex state
    pattern.lastIndex = 0;

    while ((match = pattern.exec(aiResponse)) !== null) {
        matchFound = true;
        // The perspective name is in match[1]
        const perspectiveHeader = match[1].toUpperCase();
        // Map perspective names consistently
        let perspectiveKey;
        if (perspectiveHeader === 'DIRECT REPORT') perspectiveKey = 'direct_report';
        else if (perspectiveHeader === 'EXTERNAL STAKEHOLDER') perspectiveKey = 'external';
        else perspectiveKey = perspectiveHeader.toLowerCase();

        // Add the perspective key itself as a marker
        tempSections.push(perspectiveKey);
        // Add the text content between this header and the previous one (or start)
        const content = aiResponse.substring(lastIndex, match.index).trim();
        if (content) {
          tempSections.push(content);
        }
        // Store mapping (useful if splitting later)
        tempPerspectiveMap[tempSections.length -1] = perspectiveKey; // Map content index to perspective

        lastIndex = pattern.lastIndex;
    }

     // Add the remaining text after the last match
    if (matchFound) {
        const remainingContent = aiResponse.substring(lastIndex).trim();
        if (remainingContent) {
          tempSections.push(remainingContent);
        }
        // If the last section needs mapping (assuming it belongs to the last matched perspective)
        if (tempSections.length > 0 && typeof tempSections[tempSections.length-1] === 'string' && tempSections.length-2 >= 0) {
            const lastPerspectiveMarkerIndex = Math.floor((tempSections.length - 2) / 2) * 2 ; // Find index of last perspective marker
            if (tempSections[lastPerspectiveMarkerIndex]){
                tempPerspectiveMap[tempSections.length - 1] = tempSections[lastPerspectiveMarkerIndex];
            }
        }
    }


    // If this pattern successfully split the text into multiple parts (header + content)
    if (tempSections.length > 1) {
      console.log(`Found pattern match: ${pattern}`);
      sections = tempSections; // Use these sections
      perspectiveMap = tempPerspectiveMap;
      currentPattern = pattern; // Store the successful pattern
      break; // Stop searching for patterns
    }
  }


  // --- Processing Logic ---

  // Case 1: Sections were successfully identified using patterns
  if (sections.length > 1) {
    console.log(`Processing ${sections.length / 2} potential sections based on headers.`); // Each section has a header and content
    let currentPerspective = null;

    for (let i = 0; i < sections.length; i++) {
      const item = sections[i];

      // If it's a perspective key (string marker we added)
      if (typeof item === 'string' && ['manager', 'peer', 'direct_report', 'self', 'external'].includes(item)) {
        currentPerspective = item;
        console.log(`Identified section for: ${currentPerspective}`);
        continue; // Move to the next item which should be the content
      }

      // If it's content (string) and we have a current perspective
      if (typeof item === 'string' && currentPerspective && questionsByPerspective[currentPerspective]) {
        const sectionContent = item.trim();
        const questionRegex = /Question:\s*(.*?)(?:\r?\n|\r|$)(?:Type:\s*(.*?)(?:\r?\n|\r|$))?(?:Category:\s*(.*?)(?:\r?\n|\r|$))?/gis;
        let qMatch;

        console.log(`Parsing content for ${currentPerspective}...`);
        while ((qMatch = questionRegex.exec(sectionContent)) !== null) {
          const questionText = qMatch[1]?.trim() || '';
          const questionType = (qMatch[2]?.trim() || 'rating').toLowerCase();
          const category = qMatch[3]?.trim() || 'General';

          if (questionText) {
            questionsByPerspective[currentPerspective].push({
              text: questionText,
              type: questionType === 'open_ended' ? 'open_ended' : 'rating',
              category: category,
              perspective: currentPerspective,
              required: true, // Assuming required unless specified otherwise
              order: questionsByPerspective[currentPerspective].length + 1
            });
            console.log(`  -> Added question: "${questionText.substring(0, 30)}..."`);
          }
        }
      } else if (typeof item === 'string' && !currentPerspective) {
          console.log("Skipping content block found before the first perspective header:", item.substring(0, 50) + "...");
      }
    }
  }
  // Case 2: No section patterns matched, try fallback keyword-based approach
  else {
    console.log("No section patterns matched reliably, searching for key markers as fallback.");

    // Keywords to associate text context with perspectives
    const perspectiveKeywords = {
      "manager": ["manager", "supervisor", "leadership role"],
      "peer": ["peer", "colleague", "coworker", "team member", "teamwork"],
      "direct_report": ["direct report", "subordinate", "team member", "manages", "reports"],
      "self": ["self", "yourself", "own", "personal"],
      "external": ["external", "stakeholder", "client", "partner", "customer", "vendor"]
    };

    // Regex to find potential question blocks
    const questionRegex = /Question:\s*(.*?)(?:\r?\n|\r|$)(?:Type:\s*(.*?)(?:\r?\n|\r|$))?(?:Category:\s*(.*?)(?:\r?\n|\r|$))?/gis;
    let match;

    while ((match = questionRegex.exec(aiResponse)) !== null) {
      const questionText = match[1]?.trim() || '';
      const questionType = (match[2]?.trim() || 'rating').toLowerCase();
      const category = match[3]?.trim() || 'General';

      if (questionText) {
        let assignedPerspective = null;
        // Look for perspective markers immediately before the question
        const contextBefore = aiResponse.substring(Math.max(0, match.index - 150), match.index).toLowerCase(); // Check 150 chars before

        // Check for explicit headers first
        if (/===\s*MANAGER\s*ASSESSMENT\s*===/.test(contextBefore)) assignedPerspective = 'manager';
        else if (/===\s*PEER\s*ASSESSMENT\s*===/.test(contextBefore)) assignedPerspective = 'peer';
        else if (/===\s*DIRECT REPORT\s*ASSESSMENT\s*===/.test(contextBefore)) assignedPerspective = 'direct_report';
        else if (/===\s*SELF\s*ASSESSMENT\s*===/.test(contextBefore)) assignedPerspective = 'self';
        else if (/===\s*EXTERNAL STAKEHOLDER\s*ASSESSMENT\s*===/.test(contextBefore)) assignedPerspective = 'external';

        // If no explicit header found, check for keywords
        if (!assignedPerspective) {
          for (const [perspective, keywords] of Object.entries(perspectiveKeywords)) {
            for (const keyword of keywords) {
              if (contextBefore.includes(keyword)) {
                assignedPerspective = perspective;
                console.log(`Assigned perspective '${perspective}' based on keyword '${keyword}' near: "${questionText.substring(0, 30)}..."`);
                break;
              }
            }
            if (assignedPerspective) break;
          }
        }

        // Default to "peer" if no perspective can be determined (or maybe skip?)
        // Let's default to peer as per the original fallback logic
        assignedPerspective = assignedPerspective || "peer";
        console.log(`Assigning perspective '${assignedPerspective}' to question: "${questionText.substring(0, 30)}..." (Defaulted: ${assignedPerspective === 'peer' && !contextBefore.includes('peer')})`);


        // Add the question to the appropriate perspective if the key exists
        if (questionsByPerspective[assignedPerspective]) {
             questionsByPerspective[assignedPerspective].push({
                text: questionText,
                type: questionType === 'open_ended' ? 'open_ended' : 'rating',
                category: category,
                perspective: assignedPerspective,
                required: true,
                order: questionsByPerspective[assignedPerspective].length + 1
            });
        } else {
            console.warn(`Could not assign question to unknown perspective key: ${assignedPerspective}`)
        }

      }
    }
  }

  // Calculate total questions found
  const totalQuestions = Object.values(questionsByPerspective)
    .reduce((sum, questions) => sum + questions.length, 0);
  console.log(`Successfully parsed ${totalQuestions} questions from AI response`);

  // Check for empty perspectives and log warnings
  const emptyPerspectives = Object.entries(perspectiveSettings)
    .filter(([perspective, settings]) => settings?.enabled && (!questionsByPerspective[perspective] || questionsByPerspective[perspective].length === 0))
    .map(([perspective]) => perspective);

  if (emptyPerspectives.length > 0) {
    console.log(`WARNING: No questions found for enabled perspectives: ${emptyPerspectives.join(', ')}`);
    console.log(`Consider a second AI call specifically targeting these perspectives, or review the AI response structure.`);
  }

  // Return the result as a flat array for backward compatibility
  return Object.values(questionsByPerspective).flat();
} //


/**
 * Deduplicates questions based on perspective and text similarity
 * @param {Array} questions - Array of question objects
 * @returns {Array} - Deduplicated array of questions
 */
function deduplicateQuestions(questions) {
  // (Original deduplicateQuestions function remains unchanged)
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
  // (Original calculateSimilarity function remains unchanged)
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  // Simple word overlap coefficient
  const words1 = new Set(str1.split(' '));
  const words2 = new Set(str2.split(' '));

  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const smaller = Math.min(words1.size, words2.size);

  // Avoid division by zero
  return smaller === 0 ? 0.0 : intersection.size / smaller;
}


/**
 * Ensures we have the exact requested number of questions for each perspective
 * @param {Object} questionsMap - Questions grouped by perspective
 * @param {Object} perspectiveSettings - Settings with question counts
 * @param {string} documentType - Type of document
 * @returns {Object} - Balanced questions (grouped by perspective)
 */
function ensurePerspectiveQuestionCounts(questionsMap, perspectiveSettings, documentType) {
  // (Original ensurePerspectiveQuestionCounts function remains unchanged, but added require statement check)
  let generateFallbackQuestions;
  try {
    // Assuming fallback-questions.service is in the same directory or accessible path
    generateFallbackQuestions = require('./fallback-questions.service').generateFallbackQuestions;
  } catch (error) {
    console.error("Failed to load fallback-questions.service. Fallback questions will not be generated.", error);
    // Provide a dummy function to avoid errors later if the service is missing
    generateFallbackQuestions = () => [];
  }

  const result = {}; // Result will be a map grouped by perspective

  // Process each perspective defined in the settings
  for (const perspective in perspectiveSettings) {
    // Skip disabled perspectives
    if (!perspectiveSettings[perspective]?.enabled) {
      console.log(`Skipping disabled perspective: ${perspective}`);
      continue;
    }

    const targetCount = perspectiveSettings[perspective]?.questionCount || 5; // Default to 5 if not specified
    const availableQuestions = questionsMap[perspective] || [];
    console.log(`Ensuring question count for ${perspective}: Target=${targetCount}, Found=${availableQuestions.length}`);


    if (availableQuestions.length < targetCount) {
      // Need to generate more questions
      const neededCount = targetCount - availableQuestions.length;
      console.log(`Generating ${neededCount} fallback questions for ${perspective}.`);
      const fallbackQuestions = generateFallbackQuestions(
        perspective,
        neededCount,
        documentType,
        availableQuestions // Pass existing questions to avoid duplicates
      );

      // Combine existing and new questions
      result[perspective] = [...availableQuestions, ...fallbackQuestions];
       console.log(` -> Total questions for ${perspective} after fallback: ${result[perspective].length}`);
    } else if (availableQuestions.length > targetCount) {
      // Need to select a subset of questions (simple slice for now)
      console.log(`Trimming questions for ${perspective} from ${availableQuestions.length} to ${targetCount}.`);
      result[perspective] = availableQuestions.slice(0, targetCount);
    } else {
      // We have exactly the right number
      console.log(`Exact number of questions (${targetCount}) found for ${perspective}.`);
      result[perspective] = availableQuestions;
    }
  }

  // Ensure all expected perspective keys exist in the result, even if empty
   for (const perspective in perspectiveSettings) {
       if (perspectiveSettings[perspective]?.enabled && !result[perspective]) {
           result[perspective] = [];
       }
   }


  return result; // Return the map
}


module.exports = {
  parseQuestionsFromAiResponse, // Updated function
  sanitizeQuestionText,
  deduplicateQuestions,
  ensurePerspectiveQuestionCounts // Keep existing exports
  // calculateSimilarity is a helper, might not need export unless used elsewhere
};