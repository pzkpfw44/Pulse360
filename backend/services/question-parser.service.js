// backend/services/question-parser.service.js

// --- (Keep sanitizeQuestionText, parseQuestionsFromAiResponse, deduplicateQuestions, calculateSimilarity, and parsing helpers unchanged) ---

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
 * Enhanced to handle different AI response formats
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

    // First look for multi-format headers (support both === PERSPECTIVE === and numbered style)
    // 1. Try the clean === PERSPECTIVE ASSESSMENT === format we requested
    const formatPatterns = [
        // Classic format with === ===
        /(?:^|\n)\s*(?:===?\s*)?(MANAGER|PEER|DIRECT REPORT|SELF|EXTERNAL STAKEHOLDER)\s*ASSESSMENT\s*(?:[:.]|===)?\s*\n/i,

        // Numbered format (e.g., "1. === MANAGER ASSESSMENT ===")
        /(?:^|\n)\s*\d+\.\s*(?:===?\s*)?(MANAGER|PEER|DIRECT REPORT|SELF|EXTERNAL STAKEHOLDER)\s*ASSESSMENT\s*(?:[:.]|===)?\s*\n/i,

        // Simple bolded/starred format (e.g., "**MANAGER ASSESSMENT**")
        /(?:^|\n)\s*(?:\*\*|__)?(MANAGER|PEER|DIRECT REPORT|SELF|EXTERNAL STAKEHOLDER)\s*ASSESSMENT(?:\*\*|__)?\s*\n/i,
    ];

    // Try each format pattern until we find one that works
    let foundSections = false;
    let parts = [];
    let formatPattern = null;

    for (const pattern of formatPatterns) {
        parts = aiResponse.split(pattern);

        // If we got more than just the original string, this pattern worked
        if (parts.length > 1) {
            formatPattern = pattern;
            foundSections = true;
            console.log(`Found matching format pattern: ${pattern}`);
            break;
        }
    }

    // Process sections if we found a matching format
    if (foundSections) {
        console.log(`Split AI response into ${parts.length} parts using section headers.`);
        let currentPerspective = null;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i]?.trim();
            if (!part) continue; // Skip empty parts

            // Check if the part is a perspective header captured by the regex
            const perspectiveMatch = /^(MANAGER|PEER|DIRECT REPORT|SELF|EXTERNAL STAKEHOLDER)$/i.exec(part);

            if (perspectiveMatch) {
                // This part is a perspective header
                const perspectiveHeader = perspectiveMatch[1].toUpperCase();
                if (perspectiveHeader === 'DIRECT REPORT') currentPerspective = 'direct_report';
                else if (perspectiveHeader === 'EXTERNAL STAKEHOLDER') currentPerspective = 'external';
                else currentPerspective = perspectiveHeader.toLowerCase();
                console.log(`Identified Perspective Header: ${currentPerspective}`);
            } else if (currentPerspective) {
                // This part is content following a known perspective header
                console.log(`Processing content for perspective: ${currentPerspective}`);
                const sectionContent = part;

                // Parse questions from this section
                parseQuestionsFromSection(sectionContent, currentPerspective, questionsByPerspective);
            } else {
                console.log(`Skipping content part found before first recognized header or with unknown perspective: "${part.substring(0, 60)}..."`);
            }
        }
    } else {
        // No sections found, try alternative parsing approaches
        console.log("No clear section headers found. Trying alternative parsing approaches...");

        // Try to find numbered question blocks (e.g., "1. Question: How effectively...")
        if (tryParseNumberedQuestions(aiResponse, questionsByPerspective)) {
            console.log("Successfully parsed questions using numbered format");
        }
        // If still no questions, try a more aggressive fallback approach
        else if (tryParseFallbackFormat(aiResponse, questionsByPerspective, perspectiveSettings)) {
            console.log("Successfully parsed questions using fallback format parser");
        }
        // Last resort: look for any Question: blocks anywhere in the text
        else {
            console.warn("Primary and alternative parsing failed. Attempting global fallback search...");
            parseGlobalQuestions(aiResponse, questionsByPerspective);
        }
    }

    // Count total questions found across all perspectives
    const totalQuestionsFound = Object.values(questionsByPerspective).reduce((sum, qArr) => sum + qArr.length, 0);

    if (totalQuestionsFound === 0) {
        console.error("Failed to parse any questions from the AI response using all parsing methods.");
        return questionsByPerspective; // Return empty map
    }

    console.log(`Successfully parsed ${totalQuestionsFound} questions from AI response.`);

    // Deduplicate questions within each perspective
    const deduplicatedQuestionsMap = {};
    Object.keys(questionsByPerspective).forEach(perspective => {
        deduplicatedQuestionsMap[perspective] = deduplicateQuestions(questionsByPerspective[perspective]);
    });

    // Re-assign order for each perspective separately
    Object.keys(deduplicatedQuestionsMap).forEach(perspective => {
        deduplicatedQuestionsMap[perspective] = deduplicatedQuestionsMap[perspective].map(
            (question, index) => ({
                ...question,
                order: index + 1 // Update order based on new index after deduplication
            })
        );
    });

    // Check for empty perspectives AND log warning
    const finalQuestionCounts = {};
    Object.keys(deduplicatedQuestionsMap).forEach(p => {
        finalQuestionCounts[p] = deduplicatedQuestionsMap[p]?.length || 0;
    });
    console.log("Final counts per perspective after parsing and deduplication:", finalQuestionCounts);

    const emptyPerspectives = Object.entries(perspectiveSettings || {})
        .filter(([perspective, settings]) => settings?.enabled && finalQuestionCounts[perspective] === 0)
        .map(([perspective]) => perspective);

    if (emptyPerspectives.length > 0) {
        console.error(`CRITICAL WARNING: No AI questions parsed for enabled perspectives: ${emptyPerspectives.join(', ')}. Fallback questions will be used.`);
    }

    return deduplicatedQuestionsMap;
}

