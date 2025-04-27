// backend/services/question-parser.service.js

/**
 * Sanitizes question text by removing department/template references
 * @param {string} text - The question text to sanitize
 * @param {string} departmentName - The department name to sanitize (default: 'General')
 * @returns {string} - Sanitized question text
 */
function sanitizeQuestionText(text, departmentName = 'General') {
    // Function to sanitize text - remains the same as provided previously
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
 * Parses questions from AI response and returns a map grouped by perspective (NOT a flat array)
 * @param {string} aiResponse - The text response from AI
 * @param {Object} perspectiveSettings - Settings for perspectives
 * @returns {Object} - Map of questions grouped by perspective
 */
function parseQuestionsFromAiResponse(aiResponse, perspectiveSettings = {}) {
    const questionsByPerspective = {
        manager: [],
        peer: [],
        direct_report: [],
        self: [],
        external: []
    };

    if (!aiResponse || typeof aiResponse !== 'string') {
        console.error('Invalid AI response provided to parser.');
        return questionsByPerspective; // Return empty map instead of empty array
    }
    console.log('Starting AI Response Parsing...');

    // Define the patterns for splitting, including capturing the perspective name
    // Using a single, more robust pattern covering variations.
    // It captures the perspective name (GROUP 1) right after the separator (=== or newline)
    // It looks for MANAGER, PEER, DIRECT REPORT, SELF, or EXTERNAL STAKEHOLDER followed by ASSESSMENT
    const sectionSplitPattern =
        /(?:^|\n)\s*(?:===?\s*)?(MANAGER|PEER|DIRECT REPORT|SELF|EXTERNAL STAKEHOLDER)\s*ASSESSMENT\s*(?:[:.]|===)?\s*\n/i;

    // Split the response by the pattern. The pattern captures the delimiter,
    // so the resulting array will interleave content and perspective names.
    // Example: [ content_before_first_header, header1, content_after_header1, header2, content_after_header2, ...]
    const parts = aiResponse.split(sectionSplitPattern);

    console.log(`Split AI response into ${parts.length} parts.`);

    let currentPerspective = null;

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i]?.trim();
        if (!part) continue; // Skip empty parts resulting from split

        // Check if the part matches one of the perspective names (captured by the regex)
        const perspectiveMatch = /^(MANAGER|PEER|DIRECT REPORT|SELF|EXTERNAL STAKEHOLDER)$/i.exec(part);

        if (perspectiveMatch) {
            // This part is a perspective header captured by the split regex
            const perspectiveHeader = perspectiveMatch[1].toUpperCase();
            if (perspectiveHeader === 'DIRECT REPORT') currentPerspective = 'direct_report';
            else if (perspectiveHeader === 'EXTERNAL STAKEHOLDER') currentPerspective = 'external';
            else currentPerspective = perspectiveHeader.toLowerCase();
            console.log(`Identified Perspective Header: ${currentPerspective}`);
        } else if (currentPerspective) {
            // This part is content following a known perspective header
            console.log(`Processing content for perspective: ${currentPerspective}`);
            const sectionContent = part;
            // Regex to find Question:, Type:, Category: blocks within the content
            const questionRegex = /Question:\s*(.*?)(?:\r?\n|\r|$)(?:Type:\s*(.*?)(?:\r?\n|\r|$))?(?:Category:\s*(.*?)(?:\r?\n|\r|$))?/gis;
            let qMatch;

            while ((qMatch = questionRegex.exec(sectionContent)) !== null) {
                const questionText = qMatch[1]?.trim();
                const questionType = (qMatch[2]?.trim() || 'rating').toLowerCase();
                const category = qMatch[3]?.trim() || 'General';

                if (questionText && questionsByPerspective[currentPerspective]) {
                    questionsByPerspective[currentPerspective].push({
                        text: questionText,
                        type: questionType === 'open_ended' ? 'open_ended' : 'rating',
                        category: category,
                        perspective: currentPerspective,
                        required: true, // Assuming required unless specified otherwise
                        order: questionsByPerspective[currentPerspective].length + 1 // Temporary order within perspective
                    });
                    console.log(`  -> Added question [${currentPerspective}]: "${questionText.substring(0, 40)}..."`);
                }
            }
        } else {
             console.log(`Skipping content part found before first recognized header or with unknown perspective: "${part.substring(0, 60)}..."`);
        }
    }

    // --- Fallback (Optional - if the split logic fails entirely) ---
    const totalQuestionsFound = Object.values(questionsByPerspective).reduce((sum, qArr) => sum + qArr.length, 0);
    if (totalQuestionsFound === 0 && aiResponse.length > 0) {
        console.warn("Primary parsing failed to find any questions via section headers. Attempting global fallback search...");
        // Simple fallback to look for standalone Question: blocks anywhere in the text
        const globalQuestionRegex = /Question:\s*(.*?)(?:\r?\n|\r|$)(?:Type:\s*(.*?)(?:\r?\n|\r|$))?(?:Category:\s*(.*?)(?:\r?\n|\r|$))?/gis;
        let gMatch;
        const defaultPerspective = 'peer'; // If we can't determine perspective, use peer as default
        
        while ((gMatch = globalQuestionRegex.exec(aiResponse)) !== null) {
            const questionText = gMatch[1]?.trim();
            const questionType = (gMatch[2]?.trim() || 'rating').toLowerCase();
            const category = gMatch[3]?.trim() || 'General';
            
            if (questionText) {
                // Try to guess the perspective from surrounding context (20 chars before)
                const beforeContext = aiResponse.substring(Math.max(0, gMatch.index - 100), gMatch.index).toLowerCase();
                let guessedPerspective = defaultPerspective;
                
                if (beforeContext.includes('manager')) guessedPerspective = 'manager';
                else if (beforeContext.includes('peer')) guessedPerspective = 'peer';
                else if (beforeContext.includes('direct report')) guessedPerspective = 'direct_report';
                else if (beforeContext.includes('self')) guessedPerspective = 'self';
                else if (beforeContext.includes('external')) guessedPerspective = 'external';
                
                questionsByPerspective[guessedPerspective].push({
                    text: questionText,
                    type: questionType === 'open_ended' ? 'open_ended' : 'rating',
                    category: category,
                    perspective: guessedPerspective,
                    required: true,
                    order: questionsByPerspective[guessedPerspective].length + 1
                });
                console.log(`  -> Added question via global fallback [${guessedPerspective}]: "${questionText.substring(0, 40)}..."`);
            }
        }
    }

    // --- Post-processing and Logging ---
    console.log(`Successfully parsed ${totalQuestionsFound} questions from AI response via primary section method.`);

    // Deduplication step BEFORE adding fallbacks
    const deduplicatedQuestionsByPerspective = {};
    // Process each perspective to deduplicate questions
    Object.keys(questionsByPerspective).forEach(perspective => {
        deduplicatedQuestionsByPerspective[perspective] = deduplicateQuestions(
            questionsByPerspective[perspective]
        );
    });

    // Re-assign order for each perspective separately
    Object.keys(deduplicatedQuestionsByPerspective).forEach(perspective => {
        deduplicatedQuestionsByPerspective[perspective] = deduplicatedQuestionsByPerspective[perspective].map(
            (question, index) => ({
                ...question,
                order: index + 1 // Update order based on new index after deduplication
            })
        );
    });

    // Check for empty perspectives AND log warning
    const finalQuestionCounts = {};
    Object.keys(deduplicatedQuestionsByPerspective).forEach(p => {
        finalQuestionCounts[p] = deduplicatedQuestionsByPerspective[p]?.length || 0;
    });
    console.log("Final counts per perspective after parsing and deduplication:", finalQuestionCounts);

    const emptyPerspectives = Object.entries(perspectiveSettings || {})
        .filter(([perspective, settings]) => settings?.enabled && finalQuestionCounts[perspective] === 0)
        .map(([perspective]) => perspective);

    if (emptyPerspectives.length > 0) {
        console.error(`CRITICAL WARNING: No AI questions parsed for enabled perspectives: ${emptyPerspectives.join(', ')}. Fallback questions will be used by ensurePerspectiveQuestionCounts unless a second AI call is implemented.`);
    }

    // IMPORTANT CHANGE: Return the map of questions grouped by perspective
    // instead of a flat array. This ensures the calling code can correctly
    // process questions for each perspective.
    return deduplicatedQuestionsByPerspective;
}


