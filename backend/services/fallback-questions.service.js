// backend/services/fallback-questions.service.js

/**
 * Generates diverse fallback questions for a specific perspective, avoiding existing AI questions.
 * @param {string} perspective - Perspective to generate questions for ('manager', 'peer', etc.)
 * @param {number} count - Number of questions to generate.
 * @param {string} documentType - Type of document ('leadership_model', etc.).
 * @param {Array} existingAiQuestions - Questions already parsed from AI for this perspective (to avoid duplicating).
 * @returns {Array} - Array of unique fallback question objects.
 */
function generateFallbackQuestions(perspective, count, documentType, existingAiQuestions = []) {
  console.log(`Fallback Generator: Generating ${count} diverse fallback questions for ${perspective}, avoiding ${existingAiQuestions.length} existing AI questions.`);

  // Get candidate questions from different hardcoded sources
  const typeQuestions = getQuestionsForDocumentType(documentType, perspective);
  const genericQuestions = getGenericQuestionsForPerspective(perspective);
  // Fetch more candidates than needed initially to allow for filtering and better selection
  const additionalQuestions = getAdditionalGenericQuestions(perspective, count * 4); // Get plenty of options

  // Combine all candidate pools
  let allCandidateQuestions = [...typeQuestions, ...genericQuestions, ...additionalQuestions];
  console.log(`Fallback Generator: Initial candidate pool size = ${allCandidateQuestions.length}`);

  // --- Step 1: Filter candidates against existing AI questions ---
  const existingAiTextsNorm = new Set(existingAiQuestions.map(q => q.text.toLowerCase().replace(/[.,?!;:]/g, '').replace(/\s+/g, ' ').trim()));
  allCandidateQuestions = allCandidateQuestions.filter(candidate => {
      const candidateTextNorm = candidate.text.toLowerCase().replace(/[.,?!;:]/g, '').replace(/\s+/g, ' ').trim();
      let isSimilarToExisting = false;
      for (const existingNormText of existingAiTextsNorm) {
          if (calculateSimilarity(candidateTextNorm, existingNormText) > 0.85) {
               isSimilarToExisting = true; break;
          }
      }
      return !isSimilarToExisting;
  });
  console.log(`Fallback Generator -> ${allCandidateQuestions.length} candidates remain after filtering against existing AI questions.`);

  // --- Step 2: Deduplicate remaining candidates internally ---
  let uniqueInternalCandidates = [];
  const usedInternalTextsNorm = new Set();
  for (const question of allCandidateQuestions) {
      const normalizedText = question.text.toLowerCase().replace(/[.,?!;:]/g, '').replace(/\s+/g, ' ').trim();
      if (!usedInternalTextsNorm.has(normalizedText)) {
           let tooSimilarToInternal = false;
           for(const uniqueTextNorm of usedInternalTextsNorm) {
               if (calculateSimilarity(normalizedText, uniqueTextNorm) > 0.85) {
                   tooSimilarToInternal = true; break;
               }
           }
           if (!tooSimilarToInternal) {
               uniqueInternalCandidates.push(question);
               usedInternalTextsNorm.add(normalizedText);
           }
      }
  }
  console.log(`Fallback Generator -> ${uniqueInternalCandidates.length} candidates remain after internal deduplication (exact & similarity > 0.85).`);

  // --- Step 3: Shuffle the unique candidates for better diversity in selection ---
  for (let i = uniqueInternalCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [uniqueInternalCandidates[i], uniqueInternalCandidates[j]] = [uniqueInternalCandidates[j], uniqueInternalCandidates[i]];
  }

  // --- Step 4: Select the required number of questions ---
  let selectedQuestions = uniqueInternalCandidates.slice(0, count);
  console.log(`Fallback Generator -> Selected ${selectedQuestions.length} fallback questions from unique pool.`);

  // --- Step 5: Final check - If still not enough, generate placeholders ---
  if (selectedQuestions.length < count) {
    const neededPlaceholders = count - selectedQuestions.length;
    console.warn(`Fallback Generator: Could only select ${selectedQuestions.length} unique fallbacks. Generating ${neededPlaceholders} placeholders.`);
    const areas = ["communication", "teamwork", "leadership", "problem-solving", "decision-making", "customer focus", "adaptability", "results orientation", "strategic thinking", "innovation", "collaboration", "planning"]; // Added more areas
    // Track placeholder text to avoid duplicates of placeholders themselves
    const existingFallbackTextsNorm = new Set(selectedQuestions.map(q => q.text.toLowerCase().replace(/[.,?!;:]/g, '').replace(/\s+/g, ' ').trim()));

    for (let i = 0; i < neededPlaceholders; i++) {
        let placeholderText = '';
        let area = '';
        let attempt = 0;
        let isUnique = false;

        // Try to generate a unique placeholder
        while (!isUnique && attempt < areas.length * 2) { // Limit attempts
            area = areas[(i + selectedQuestions.length + attempt) % areas.length]; // Cycle through areas, add attempt offset
            const baseText = perspective === 'self'
                ? `How would you rate your own ${area} skills?`
                : `Please rate this person's ${area} skills.`;

            placeholderText = `${baseText} [Generic Fallback #${i + 1}${attempt > 0 ? `_v${attempt}` : ''}]`; // Add version if needed
            const normalizedPlaceholder = placeholderText.toLowerCase().replace(/[.,?!;:]/g, '').replace(/\s+/g, ' ').trim();

            if (!existingFallbackTextsNorm.has(normalizedPlaceholder)) {
                selectedQuestions.push({
                    text: placeholderText,
                    type: 'rating',
                    category: area.charAt(0).toUpperCase() + area.slice(1),
                    perspective: perspective,
                    required: true
                });
                existingFallbackTextsNorm.add(normalizedPlaceholder); // Add normalized text to prevent future duplicates
                isUnique = true; // Found a unique one
            }
            attempt++; // Increment attempt counter
        }
        if (!isUnique) {
            console.error(`Fallback Generator: Could not generate a unique placeholder for ${perspective} after ${attempt} attempts. There might be excessive duplication.`);
            // Optionally, add a very generic non-unique one as a last resort
            // selectedQuestions.push({ text: `Generic Question Placeholder #${i+1}`, type: 'rating', category: 'General', perspective: perspective, required: true });
        }
    }
    console.log(`Fallback Generator -> Added ${neededPlaceholders} placeholder fallbacks. Total: ${selectedQuestions.length}`);
  }

  // Final step: Ensure correct properties and add fallback flag
  return selectedQuestions.map((question, index) => ({
    ...question,
    perspective: perspective,
    isFallback: true
    // Order will be reassigned by the calling function (ensurePerspectiveQuestionCounts)
  }));
}