/**
 * Parse questions from a section of text for a specific perspective
 * @param {string} sectionText - The text content for a specific perspective
 * @param {string} perspective - The current perspective (manager, peer, etc.)
 * @param {Object} questionsByPerspective - The map to add questions to
 */
function parseQuestionsFromSection(sectionText, perspective, questionsByPerspective) {
    // Regex to find Question:, Type:, Category: blocks within the content
    const questionRegex = /Question:\s*(.*?)(?:\r?\n|\r|$)(?:Type:\s*(.*?)(?:\r?\n|\r|$))?(?:Category:\s*(.*?)(?:\r?\n|\r|$))?/gis;
    let qMatch;

    while ((qMatch = questionRegex.exec(sectionText)) !== null) {
        const questionText = qMatch[1]?.trim();
        // Default to 'rating' if type is missing or invalid
        let questionType = (qMatch[2]?.trim() || 'rating').toLowerCase();
        if (questionType !== 'rating' && questionType !== 'open_ended') {
            questionType = 'rating';
        }

        const category = qMatch[3]?.trim() || 'General';

        if (questionText && questionsByPerspective[perspective]) {
            questionsByPerspective[perspective].push({
                text: questionText,
                type: questionType, // Use validated type
                category: category,
                perspective: perspective,
                required: true, // Assuming required unless specified otherwise
                order: questionsByPerspective[perspective].length + 1 // Temporary order within perspective
            });
            console.log(`  -> Added question [${perspective}]: "${questionText.substring(0, 40)}..."`);
        }
    }
}


/**
 * Try to parse a numbered question format (1. Question:... 2. Question:...)
 * @param {string} aiResponse - The full AI response text
 * @param {Object} questionsByPerspective - The map to add questions to
 * @returns {boolean} - True if any questions were found
 */
function tryParseNumberedQuestions(aiResponse, questionsByPerspective) {
    // Look for perspective headers with numbers
    const perspectiveHeaderRegex = /\b(\d+)[\.\)]\s*(MANAGER|PEER|DIRECT REPORT|SELF|EXTERNAL STAKEHOLDER)\s*(?:ASSESSMENT|QUESTIONS|PERSPECTIVE)?\s*:/i;

    // Split by numbered headers like "1. MANAGER ASSESSMENT:"
    const sections = aiResponse.split(/\n\s*\d+[\.\)]\s*(?:MANAGER|PEER|DIRECT REPORT|SELF|EXTERNAL STAKEHOLDER)\s*(?:ASSESSMENT|QUESTIONS|PERSPECTIVE)?\s*:/i);

    if (sections.length <= 1) {
        // No numbered perspective sections found
        return false;
    }

    console.log(`Found ${sections.length - 1} numbered perspective sections`);

    // The first section is before any headers, so skip it
    let currentPerspective = null;

    // Process each section
    for (let i = 1; i < sections.length; i++) {
        // Get the header from the previous section split
        const headerMatch = aiResponse.match(perspectiveHeaderRegex);

        if (headerMatch) {
            // Extract the perspective from the header
            const perspectiveName = headerMatch[2].toUpperCase();

            if (perspectiveName === 'DIRECT REPORT') currentPerspective = 'direct_report';
            else if (perspectiveName === 'EXTERNAL STAKEHOLDER') currentPerspective = 'external';
            else currentPerspective = perspectiveName.toLowerCase();

            console.log(`Found numbered section for perspective: ${currentPerspective}`);

            // Process the questions in this section
            if (currentPerspective && questionsByPerspective[currentPerspective]) {
                parseQuestionsFromSection(sections[i], currentPerspective, questionsByPerspective);
            }
        }
    }

    // Check if we found any questions
    const totalFound = Object.values(questionsByPerspective).reduce((sum, arr) => sum + arr.length, 0);
    return totalFound > 0;
}

