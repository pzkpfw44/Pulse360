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
 * Parses questions from AI response and returns flat array
 * @param {string} aiResponse - The text response from AI
 * @param {Object} perspectiveSettings - Settings for perspectives
 * @returns {Array} - Flat array of questions with perspective property
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
        return [];
    }
    console.log('Starting AI Response Parsing...');

    // --- ADD PRE-PROCESSING --- // Copied from last attempt
    let processedResponse = aiResponse.trim();
    // Attempt to remove common introductory phrases before the first real header
    const firstHeaderMatch = processedResponse.match(/(?:===?\s*|\*{2}\s*)(MANAGER|PEER|DIRECT REPORT|SELF|EXTERNAL STAKEHOLDER)\s*ASSESSMENT/i);
    if (firstHeaderMatch && firstHeaderMatch.index > 0) {
        // Check if text before header is short and likely intro fluff
        const textBeforeHeader = processedResponse.substring(0, firstHeaderMatch.index).trim();
        if (textBeforeHeader.length < 100 && !textBeforeHeader.includes('Question:')) {
                console.log(`Parser Pre-processing: Removing leading text: "${textBeforeHeader}"`);
                processedResponse = processedResponse.substring(firstHeaderMatch.index);
        }
    }
    // --- END PRE-PROCESSING ---

    // Define the patterns for splitting, including capturing the perspective name
    // Using a single, more robust pattern covering variations.
    const sectionSplitPattern = /(?:^|\n)\s*(?:(?:===?\s*)|(?:\*{2}\s*))?(MANAGER|PEER|DIRECT REPORT|SELF|EXTERNAL STAKEHOLDER)\s*ASSESSMENT\s*(?:[:.]|===?|\*{2})?\s*\n/i; // Use robust pattern

    // Use processedResponse for splitting
    const parts = processedResponse.split(sectionSplitPattern);

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
        console.warn("Primary parsing failed to find any questions via section headers. Attempting global fallback search (if implemented)...");
    }

    // --- Post-processing and Logging ---
    console.log(`Successfully parsed ${totalQuestionsFound} questions from AI response via primary section method.`);

    // Deduplication step BEFORE adding fallbacks (and before returning)
    const allParsedQuestions = Object.values(questionsByPerspective).flat();
    const uniqueParsedQuestions = deduplicateQuestions(allParsedQuestions); // Assumes deduplicateQuestions exists in this file
    console.log(` -> ${uniqueParsedQuestions.length} questions remain after deduplication.`);

    // Re-structure back into map for logging final counts before returning flat array
    const uniqueQuestionsByPerspective = { manager: [], peer: [], direct_report: [], self: [], external: [] };
    uniqueParsedQuestions.forEach(q => {
        if (uniqueQuestionsByPerspective[q.perspective]) {
            uniqueQuestionsByPerspective[q.perspective].push(q);
        } else {
             console.warn(`Parsed question has unknown perspective '${q.perspective}' during final count log. Text: "${q.text.substring(0,30)}..."`);
             // Assign to a generic bucket or handle as needed
             // For now, we'll ignore it in the final count log if the perspective key doesn't exist.
        }
    });

    // Check for empty perspectives AND log warning
    const finalQuestionCounts = {};
    Object.keys(questionsByPerspective).forEach(p => {
        // Use the counts *after* deduplication
        finalQuestionCounts[p] = uniqueQuestionsByPerspective[p] ? uniqueQuestionsByPerspective[p].length : 0;
    });
    console.log("Final counts per perspective after parsing and deduplication:", finalQuestionCounts);


    const emptyPerspectives = Object.entries(perspectiveSettings || {}) // Add null check for safety
        .filter(([perspective, settings]) => settings?.enabled && finalQuestionCounts[perspective] === 0)
        .map(([perspective]) => perspective);

    if (emptyPerspectives.length > 0) {
        console.error(`CRITICAL WARNING: No AI questions parsed for enabled perspectives: ${emptyPerspectives.join(', ')}. Fallback questions will be used by ensurePerspectiveQuestionCounts unless a second AI call is implemented.`);
    }

    // Return the unique questions as a flat array, re-assigning order based on flat array index
    // The balancing function will handle final ordering after potential fallbacks are added.
    return uniqueParsedQuestions.map((q, index) => ({ ...q, order: index + 1 }));
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
        const perspective = question.perspective || 'unknown'; // Handle missing perspective

        if (!textMap.has(perspective)) {
            textMap.set(perspective, new Set());
        }

        const normalizedText = (question.text || '') // Handle missing text
            .toLowerCase()
            .replace(/[.,?!;:]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (!normalizedText) continue; // Skip empty questions

        const perspectiveSet = textMap.get(perspective);
        let isDuplicate = false;

        if (perspectiveSet.has(normalizedText)) {
            isDuplicate = true;
        } else {
             for (const existingText of perspectiveSet) {
                if (calculateSimilarity(normalizedText, existingText) > 0.85) {
                    isDuplicate = true;
                    break;
                }
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
 * Calculate similarity between two strings (0-1 scale) - Simple word overlap
 * @param {string} str1 - First string (normalized, no punctuation)
 * @param {string} str2 - Second string (normalized, no punctuation)
 * @returns {number} - Similarity score between 0 and 1
 */
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0.0;
    if (str1 === str2) return 1.0;
    const words1 = new Set(str1.split(' '));
    const words2 = new Set(str2.split(' '));
    if (words1.size === 0 || words2.size === 0) return 0.0;
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const smallerSize = Math.min(words1.size, words2.size);
    return smallerSize === 0 ? 0.0 : intersection.size / smallerSize;
}


/**
 * Ensures we have the exact requested number of questions for each perspective
 * NOTE: This function calls the fallback generation if AI questions are insufficient.
 * @param {Object} questionsMap - Questions grouped by perspective { manager: [...], peer: [...], ... }
 * @param {Object} perspectiveSettings - Settings with question counts
 * @param {string} documentType - Type of document
 * @returns {Object} - Balanced questions map { manager: [...], peer: [...], ... }
 */
function ensurePerspectiveQuestionCounts(questionsMap, perspectiveSettings, documentType) {
    console.log('Balancer (ensurePerspectiveQuestionCounts): Balancing questions...');
    let generateFallbackQuestions;
    try {
        generateFallbackQuestions = require('./fallback-questions.service').generateFallbackQuestions;
         console.log("Balancer: Fallback question generator loaded.");
    } catch (error) {
        console.error("Balancer CRITICAL: Failed to load fallback-questions.service.", error);
        generateFallbackQuestions = (p, n, dt, existing) => { return []; }; // Dummy
    }

    const result = {};
    const finalDeduplicatedResult = {}; // For final check

    for (const perspective in perspectiveSettings) {
        if (!perspectiveSettings[perspective]?.enabled) {
            continue;
        }

        const targetCount = perspectiveSettings[perspective]?.questionCount || 5;
        const availableAiQuestions = questionsMap[perspective] || [];
        console.log(` -> Balancer Check [${perspective}]: Target=${targetCount}, Available AI=${availableAiQuestions.length}`);

        if (availableAiQuestions.length < targetCount) {
            const neededCount = targetCount - availableAiQuestions.length;
            console.warn(` -> Balancer Action [${perspective}]: Generating ${neededCount} fallbacks.`);
            const fallbackQuestions = generateFallbackQuestions(
                perspective, neededCount, documentType, availableAiQuestions
            );
            result[perspective] = [...availableAiQuestions, ...fallbackQuestions];
        } else if (availableAiQuestions.length > targetCount) {
            console.log(` -> Balancer Action [${perspective}]: Trimming AI from ${availableAiQuestions.length} to ${targetCount}.`);
            result[perspective] = availableAiQuestions.slice(0, targetCount);
        } else {
            console.log(` -> Balancer Action [${perspective}]: Using exact ${targetCount} AI questions.`);
            result[perspective] = [...availableAiQuestions];
        }

         // Add final deduplication step within the loop, after potentially adding fallbacks
         if (result[perspective]) {
             const initialCount = result[perspective].length;
             finalDeduplicatedResult[perspective] = deduplicateQuestions(result[perspective]);
             if (finalDeduplicatedResult[perspective].length < initialCount) {
                 console.log(` -> Balancer Dedupe [${perspective}]: Deduplicated from ${initialCount} to ${finalDeduplicatedResult[perspective].length}`);
             }
         } else {
             finalDeduplicatedResult[perspective] = [];
         }
    }

    // Assign final order globally after all processing
    let globalOrderIndex = 1;
    const perspectiveOrder = ['manager', 'peer', 'direct_report', 'self', 'external'];
    perspectiveOrder.forEach(p => {
        if (finalDeduplicatedResult[p]) {
             finalDeduplicatedResult[p] = finalDeduplicatedResult[p].map(q => ({ ...q, order: globalOrderIndex++ }));
        }
    });


    const totalBalanced = Object.values(finalDeduplicatedResult).flat().length;
    console.log(`Balancer: Balancing complete. Final total questions: ${totalBalanced}.`);
    return finalDeduplicatedResult; // Return the final deduplicated and ordered map
}


module.exports = {
  parseQuestionsFromAiResponse,
  sanitizeQuestionText, // Assuming used by parser or elsewhere
  deduplicateQuestions,
  ensurePerspectiveQuestionCounts,
  calculateSimilarity
};