/**
* Calculate similarity between two strings (0-1 scale) - Simple word overlap
* @param {string} str1 - First string (should be normalized: lowercase, no punctuation, trimmed spaces)
* @param {string} str2 - Second string (should be normalized: lowercase, no punctuation, trimmed spaces)
* @returns {number} - Similarity score between 0 and 1
*/
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0.0; // Handle null/empty strings
  if (str1 === str2) return 1.0;

  const words1 = new Set(str1.split(' '));
  const words2 = new Set(str2.split(' '));

  // Handle cases where splitting results in empty sets (e.g., string was just punctuation)
  if (words1.size === 0 || words2.size === 0) return 0.0;

  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const smallerSize = Math.min(words1.size, words2.size);

  // Avoid division by zero (already handled by checking size above, but good practice)
  return smallerSize === 0 ? 0.0 : intersection.size / smallerSize;
}


// --- HARDCODED FALLBACK QUESTION LISTS ---
// --- (Copied from the file you provided) ---

/**
* Get questions specific to document type
*/
function getQuestionsForDocumentType(documentType, perspective) {
  // Base set of questions relevant to the document type
  const typeQuestions = {
    leadership_model: getLeadershipModelQuestions(perspective),
    job_description: getJobDescriptionQuestions(perspective),
    competency_framework: getCompetencyFrameworkQuestions(perspective),
    company_values: getCompanyValuesQuestions(perspective),
    performance_criteria: getPerformanceCriteriaQuestions(perspective)
  };

  // Return questions for the specified document type or default to leadership_model or empty array
  return typeQuestions[documentType] || typeQuestions.leadership_model || [];
}