/**
 * Try parsing with a more aggressive fallback approach
 * @param {string} aiResponse - The full AI response text
 * @param {Object} questionsByPerspective - The map to add questions to
 * @param {Object} perspectiveSettings - Settings for perspectives
 * @returns {boolean} - True if any questions were found
 */
function tryParseFallbackFormat(aiResponse, questionsByPerspective, perspectiveSettings) {
    // Try to detect blocks that might represent different perspectives
    const paragraphs = aiResponse.split(/\n\s*\n/);

    // Check if we have roughly the right number of paragraphs for the perspectives
    const enabledPerspectives = Object.entries(perspectiveSettings)
        .filter(([_, settings]) => settings?.enabled)
        .map(([perspective]) => perspective);

    // If we don't have roughly the right number of paragraphs, this approach won't work
    if (paragraphs.length < enabledPerspectives.length) {
        return false;
    }

    console.log(`Attempting fallback parsing with ${paragraphs.length} paragraphs for ${enabledPerspectives.length} perspectives`);

    // For each paragraph, try to guess which perspective it belongs to
    for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i];

        // Skip short paragraphs (likely headers or explanations)
        if (paragraph.length < 50) continue;

        // Try to detect which perspective this paragraph is for
        let detectedPerspective = null;

        // Look for strong perspective indicators
        if (/\bmanager['s]?\b|\bsupervisor['s]?\b/i.test(paragraph)) {
            detectedPerspective = 'manager';
        } else if (/\bpeer['s]?\b|\bcolleague['s]?\b/i.test(paragraph)) {
            detectedPerspective = 'peer';
        } else if (/\bdirect report['s]?\b|\bsubordinate['s]?\b|\bteam member['s]?\b/i.test(paragraph)) {
            detectedPerspective = 'direct_report';
        } else if (/\byou\b|\byour\b|\byourself\b|\bself[-\s]assessment\b/i.test(paragraph)) {
            detectedPerspective = 'self';
        } else if (/\bexternal\b|\bclient['s]?\b|\bcustomer['s]?\b|\bpartner['s]?\b|\bstakeholder['s]?\b/i.test(paragraph)) {
            detectedPerspective = 'external';
        }

        // If we detected a perspective, parse questions from this paragraph
        if (detectedPerspective && questionsByPerspective[detectedPerspective]) {
            console.log(`Detected ${detectedPerspective} perspective in paragraph ${i+1}`);
            parseQuestionsFromSection(paragraph, detectedPerspective, questionsByPerspective);
        }
    }

    // Check if we found any questions
    const totalFound = Object.values(questionsByPerspective).reduce((sum, arr) => sum + arr.length, 0);
    return totalFound > 0;
}


/**
 * Last resort: parse any question from anywhere in the text
 * @param {string} aiResponse - The full AI response text
 * @param {Object} questionsByPerspective - The map to add questions to
 */