/**
 * Deduplicates questions based on perspective and text similarity
 * @param {Array} questions - Array of question objects
 * @returns {Array} - Deduplicated array of questions
 */
function deduplicateQuestions(questions) {
    // Function to deduplicate questions - remains the same as provided previously
    const uniqueQuestions = [];
    const textMap = new Set(); // Set of normalized question texts

    for (const question of questions) {
        // Normalize the question text for comparison (lowercase, no punctuation, trimmed)
        const normalizedText = question.text
            .toLowerCase()
            .replace(/[.,?!;:]/g, '') // Remove common punctuation
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

        let isDuplicate = false;

        // Check for exact match first
        if (textMap.has(normalizedText)) {
            isDuplicate = true;
        } else {
             // If not exact match, check for high similarity with existing questions
             for (const existingQuestion of uniqueQuestions) {
                const existingText = existingQuestion.text
                    .toLowerCase()
                    .replace(/[.,?!;:]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                
                // Use the calculateSimilarity function
                if (calculateSimilarity(normalizedText, existingText) > 0.85) { // Using stricter threshold
                    isDuplicate = true;
                    break;
                }
            }
        }

        if (!isDuplicate) {
            textMap.add(normalizedText); // Add normalized text to prevent future duplicates
            uniqueQuestions.push(question); // Add the original question object
        }
    }
    return uniqueQuestions;
}

/**
 * Calculate similarity between two strings (0-1 scale) - Simple word overlap
 * @param {string} str1 - First string (normalized, no punctuation)
 * @param {string} str2 - Second string (normalized, no punctuation)
 * @returns {number} - Similarity score between 0 and 1
 */
function calculateSimilarity(str1, str2) {
    // Function to calculate similarity - remains the same as provided previously
    if (!str1 || !str2) return 0.0; // Handle null/empty strings
    if (str1 === str2) return 1.0;

    const words1 = new Set(str1.split(' '));
    const words2 = new Set(str2.split(' '));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const smallerSize = Math.min(words1.size, words2.size);

    // Avoid division by zero if one string has no words after normalization
    return smallerSize === 0 ? 0.0 : intersection.size / smallerSize;
}


/**
 * Ensures we have the exact requested number of questions for each perspective
 * NOTE: This function calls the fallback generation if AI questions are insufficient.
 * @param {Object} questionsMap - Questions grouped by perspective (SHOULD contain UNIQUE AI questions from parser)
 * @param {Object} perspectiveSettings - Settings with question counts
 * @param {string} documentType - Type of document
 * @returns {Object} - Balanced questions (grouped by perspective)
 */
function ensurePerspectiveQuestionCounts(questionsMap, perspectiveSettings, documentType) {
    // Function to balance questions and call fallbacks - remains the same as provided previously
    let generateFallbackQuestions;
    try {
        // Assuming fallback-questions.service is in the same directory or accessible path
        generateFallbackQuestions = require('./fallback-questions.service').generateFallbackQuestions;
         console.log("Balancer: Fallback question generator loaded.");
    } catch (error) {
        console.error("Balancer CRITICAL: Failed to load fallback-questions.service. Fallback questions cannot be generated.", error);
        generateFallbackQuestions = (p, n, dt, existing) => { // Provide dummy function
            console.error(`Balancer: Cannot generate ${n} fallback questions for ${p} - service missing.`);
            return []; // Return empty array if service fails to load
        };
    }

    const result = {}; // Result will be a map grouped by perspective

    // Process each perspective defined in the settings
    for (const perspective in perspectiveSettings) {
        // Skip disabled perspectives
        if (!perspectiveSettings[perspective]?.enabled) {
            continue;
        }

        const targetCount = perspectiveSettings[perspective]?.questionCount || 5; // Default target
        // Ensure we are working with an array, even if the key was missing from the input map
        const availableAiQuestions = questionsMap[perspective] || [];
        console.log(`Balancer: Balancing questions for ${perspective}: Target=${targetCount}, AI Found=${availableAiQuestions.length}`);

        if (availableAiQuestions.length < targetCount) {
            // Need to generate more questions using fallbacks
            const neededCount = targetCount - availableAiQuestions.length;
            console.warn(`Balancer: Generating ${neededCount} GENERIC fallback questions for ${perspective}. (AI questions were insufficient)`);
            // Call the fallback generator, passing existing AI questions for this perspective
            const fallbackQuestions = generateFallbackQuestions(
                perspective,
                neededCount,
                documentType,
                availableAiQuestions // Pass existing AI questions to fallback service
            );

            // Combine existing AI and new fallback questions
            result[perspective] = [...availableAiQuestions, ...fallbackQuestions];
            console.log(`Balancer -> Total questions for ${perspective} after fallback: ${result[perspective].length}`);
        } else if (availableAiQuestions.length > targetCount) {
            // Need to select a subset of AI questions (simple slice for now)
            console.log(`Balancer: Trimming AI questions for ${perspective} from ${availableAiQuestions.length} to ${targetCount}.`);
            result[perspective] = availableAiQuestions.slice(0, targetCount);
        } else {
            // We have exactly the right number of AI questions
            console.log(`Balancer: Exact number of AI questions (${targetCount}) found and used for ${perspective}.`);
            result[perspective] = availableAiQuestions;
        }
    }

    // Ensure all enabled perspective keys exist in the result, even if empty (though fallbacks should fill them)
    for (const perspective in perspectiveSettings) {
        if (perspectiveSettings[perspective]?.enabled && !result[perspective]) {
            result[perspective] = [];
        }
    }

    // Re-assign final order across all questions within each perspective
    Object.keys(result).forEach(perspective => {
        result[perspective] = result[perspective].map((q, index) => ({
            ...q,
            order: index + 1
        }));
    });


    return result; // Return the map
}


module.exports = {
  parseQuestionsFromAiResponse,
  sanitizeQuestionText,
  deduplicateQuestions,
  ensurePerspectiveQuestionCounts,
  calculateSimilarity
};