/** Get leadership model specific questions */
function getLeadershipModelQuestions(perspective) {
  if (perspective === 'manager') {
    return [
      {
        text: `How effectively does this person establish and communicate a clear vision?`,
        type: 'rating',
        category: 'Vision-setting and strategic thinking',
        perspective,
        required: true
      },
      {
        text: `How well does this person develop strategies aligned with organizational goals?`,
        type: 'rating',
        category: 'Strategic Thinking',
        perspective,
        required: true
      },
      {
        text: `How effectively does this person identify and develop talent within their team?`,
        type: 'rating',
        category: 'Talent Development',
        perspective,
        required: true
      },
      {
        text: `How well does this person lead through change and uncertainty?`,
        type: 'rating',
        category: 'Change Leadership',
        perspective,
        required: true
      },
      {
        text: `How would you rate this person's ability to make difficult decisions?`,
        type: 'rating',
        category: 'Decision Making',
        perspective,
        required: true
      },
      {
        text: `How well does this person model the values and behaviors expected of others?`,
        type: 'rating',
        category: 'Role Modeling',
        perspective,
        required: true
      },
      {
        text: `How effectively does this person foster a culture of innovation and continuous improvement?`,
        type: 'rating',
        category: 'Innovation',
        perspective,
        required: true
      },
      {
        text: `What specific leadership strengths does this person demonstrate?`,
        type: 'open_ended',
        category: 'Leadership Strengths',
        perspective,
        required: true
      }
    ];
  } else if (perspective === 'peer') {
    return [
      {
        text: `How effectively does this person collaborate across teams and departments?`,
        type: 'rating',
        category: 'Collaboration',
        perspective,
        required: true
      },
      {
        text: `How well does this person influence without authority?`,
        type: 'rating',
        category: 'Influence',
        perspective,
        required: true
      },
      {
        text: `To what extent does this person demonstrate the leadership qualities outlined in our model?`,
        type: 'rating',
        category: 'Leadership Model Alignment',
        perspective,
        required: true
      },
      {
        text: `How would you rate this person's ability to navigate complex interpersonal situations?`,
        type: 'rating',
        category: 'Interpersonal Skills',
        perspective,
        required: true
      },
      {
        text: `How effectively does this person balance short-term needs with long-term goals?`,
        type: 'rating',
        category: 'Strategic Balance',
        perspective,
        required: true
      }
    ];
  } else if (perspective === 'direct_report') {
    return [
      {
        text: `How well does this person provide clear direction and guidance?`,
        type: 'rating',
        category: 'Direction Setting',
        perspective,
        required: true
      },
      {
        text: `How effectively does this person delegate tasks and empower you?`,
        type: 'rating',
        category: 'Delegation',
        perspective,
        required: true
      },
      {
        text: `How well does this person recognize and appreciate your contributions?`,
        type: 'rating',
        category: 'Recognition',
        perspective,
        required: true
      },
      {
        text: `To what extent does this person create an environment where you feel you can speak up and take risks?`,
        type: 'rating',
        category: 'Psychological Safety',
        perspective,
        required: true
      },
      {
        text: `How effectively does this person provide feedback that helps you improve?`,
        type: 'rating',
        category: 'Developmental Feedback',
        perspective,
        required: true
      }
    ];
  } else if (perspective === 'self') {
    return [
      {
        text: `How effectively do you establish and communicate vision and direction?`,
        type: 'rating',
        category: 'Vision',
        perspective,
        required: true
      },
      {
        text: `How well do you develop and mentor your team members?`,
        type: 'rating',
        category: 'Team Development',
        perspective,
        required: true
      },
      {
        text: `How effectively do you handle difficult conversations with team members?`,
        type: 'rating',
        category: 'Difficult Conversations',
        perspective,
        required: true
      },
      {
        text: `How would you rate your ability to inspire and motivate others?`,
        type: 'rating',
        category: 'Inspiration',
        perspective,
        required: true
      },
      {
        text: `What aspects of the leadership model do you find most challenging to implement?`,
        type: 'open_ended',
        category: 'Leadership Challenges',
        perspective,
        required: true
      }
    ];
  } else if (perspective === 'external') {
    return [
      {
        text: `How effectively does this person represent the organization in external interactions?`,
        type: 'rating',
        category: 'Organizational Representation',
        perspective,
        required: true
      },
      {
        text: `How well does this person build and maintain productive relationships with external stakeholders?`,
        type: 'rating',
        category: 'Relationship Building',
        perspective,
        required: true
      },
      {
        text: `How effectively does this person follow through on commitments made to external partners?`,
        type: 'rating',
        category: 'Commitment Fulfillment',
        perspective,
        required: true
      },
      {
        text: `How would you rate this person's ability to understand and address your needs?`,
        type: 'rating',
        category: 'Stakeholder Understanding',
        perspective,
        required: true
      },
      {
        text: `How would you describe the impact of this person's leadership on the relationship between our organizations?`,
        type: 'open_ended',
        category: 'Impact Assessment',
        perspective,
        required: true
      }
    ];
  }

  return []; // Default empty array if perspective doesn't match
}

