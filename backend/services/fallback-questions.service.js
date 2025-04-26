// backend/services/fallback-questions.service.js

/**
 * Generates diverse fallback questions for a specific perspective
 * @param {string} perspective - Perspective to generate questions for
 * @param {number} count - Number of questions to generate
 * @param {string} documentType - Type of document
 * @param {Array} existingQuestions - Questions to avoid duplicating (optional)
 * @returns {Array} - Array of question objects
 */
function generateFallbackQuestions(perspective, count, documentType, existingQuestions = []) {
    console.log(`Generating ${count} diverse fallback questions for ${perspective} perspective`);
    
    // Get questions from different sources
    const typeQuestions = getQuestionsForDocumentType(documentType, perspective);
    const genericQuestions = getGenericQuestionsForPerspective(perspective);
    const additionalQuestions = getAdditionalGenericQuestions(perspective, count * 3); // Get more options
    
    // Combine all options
    let allCandidateQuestions = [...typeQuestions, ...genericQuestions, ...additionalQuestions];
    
    // Create a clean text version of each question for comparison
    const normalizedTexts = new Map();
    allCandidateQuestions.forEach(q => {
      normalizedTexts.set(q, q.text.toLowerCase().replace(/\s+/g, ' ').trim());
    });
    
    // Filter out duplicates within the candidates
    const uniqueCandidates = [];
    const usedTexts = new Set();
    
    // First pass - exact match deduplication
    for (const question of allCandidateQuestions) {
      const normalizedText = normalizedTexts.get(question);
      if (!usedTexts.has(normalizedText)) {
        uniqueCandidates.push(question);
        usedTexts.add(normalizedText);
      }
    }
    
    // Second pass - similarity-based deduplication
    const selectedQuestions = [];
    for (let i = 0; i < uniqueCandidates.length && selectedQuestions.length < count; i++) {
      const question = uniqueCandidates[i];
      const normalizedText = normalizedTexts.get(question);
      
      // Check if this question is too similar to any already selected
      let tooSimilar = false;
      for (const selected of selectedQuestions) {
        const selectedText = normalizedTexts.get(selected);
        if (calculateSimilarity(normalizedText, selectedText) > 0.6) {
          tooSimilar = true;
          break;
        }
      }
      
      if (!tooSimilar) {
        selectedQuestions.push(question);
      }
    }
    
    // If we still don't have enough, create truly unique questions with serial numbers
    if (selectedQuestions.length < count) {
      const areas = ["communication", "teamwork", "leadership", "problem-solving", "decision-making", "customer focus"];
      
      for (let i = selectedQuestions.length; i < count; i++) {
        const area = areas[i % areas.length];
        selectedQuestions.push({
          text: `How effectively does this person demonstrate ${area} skills with external stakeholders? (#${i+1})`,
          type: 'rating',
          category: area.charAt(0).toUpperCase() + area.slice(1),
          perspective,
          required: true
        });
      }
    }
    
    // Take only what we need and ensure proper order
    return selectedQuestions.slice(0, count).map((question, index) => ({
      ...question,
      order: index + 1
    }));
  }
  
  /**
   * Calculate similarity between two strings (0-1 scale)
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} - Similarity score between 0 and 1
   */
  function calculateSimilarity(str1, str2) {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;
    
    // Simple word overlap coefficient
    const words1 = new Set(str1.split(' '));
    const words2 = new Set(str2.split(' '));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const smaller = Math.min(words1.size, words2.size);
    
    return intersection.size / smaller;
  }
  
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
    
    // Return questions for the specified document type or generic ones if not found
    return typeQuestions[documentType] || typeQuestions.leadership_model;
  }
  
  /**
   * Get leadership model specific questions
   */
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
    
    return [];
  }
  
  // These functions would contain perspective-specific questions for each document type
  function getJobDescriptionQuestions(perspective) { /* Implementation */ }
  function getCompetencyFrameworkQuestions(perspective) { /* Implementation */ }
  function getCompanyValuesQuestions(perspective) { /* Implementation */ }
  function getPerformanceCriteriaQuestions(perspective) { /* Implementation */ }
  
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
    
    return perspectiveQuestions[perspective] || [];
  }
  
  /**
   * Get additional generic questions to reach the required count
   */
  function getAdditionalGenericQuestions(perspective, count) {
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
    ];
    
    // Add more varied questions to ensure we have enough
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
    ];
    
    // Combine and add more if needed
    let combinedQuestions = [...additionalQuestions, ...moreQuestions];
    
    // Modify questions for self-perspective
    if (perspective === 'self') {
      combinedQuestions = combinedQuestions.map(q => ({
        ...q,
        text: q.text
          .replace('does this person', 'do you')
          .replace('this person\'s', 'your')
      }));
    }
    
    return combinedQuestions.slice(0, count);
  }
  
  // Export functions
  module.exports = {
    generateFallbackQuestions,
    calculateSimilarity
  };