function parseGlobalQuestions(aiResponse, questionsByPerspective) {
    // Simple fallback to look for standalone Question: blocks anywhere in the text
    const globalQuestionRegex = /Question:\s*(.*?)(?:\r?\n|\r|$)(?:Type:\s*(.*?)(?:\r?\n|\r|$))?(?:Category:\s*(.*?)(?:\r?\n|\r|$))?/gis;
    let gMatch;
    const defaultPerspective = 'peer'; // If we can't determine perspective, use peer as default

    while ((gMatch = globalQuestionRegex.exec(aiResponse)) !== null) {
        const questionText = gMatch[1]?.trim();
        // Default to 'rating' if type is missing or invalid
        let questionType = (gMatch[2]?.trim() || 'rating').toLowerCase();
        if (questionType !== 'rating' && questionType !== 'open_ended') {
            questionType = 'rating';
        }
        const category = gMatch[3]?.trim() || 'General';

        if (questionText) {
            // Try to guess the perspective from surrounding context (100 chars before)
            const beforeContext = aiResponse.substring(Math.max(0, gMatch.index - 100), gMatch.index).toLowerCase();
            let guessedPerspective = defaultPerspective;

            if (beforeContext.includes('manager')) guessedPerspective = 'manager';
            else if (beforeContext.includes('peer')) guessedPerspective = 'peer';
            else if (beforeContext.includes('direct report')) guessedPerspective = 'direct_report';
            else if (beforeContext.includes('self')) guessedPerspective = 'self';
            else if (beforeContext.includes('external')) guessedPerspective = 'external';

            questionsByPerspective[guessedPerspective].push({
                text: questionText,
                type: questionType, // Use validated type
                category: category,
                perspective: guessedPerspective,
                required: true,
                order: questionsByPerspective[guessedPerspective].length + 1
            });
            console.log(`  -> Added question via global fallback [${guessedPerspective}]: "${questionText.substring(0, 40)}..."`);
        }
    }
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


// --- START: MODIFIED ensurePerspectiveQuestionCounts function ---
/**
 * Ensures we have the exact requested number of questions for each perspective,
 * attempting to match the desired question type mix.
 * Calls fallback generation if AI questions are insufficient or don't match the mix well enough.
 * @param {Object} questionsMap - Questions grouped by perspective (SHOULD contain UNIQUE AI questions from parser)
 * @param {Object} perspectiveSettings - Settings with question counts per perspective
 * @param {string} documentType - Type of document (for fallback context)
 * @param {Object} templateInfo - Contains additional info like questionMixPercentage
 * @returns {Object} - Balanced questions (grouped by perspective)
 */
function ensurePerspectiveQuestionCounts(questionsMap, perspectiveSettings, documentType, templateInfo = {}) {
    let generateFallbackQuestions;
    try {
        generateFallbackQuestions = require('./fallback-questions.service').generateFallbackQuestions;
        console.log("Balancer: Fallback question generator loaded.");
    } catch (error) {
        console.error("Balancer CRITICAL: Failed to load fallback-questions.service.", error);
        generateFallbackQuestions = (p, n, dt, existing) => {
            console.error(`Balancer: Cannot generate ${n} fallback questions for ${p} - service missing.`);
            return [];
        };
    }

    // Extract the desired mix percentage from templateInfo, default to 75% rating if missing
    const desiredRatingPercentage = templateInfo?.questionMixPercentage !== undefined
        ? templateInfo.questionMixPercentage / 100
        : 0.75; // Default to 75% rating

    console.log(`Balancer: Target Rating Percentage = ${desiredRatingPercentage * 100}%`);

    const result = {}; // Result map grouped by perspective

    // Process each perspective defined in the settings
    for (const perspective in perspectiveSettings) {
        if (!perspectiveSettings[perspective]?.enabled) {
            continue; // Skip disabled perspectives
        }

        const targetTotalCount = perspectiveSettings[perspective]?.questionCount || 5; // Total questions needed
        const availableAiQuestions = questionsMap[perspective] || []; // AI questions for this perspective

        console.log(`Balancer: Balancing questions for ${perspective}: Target=${targetTotalCount}, AI Found=${availableAiQuestions.length}`);

        // Separate available AI questions by type
        const aiRatingQuestions = availableAiQuestions.filter(q => q.type === 'rating');
        const aiOpenEndedQuestions = availableAiQuestions.filter(q => q.type === 'open_ended');
        console.log(`Balancer: -> AI Rating: ${aiRatingQuestions.length}, AI OpenEnded: ${aiOpenEndedQuestions.length}`);

        // Calculate the ideal number of each type based on the percentage
        const targetRatingCount = Math.round(targetTotalCount * desiredRatingPercentage);
        const targetOpenEndedCount = targetTotalCount - targetRatingCount;
        console.log(`Balancer: -> Target Mix: Rating=${targetRatingCount}, OpenEnded=${targetOpenEndedCount}`);

        let selectedQuestions = [];

        // 1. Select rating questions up to the target count for rating
        selectedQuestions.push(...aiRatingQuestions.slice(0, targetRatingCount));

        // 2. Select open-ended questions up to the target count for open-ended
        selectedQuestions.push(...aiOpenEndedQuestions.slice(0, targetOpenEndedCount));

        console.log(`Balancer: -> Selected based on ideal mix: ${selectedQuestions.length} questions`);

        // 3. If we still need more questions (because AI didn't provide enough of one type), fill with the *other* type if available
        let neededMore = targetTotalCount - selectedQuestions.length;
        if (neededMore > 0) {
            console.log(`Balancer: -> Need ${neededMore} more questions to reach target ${targetTotalCount}. Trying to fill gaps.`);
            // Check remaining rating questions
            const remainingRating = aiRatingQuestions.slice(selectedQuestions.filter(q => q.type === 'rating').length);
            const fillWithRating = remainingRating.slice(0, neededMore);
            selectedQuestions.push(...fillWithRating);
            neededMore -= fillWithRating.length;
            console.log(`Balancer: -> Filled ${fillWithRating.length} from remaining rating.`);

            // Check remaining open-ended questions if still needed
            if (neededMore > 0) {
                const remainingOpenEnded = aiOpenEndedQuestions.slice(selectedQuestions.filter(q => q.type === 'open_ended').length);
                const fillWithOpenEnded = remainingOpenEnded.slice(0, neededMore);
                selectedQuestions.push(...fillWithOpenEnded);
                neededMore -= fillWithOpenEnded.length;
                console.log(`Balancer: -> Filled ${fillWithOpenEnded.length} from remaining open-ended.`);
            }
        }

        console.log(`Balancer: -> Selected after filling gaps: ${selectedQuestions.length} questions`);

        // 4. If we *still* don't have enough questions, generate fallbacks
        const finalNeededCount = targetTotalCount - selectedQuestions.length;
        if (finalNeededCount > 0) {
            console.warn(`Balancer: Generating ${finalNeededCount} GENERIC fallback questions for ${perspective}. (AI questions insufficient even after filling gaps)`);
            // Pass the *already selected* AI questions to the fallback generator to help avoid duplicates
            const fallbackQuestions = generateFallbackQuestions(
                perspective,
                finalNeededCount,
                documentType,
                selectedQuestions // Pass selected AI questions
            );

             // Combine selected AI and new fallback questions
            result[perspective] = [...selectedQuestions, ...fallbackQuestions];
             console.log(`Balancer -> Total questions for ${perspective} after fallback: ${result[perspective].length}`);
        } else if (selectedQuestions.length > targetTotalCount) {
            // Should ideally not happen with the logic above, but as a safeguard, trim excess
            console.log(`Balancer: Trimming selected questions for ${perspective} from ${selectedQuestions.length} to ${targetTotalCount}.`);
            result[perspective] = selectedQuestions.slice(0, targetTotalCount);
        }
         else {
            // We have exactly the right number after selection and gap filling
            console.log(`Balancer: Exact number of questions (${targetTotalCount}) selected for ${perspective} from AI output.`);
            result[perspective] = selectedQuestions;
        }
    }

    // Ensure all enabled perspective keys exist in the result
    for (const perspective in perspectiveSettings) {
        if (perspectiveSettings[perspective]?.enabled && !result[perspective]) {
            result[perspective] = []; // Should be filled by fallback if needed, but ensures key exists
        }
    }

    // Re-assign final order across all questions within each perspective
    Object.keys(result).forEach(perspective => {
        result[perspective] = result[perspective].map((q, index) => ({
            ...q,
            order: index + 1 // Ensure order is sequential within the final list for the perspective
        }));
    });

    // Log final counts per type for verification
    Object.keys(result).forEach(perspective => {
        const finalRating = result[perspective].filter(q => q.type === 'rating').length;
        const finalOpen = result[perspective].filter(q => q.type === 'open_ended').length;
        console.log(`Balancer: Final Count for ${perspective}: Rating=${finalRating}, OpenEnded=${finalOpen}, Total=${result[perspective].length}`);
    });


    return result; // Return the map
}
// --- END: MODIFIED ensurePerspectiveQuestionCounts function ---


module.exports = {
  parseQuestionsFromAiResponse,
  sanitizeQuestionText,
  deduplicateQuestions,
  ensurePerspectiveQuestionCounts, // Export the modified function
  calculateSimilarity
};