// These functions would contain perspective-specific questions for each document type
// Keeping placeholders as in the original file provided
function getJobDescriptionQuestions(perspective) { /* Implementation */ return []; }
function getCompetencyFrameworkQuestions(perspective) { /* Implementation */ return []; }
function getCompanyValuesQuestions(perspective) { /* Implementation */ return []; }
function getPerformanceCriteriaQuestions(perspective) { /* Implementation */ return []; }

/**
* Get generic questions for a specific perspective
*/
function getGenericQuestionsForPerspective(perspective) {
  const perspectiveQuestions = {
    manager: [
      {
        text: `How effectively does this person lead their team to achieve objectives?`,
        type: 'rating',
        category: 'Leadership',
        perspective,
        required: true
      },
      {
        text: `How effectively does this person navigate complex organizational dynamics?`,
        type: 'rating',
        category: 'Organizational Savvy',
        perspective,
        required: true
      },
      {
        text: `How well does this person handle high-pressure situations?`,
        type: 'rating',
        category: 'Stress Management',
        perspective,
        required: true
      },
      {
        text: `How effectively does this person allocate resources to meet strategic priorities?`,
        type: 'rating',
        category: 'Resource Management',
        perspective,
        required: true
      },
      {
        text: `What specific areas of growth would most benefit this person in their leadership role?`,
        type: 'open_ended',
        category: 'Development Areas',
        perspective,
        required: true
      }
    ],
    peer: [
      {
        text: `How effectively does this person collaborate with you and other team members?`,
        type: 'rating',
        category: 'Collaboration',
        perspective,
        required: true
      },
      {
        text: `How well does this person share information and knowledge with colleagues?`,
        type: 'rating',
        category: 'Knowledge Sharing',
        perspective,
        required: true
      },
      {
        text: `How effectively does this person support team goals even when they conflict with personal priorities?`,
        type: 'rating',
        category: 'Team Orientation',
        perspective,
        required: true
      },
      {
        text: `How well does this person provide constructive input in group settings?`,
        type: 'rating',
        category: 'Constructive Input',
        perspective,
        required: true
      },
      {
        text: `What is this person's greatest strength when working with colleagues?`,
        type: 'open_ended',
        category: 'Strengths',
        perspective,
        required: true
      }
    ],
    direct_report: [
      {
        text: `How effectively does this person provide helpful feedback on your work?`,
        type: 'rating',
        category: 'Feedback',
        perspective,
        required: true
      },
      {
        text: `How well does this person advocate for you and your team within the organization?`,
        type: 'rating',
        category: 'Advocacy',
        perspective,
        required: true
      },
      {
        text: `How effectively does this person remove obstacles that impede your work?`,
        type: 'rating',
        category: 'Barrier Removal',
        perspective,
        required: true
      },
      {
        text: `How well does this person balance providing direction with allowing autonomy?`,
        type: 'rating',
        category: 'Autonomy Balance',
        perspective,
        required: true
      },
      {
        text: `What could this person do to better support you in your role?`,
        type: 'open_ended',
        category: 'Improvement Areas',
        perspective,
        required: true
      }
    ],
    self: [
      {
        text: `How effectively do you communicate your expectations to your team?`,
        type: 'rating',
        category: 'Communication',
        perspective,
        required: true
      },
      {
        text: `How well do you handle feedback about your leadership approach?`,
        type: 'rating',
        category: 'Feedback Reception',
        perspective,
        required: true
      },
      {
        text: `How effectively do you manage your own work-life balance as a leader?`,
        type: 'rating',
        category: 'Personal Balance',
        perspective,
        required: true
      },
      {
        text: `How well do you maintain focus on strategic priorities amid daily demands?`,
        type: 'rating',
        category: 'Strategic Focus',
        perspective,
        required: true
      },
      {
        text: `What do you consider to be your key development areas as a leader?`,
        type: 'open_ended',
        category: 'Self-Development',
        perspective,
        required: true
      }
    ],
    external: [
      {
        text: `How effectively does this person communicate with external stakeholders?`,
        type: 'rating',
        category: 'External Communication',
        perspective,
        required: true
      },
      {
        text: `How well does this person adapt their approach to different stakeholder needs?`,
        type: 'rating',
        category: 'Stakeholder Adaptability',
        perspective,
        required: true
      },
      {
        text: `How effectively does this person negotiate mutual benefits in external relationships?`,
        type: 'rating',
        category: 'Negotiation',
        perspective,
        required: true
      },
      {
        text: `How well does this person demonstrate understanding of external stakeholder perspectives?`,
        type: 'rating',
        category: 'Perspective Taking',
        perspective,
        required: true
      },
      {
        text: `What could this person do to improve your experience working with them?`,
        type: 'open_ended',
        category: 'Improvement Areas',
        perspective,
        required: true
      }
    ]
  };

  return perspectiveQuestions[perspective] || []; // Return perspective-specific list or empty array
}

/**
* Get additional generic questions to reach the required count
*/
function getAdditionalGenericQuestions(perspective, count) { // Count param seems unused in original logic here
  const additionalQuestions = [
    {
      text: `How effectively does this person demonstrate active listening?`,
      type: 'rating',
      category: 'Communication',
      perspective,
      required: true
    },
    {
      text: `How well does this person adapt to unexpected changes or challenges?`,
      type: 'rating',
      category: 'Adaptability',
      perspective,
      required: true
    },
    {
      text: `How effectively does this person deliver results on time and within scope?`,
      type: 'rating',
      category: 'Execution',
      perspective,
      required: true
    },
    {
      text: `How would you rate this person's problem-solving approach?`,
      type: 'rating',
      category: 'Problem Solving',
      perspective,
      required: true
    },
    {
      text: `How effectively does this person anticipate and prevent potential issues?`,
      type: 'rating',
      category: 'Proactivity',
      perspective,
      required: true
    },
    {
      text: `How well does this person manage conflict within the team?`,
      type: 'rating',
      category: 'Conflict Management',
      perspective,
      required: true
    },
    {
      text: `How consistently does this person follow through on commitments?`,
      type: 'rating',
      category: 'Reliability',
      perspective,
      required: true
    },
    {
      text: `How effectively does this person establish and maintain trust?`,
      type: 'rating',
      category: 'Trust Building',
      perspective,
      required: true
    },
    {
      text: `How well does this person incorporate different viewpoints into their thinking?`,
      type: 'rating',
      category: 'Inclusive Thinking',
      perspective,
      required: true
    },
    {
      text: `How effectively does this person translate strategy into actionable steps?`,
      type: 'rating',
      category: 'Execution',
      perspective,
      required: true
    }
    // Note: Original file had more questions below this point
  ];

  // Add more varied questions to ensure we have enough pool size
  const moreQuestions = [
    {
      text: `How effectively does this person promote accountability within the team?`,
      type: 'rating',
      category: 'Accountability',
      perspective,
      required: true
    },
    {
      text: `How well does this person foster an environment of continuous learning?`,
      type: 'rating',
      category: 'Learning Culture',
      perspective,
      required: true
    },
    {
      text: `How effectively does this person leverage the strengths of team members?`,
      type: 'rating',
      category: 'Strength Utilization',
      perspective,
      required: true
    },
    {
      text: `How would you rate this person's ability to coach others for improved performance?`,
      type: 'rating',
      category: 'Coaching',
      perspective,
      required: true
    },
    {
      text: `How well does this person balance tactical execution with strategic vision?`,
      type: 'rating',
      category: 'Strategic Balance',
      perspective,
      required: true
    }
    // Add even more generic questions if needed to ensure a large pool for filtering/shuffling
  ];

  // Combine and add more if needed
  let combinedQuestions = [...additionalQuestions, ...moreQuestions];

  // Modify questions for self-perspective
  if (perspective === 'self') {
    combinedQuestions = combinedQuestions.map(q => ({
      ...q,
      text: q.text
        .replace(/does this person/gi, 'do you') // Make replacement case-insensitive
        .replace(/this person's/gi, 'your')
        // Add more replacements if needed for self-perspective phrasing
    }));
  }

  // Return the combined pool; the main function will slice later if needed
  // The original slice(0, count) here limited the pool size unnecessarily early
  return combinedQuestions;
}

// Export the main function (calculateSimilarity is now internal helper)
module.exports = {
generateFallbackQuestions
};