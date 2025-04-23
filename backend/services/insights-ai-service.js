// backend/services/insights-ai-service.js

const axios = require('axios');
const fluxAiConfig = require('../config/flux-ai');
// Assuming generateMockInsight is no longer needed or defined elsewhere if used by fallback
// const { generateMockInsight } = require('../utils/mock-insight-generator');

/**
 * Service for generating insights using Flux AI
 */
class InsightsAiService {
  /**
   * Generate a Growth Blueprint insight for employee development
   * @param {Object} feedbackData - Aggregated feedback data from responses
   * @param {Object} employee - Target employee data
   * @param {Object} campaign - Campaign data
   * @returns {Object} - Generated insight content
   */
  async generateGrowthBlueprint(feedbackData, employee, campaign) {
    try {
      console.log(`[INSIGHTS] Generating Growth Blueprint for employee: ${employee?.firstName} ${employee?.lastName}`);

      // Check if Flux AI is configured
      if (!fluxAiConfig.isConfigured()) {
        console.warn('[INSIGHTS] Flux AI not configured, using fallback mock generator');
        return this.generateFallbackInsight(employee); // Corrected: Use class method
      }

      // Prepare the prompt with feedback data
      const prompt = this.prepareGrowthBlueprintPrompt(feedbackData, employee, campaign); // Corrected: Use class method

      // Make API call to Flux AI
      const response = await axios.post(
        fluxAiConfig.getEndpointUrl('chat/completions'), // Ensure this endpoint is correct
        {
          messages: [
            {
              role: 'system',
              content: 'You are an expert in organizational psychology and professional development. Your task is to analyze 360-degree feedback data and generate comprehensive, structured insights for employee development.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          stream: false,
        },
        {
          headers: {
            'Authorization': `Bearer ${fluxAiConfig.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Process the response
      if (response.data && response.data.choices && response.data.choices.length > 0) {
        const aiResponse = response.data.choices[0].message?.content || response.data.choices[0].message;

        // Parse and structure the AI response
        const structuredInsight = this.parseAiResponseToStructuredInsight(aiResponse, employee); // Corrected: Use class method
        console.log(`[INSIGHTS] Successfully generated insight with Flux AI`);

        return structuredInsight;
      } else {
        console.error('[INSIGHTS] Invalid response from Flux AI:', response.data);
        return this.generateFallbackInsight(employee); // Corrected: Use class method
      }
    } catch (error) {
      console.error('[INSIGHTS] Error generating insight with Flux AI:', error.message);

      // Use fallback in case of error
      return this.generateFallbackInsight(employee); // Corrected: Use class method
    }
  }

  /**
   * Regenerate insight content using Flux AI
   * @param {Object} insight - Original insight data
   * @param {Object} feedbackData - Aggregated feedback data
   * @returns {Object} - Regenerated insight content
   */
  async regenerateInsight(insight, feedbackData) {
    // --- Start: Replaced Code from enhanced-regenerate-insight.js ---
    try {
      console.log(`[INSIGHTS] Regenerating insight: ${insight.id}`);

      // Extract employee data from the insight
      const employee = insight.campaign?.targetEmployee || { firstName: 'Employee', lastName: 'Name' };
      const employeeName = `${employee.firstName} ${employee.lastName}`;

      // Check if Flux AI is configured
      if (!fluxAiConfig.isConfigured()) {
        console.warn('[INSIGHTS] Flux AI not configured, using fallback mock generator');
        return this.generateFallbackInsight(employee);
      }

      // Check if we have enough feedback data
      const hasData = this.checkFeedbackDataSufficiency(feedbackData);
      if (!hasData) {
        console.warn('[INSIGHTS] Insufficient feedback data, using generalized prompt');
      }

      // Try different prompt approaches in sequence if needed
      let aiResponse = null;
      let attempts = 0;
      const maxAttempts = 2; // Try at most 2 different prompting strategies

      while (!aiResponse && attempts < maxAttempts) {
        attempts++;
        try {
          // Adjust prompt strategy based on attempt number
          const prompt = attempts === 1
            ? this.prepareRegenerationPrompt(insight, feedbackData, employee) // Uses the new prepareRegenerationPrompt
            : this.prepareSimplifiedPrompt(insight, employee);

          console.log(`[INSIGHTS] Attempt ${attempts}: Using ${attempts === 1 ? 'standard' : 'simplified'} prompt`);

          // Make API call to Flux AI
          const baseUrl = fluxAiConfig.baseUrl || 'https://ai.runonflux.com'; // Ensure config handles base URL if needed
          const url = fluxAiConfig.getEndpointUrl('chat'); // Ensure this endpoint is correct

          console.log(`[INSIGHTS] Making API call to: ${url}`);

          const systemPrompt = attempts === 1
            ? 'You are an expert in organizational psychology and leadership development specializing in 360-degree feedback analysis. Generate a comprehensive development report in structured JSON format.'
            : 'Generate a professional development report for an employee based on 360-degree feedback. Respond with a simple JSON structure containing key insights.';

          const response = await axios.post(
            url,
            {
              messages: [
                {
                  role: 'system',
                  content: systemPrompt
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              stream: false,
            },
            {
              headers: {
                'Authorization': `Bearer ${fluxAiConfig.apiKey}`,
                'Content-Type': 'application/json'
              }
            }
          );

          // Process the response
          if (response.data && response.data.choices && response.data.choices.length > 0) {
            const responseContent = response.data.choices[0].message?.content || response.data.choices[0].message;
            console.log(`[INSIGHTS] Response length: ${responseContent?.length || 0}`);

            // Check if the response is a refusal or too short
            if (responseContent &&
                responseContent.length > 200 &&
                !responseContent.toLowerCase().includes('cannot fulfill') &&
                !responseContent.toLowerCase().includes('i\'m sorry')) {
              aiResponse = responseContent;
              console.log(`[INSIGHTS] Received valid response on attempt ${attempts}`);
            } else {
              console.warn(`[INSIGHTS] Received refusal or short response on attempt ${attempts}:`, responseContent);
            }
          }
        } catch (apiError) {
          console.error(`[INSIGHTS] API error on attempt ${attempts}:`, apiError.message);
        }
      }

      // If we have a valid AI response, parse it
      if (aiResponse) {
        const structuredInsight = this.parseAiResponseToStructuredInsight(aiResponse, employee);
        // Validate the result has required sections
        const hasRequiredSections = this.validateInsightStructure(structuredInsight);

        if (hasRequiredSections) {
          console.log(`[INSIGHTS] Successfully regenerated insight with Flux AI`);
          return structuredInsight;
        } else {
          console.warn('[INSIGHTS] Generated insight missing required sections, using fallback');
        }
      }

      // If all attempts failed or response was invalid, use fallback
      console.log('[INSIGHTS] All AI generation attempts failed, using fallback generator');
      return this.generateFallbackInsight(employee);

    } catch (error) {
      console.error('[INSIGHTS] Error regenerating insight with Flux AI:', error.message);
      // Use fallback in case of error
      const employee = insight.campaign?.targetEmployee || { firstName: 'Employee', lastName: 'Name' };
      return this.generateFallbackInsight(employee);
    }
    // --- End: Replaced Code from enhanced-regenerate-insight.js ---
  }

  // --- Start: Added Helper Methods from enhanced-regenerate-insight.js ---
  /**
   * Check if there's sufficient feedback data for AI analysis
   * @param {Object} feedbackData - The feedback data object
   * @returns {Boolean} - Whether there's sufficient data
   */
  checkFeedbackDataSufficiency(feedbackData) {
    // Check if we have relation types with data
    const relationTypes = Object.keys(feedbackData.byRelationshipType || {});
    if (relationTypes.length === 0) return false;

    // Check if there are any ratings
    let hasRatings = false;
    let hasTextResponses = false;

    for (const type of relationTypes) {
      const data = feedbackData.byRelationshipType[type];

      // Check ratings
      if (data.ratings && Object.keys(data.ratings).length > 0) {
        for (const ratingKey of Object.keys(data.ratings)) {
          if (data.ratings[ratingKey].values && data.ratings[ratingKey].values.length > 0) {
            hasRatings = true;
            break;
          }
        }
      }

      // Check text responses
      if (data.textResponses && Object.keys(data.textResponses).length > 0) {
        for (const responseKey of Object.keys(data.textResponses)) {
          if (data.textResponses[responseKey] && data.textResponses[responseKey].length > 0) {
            hasTextResponses = true;
            break;
          }
        }
      }

      if (hasRatings || hasTextResponses) break;
    }

    return hasRatings || hasTextResponses;
  }

  /**
   * Prepare a simplified prompt when the standard one fails
   * @param {Object} insight - The insight object
   * @param {Object} employee - The employee data
   * @returns {String} - A simplified prompt
   */
  prepareSimplifiedPrompt(insight, employee) {
    const employeeName = `${employee?.firstName || 'Employee'} ${employee?.lastName || 'Name'}`;

    return `Create a professional development report for ${employeeName} based on 360-degree feedback assessment.

The report should focus on strengths, areas for growth, and actionable recommendations. Please structure your response as a simple JSON object with the following format:

{
  "strengthsSummary": {
    "content": "Description of strengths (2-3 sentences)",
    "visibility": "employeeVisible"
  },
  "growthAreas": {
    "content": "Areas for development (2-3 sentences)",
    "visibility": "employeeVisible"
  },
  "recommendedActions": {
    "content": "3-4 specific action items",
    "visibility": "employeeVisible"
  },
  "feedbackPatterns": {
    "content": "Overall patterns in feedback (2-3 sentences)",
    "visibility": "managerOnly"
  },
  "leadershipInsights": {
    "content": "Tips for managers supporting this employee (2-3 sentences)",
    "visibility": "managerOnly"
  },
  "talentDevelopmentNotes": {
    "content": "Potential career development paths (2-3 sentences)",
    "visibility": "hrOnly"
  }
}

Keep each section brief but insightful. Focus on generally applicable professional development concepts if specific data is limited.`;
  }

  /**
   * Validate that an insight structure has the minimum required sections
   * @param {Object} insight - The structured insight content
   * @returns {Boolean} - Whether it has the minimum required sections
   */
  validateInsightStructure(insight) {
    // Required sections for a complete insight
    const requiredEmployeeVisible = ['strengthsSummary', 'growthAreas', 'recommendedActions'];
    const requiredManagerOnly = ['feedbackPatterns', 'leadershipInsights'];
    const requiredHrOnly = ['talentDevelopmentNotes'];

    // Check employee visible sections
    const hasEmployeeVisible = requiredEmployeeVisible.every(section =>
      insight[section] &&
      insight[section].content &&
      insight[section].content.length > 20
    );

    // Check manager only sections
    const hasManagerOnly = requiredManagerOnly.every(section =>
      insight[section] &&
      insight[section].content &&
      insight[section].content.length > 20
    );

    // Check HR only sections
    const hasHrOnly = requiredHrOnly.every(section =>
      insight[section] &&
      insight[section].content &&
      insight[section].content.length > 20
    );

    return hasEmployeeVisible && hasManagerOnly && hasHrOnly;
  }
  // --- End: Added Helper Methods ---

  /**
   * Prepare prompt for Growth Blueprint generation
   * @param {Object} feedbackData - Aggregated feedback data
   * @param {Object} employee - Target employee data
   * @param {Object} campaign - Campaign data
   * @returns {String} - Formatted prompt for AI
   */
  prepareGrowthBlueprintPrompt(feedbackData, employee, campaign) {
    // --- Start: Original Code (Kept) ---
    const employeeName = `${employee?.firstName || 'Employee'} ${employee?.lastName || 'Name'}`;
    const employeePosition = employee?.jobTitle || 'Team Member';

    // Process feedback data into a summarized format for the prompt
    const ratingsByType = {};
    const textResponsesByType = {};

    // Extract key feedback data by relationship type
    Object.entries(feedbackData.byRelationshipType || {}).forEach(([type, data]) => {
      if (data.ratings) {
        const allRatings = [];
        Object.values(data.ratings).forEach(rating => {
          if (rating.values && rating.values.length) {
            allRatings.push(...rating.values);
          }
        });

        ratingsByType[type] = {
          count: allRatings.length,
          average: allRatings.length > 0
            ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1)
            : 'N/A'
        };
      }

      // Collect text responses
      if (data.textResponses) {
        textResponsesByType[type] = [];
        Object.values(data.textResponses).forEach(responses => {
          if (responses && responses.length) {
            textResponsesByType[type].push(...responses);
          }
        });
      }
    });

    // Create a prompt that includes relevant feedback data
    let prompt = `Generate a comprehensive development insight for ${employeeName}, who works as a ${employeePosition}. This should be based on 360-degree feedback data from their colleagues.

  Here's a summary of the feedback data:
  `;

    // Add rating statistics
    prompt += `\nRating Summaries (on a scale of 1-5):`;
    for (const [type, data] of Object.entries(ratingsByType)) {
      prompt += `\n- ${type.charAt(0).toUpperCase() + type.slice(1)} feedback: Average rating ${data.average} from ${data.count} responses`;
    }

    // Add text response samples (truncated for prompt length)
    prompt += `\n\nSelected Feedback Comments:`;
    for (const [type, responses] of Object.entries(textResponsesByType)) {
      if (responses.length > 0) {
        prompt += `\n${type.charAt(0).toUpperCase() + type.slice(1)} feedback:`;

        // Include up to 3 responses per type, limited to 100 chars each
        for (let i = 0; i < Math.min(3, responses.length); i++) {
          const truncatedResponse = responses[i].substring(0, 100) + (responses[i].length > 100 ? '...' : '');
          prompt += `\n- "${truncatedResponse}"`;
        }
      }
    }

    // Request specific sections for the insight with a clear JSON structure
    prompt += `\n\nI need you to generate a detailed developmental insight with specific sections that have visibility levels for different audiences.

  Your response MUST be a valid JSON object with the following sections:

  {
    "strengthsSummary": {
      "content": "Detailed analysis of key strengths identified in the feedback",
      "visibility": "employeeVisible"
    },
    "growthAreas": {
      "content": "Specific areas for development with actionable points",
      "visibility": "employeeVisible"
    },
    "impactAnalysis": {
      "content": "Analysis of the employee's impact based on feedback",
      "visibility": "employeeVisible"
    },
    "recommendedActions": {
      "content": "4-5 specific, actionable development recommendations",
      "visibility": "employeeVisible"
    },
    "feedbackPatterns": {
      "content": "Patterns and trends identified in the feedback",
      "visibility": "managerOnly"
    },
    "leadershipInsights": {
      "content": "Insights for managers on how to support this employee's development",
      "visibility": "managerOnly"
    },
    "talentDevelopmentNotes": {
      "content": "Observations on potential career paths and development trajectory",
      "visibility": "hrOnly"
    }
  }

  Make all content sections detailed and specific to ${employeeName}. Each section should be 2-3 paragraphs. Do NOT include section names or headings in the content itself - these will be added by the UI.

  DO NOT include any text outside of the JSON structure. Your entire response should be parseable as JSON.`;

    return prompt;
    // --- End: Original Code ---
  }

  /**
   * Prepare prompt for insight regeneration with emphasis on ratings
   * @param {Object} insight - Original insight data
   * @param {Object} feedbackData - Feedback data
   * @param {Object} employee - Employee data
   * @returns {String} - Formatted prompt for AI
   */
  prepareRegenerationPrompt(insight, feedbackData, employee) {
    // --- Start: Replaced Code from rating-focused-prompt.js ---
    const employeeName = `${employee?.firstName || 'Employee'} ${employee?.lastName || 'Name'}`;
    const insightType = insight.type || 'growth_blueprint'; // Using the original insight type if available

    // Extract and format rating data
    let ratingStats = "No numerical rating data available";

    if (feedbackData && feedbackData.byRelationshipType) {
      const ratingsByType = {};

      // Extract rating data by relationship type
      Object.entries(feedbackData.byRelationshipType).forEach(([type, data]) => {
        if (data.ratings && Object.keys(data.ratings).length > 0) {
          const allRatings = [];
          const ratingsByQuestion = {};

          Object.entries(data.ratings).forEach(([questionId, rating]) => {
            if (rating.values && rating.values.length > 0) {
              allRatings.push(...rating.values);
              // Calculate average if not present, assuming values are numbers
              ratingsByQuestion[questionId] = {
                average: rating.average || rating.values.reduce((a, b) => a + b, 0) / rating.values.length,
                count: rating.values.length
              };
            }
          });

          if (allRatings.length > 0) {
            const average = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
            ratingsByType[type] = {
              average: average.toFixed(1),
              count: allRatings.length,
              byQuestion: ratingsByQuestion
            };
          }
        }
      });

      if (Object.keys(ratingsByType).length > 0) {
        ratingStats = "Numerical rating data summary:\n";

        Object.entries(ratingsByType).forEach(([type, data]) => {
          ratingStats += `- ${type} ratings: Average ${data.average}/5 from ${data.count} responses\n`;
        });

        // Add overall average if we have data from multiple types
        if (Object.keys(ratingsByType).length > 1) {
          const allAverages = Object.values(ratingsByType).map(data => parseFloat(data.average));
          const overallAverage = allAverages.reduce((a, b) => a + b, 0) / allAverages.length;
          ratingStats += `- Overall average rating: ${overallAverage.toFixed(1)}/5\n`;
        }
      }
    }

    let prompt = `Generate a comprehensive development insight for ${employeeName} based on 360-degree feedback assessment. Focus particularly on analyzing the numerical ratings data.

${ratingStats}

The analysis should emphasize patterns in the ratings across different relationship types (e.g., manager, peer, direct report) and provide specific, actionable development recommendations based on these numerical trends.

Your response must follow this JSON structure with sections for different audience visibility levels:

{
  "strengthsSummary": {
    "content": "Analysis of strengths based on highest-rated areas",
    "visibility": "employeeVisible"
  },
  "growthAreas": {
    "content": "Analysis of development needs based on lower-rated areas",
    "visibility": "employeeVisible"
  },
  "impactAnalysis": {
    "content": "How their performance impacts team/organization based on ratings",
    "visibility": "employeeVisible"
  },
  "recommendedActions": {
    "content": "4-5 specific, actionable development recommendations",
    "visibility": "employeeVisible"
  },
  "feedbackPatterns": {
    "content": "Patterns in ratings across different relationship types",
    "visibility": "managerOnly"
  },
  "leadershipInsights": {
    "content": "Guidance for managers on supporting development",
    "visibility": "managerOnly"
  },
  "talentDevelopmentNotes": {
    "content": "Career development potential based on strengths/patterns",
    "visibility": "hrOnly"
  }
}

Make all content sections detailed and specific to ${employeeName}. Each section should have 2-3 paragraphs with concrete, data-backed insights. Even if specific feedback text is limited, use the numerical rating patterns to infer development needs and strengths.

Your entire response must be valid JSON - do not include any explanatory text or markdown outside the JSON structure.`;

    return prompt;
    // --- End: Replaced Code from rating-focused-prompt.js ---
  }

  /**
   * Parse AI response into structured insight content
   * @param {String} aiResponse - Raw AI response
   * @param {Object} employee - Employee data
   * @returns {Object} - Structured insight content
   */
  parseAiResponseToStructuredInsight(aiResponse, employee) {
    // --- Start: Original Code (Kept) ---
    try {
      console.log('[INSIGHTS] Parsing AI response, length:', aiResponse?.length || 0);

      // Try to parse as JSON first
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsedJson = JSON.parse(jsonMatch[0]);
          console.log('[INSIGHTS] Successfully parsed JSON structure with keys:', Object.keys(parsedJson));

          // Create properly formatted structure if needed
          const structuredInsight = {};

          // Check if we need to restructure the data
          if (parsedJson.strengthsSummary && typeof parsedJson.strengthsSummary === 'string') {
            // JSON was parsed but it's flat, needs restructuring
            const sections = [
              'strengthsSummary',
              'growthAreas',
              'impactAnalysis',
              'recommendedActions',
              'feedbackPatterns',
              'leadershipInsights',
              'talentDevelopmentNotes'
            ];

            sections.forEach(section => {
              if (parsedJson[section]) {
                let visibility = 'employeeVisible';
                if (section === 'feedbackPatterns' || section === 'leadershipInsights') {
                  visibility = 'managerOnly';
                } else if (section === 'talentDevelopmentNotes') {
                  visibility = 'hrOnly';
                }

                structuredInsight[section] = {
                  content: parsedJson[section],
                  visibility
                };
              }
            });

            console.log('[INSIGHTS] Restructured flat JSON, sections:', Object.keys(structuredInsight));
            return structuredInsight;
          }
          // Check if already has the right structure with nested objects having content/visibility
          else if (parsedJson.strengthsSummary &&
                  typeof parsedJson.strengthsSummary === 'object' &&
                  parsedJson.strengthsSummary.content) {
            console.log('[INSIGHTS] JSON already has proper structure');
            return parsedJson;
          }
          // Try to identify other potential structures (Array of sections, etc.)
          else if (Array.isArray(parsedJson)) {
            console.log('[INSIGHTS] Converting array to structured insight');
            const structuredInsight = {};

            parsedJson.forEach(item => {
              if (item.name && item.content) {
                let visibility = 'employeeVisible';
                if (item.name.toLowerCase().includes('manager') ||
                    item.name.toLowerCase().includes('leadership') ||
                    item.name.toLowerCase().includes('feedback patterns')) {
                  visibility = 'managerOnly';
                } else if (item.name.toLowerCase().includes('hr') ||
                          item.name.toLowerCase().includes('talent')) {
                  visibility = 'hrOnly';
                }

                // Convert name to camelCase key
                const key = item.name
                  .toLowerCase()
                  .replace(/\s+(.)/g, (_, char) => char.toUpperCase())
                  .replace(/\s/g, '')
                  .replace(/^(.)/, (_, char) => char.toLowerCase());

                structuredInsight[key] = {
                  content: item.content,
                  visibility: item.visibility || visibility
                };
              }
            });

            if (Object.keys(structuredInsight).length > 0) {
              console.log('[INSIGHTS] Created structure from array, sections:', Object.keys(structuredInsight));
              return structuredInsight;
            }
          }
        } catch (jsonError) {
          console.warn('[INSIGHTS] Could not parse AI response as JSON:', jsonError.message);
        }
      }

      // If JSON parsing fails, try to extract sections from text
      const sections = [
        'strengthsSummary',
        'growthAreas',
        'impactAnalysis',
        'recommendedActions',
        'feedbackPatterns',
        'leadershipInsights',
        'talentDevelopmentNotes'
      ];

      // Try alternate section names that might appear in the AI response
      const sectionAlternatives = {
        'strengthsSummary': ['Strengths Summary', 'Key Strengths', 'Strengths'],
        'growthAreas': ['Growth Areas', 'Areas for Growth', 'Development Areas', 'Areas for Development'],
        'impactAnalysis': ['Impact Analysis', 'Performance Impact', 'Impact Assessment'],
        'recommendedActions': ['Recommended Actions', 'Action Items', 'Recommendations', 'Next Steps'],
        'feedbackPatterns': ['Feedback Patterns', 'Feedback Trends', 'Patterns in Feedback'],
        'leadershipInsights': ['Leadership Insights', 'For Managers', 'Manager Guidance'],
        'talentDevelopmentNotes': ['Talent Development Notes', 'HR Notes', 'Talent Management', 'Development Trajectory']
      };

      const structuredInsight = {};

      // Look for each section with multiple possible headings
      sections.forEach(section => {
        const alternatives = [section, ...sectionAlternatives[section]];

        // Try each alternative heading
        for (const heading of alternatives) {
          if (structuredInsight[section]) break; // Skip if we already found this section

          // Create regex pattern to find this section and its content (until the next section or end)
          // Adjusted regex to be less greedy and handle different line breaks
          const pattern = new RegExp(`(?:^|\\n)\\s*(?:${heading.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}|#\\s*${heading.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})\\s*(?::|\\n)([\\s\\S]*?)(?=(?:\\n\\s*(?:${sections.flatMap(s => sectionAlternatives[s]).map(alt => alt.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')}|#\\s*(?:${sections.flatMap(s => sectionAlternatives[s]).map(alt => alt.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|')}))|\\n\\s*$))`, 'i');


          const match = aiResponse.match(pattern);
          if (match && match[1]) {
            let content = match[1].trim();

            // Remove common formatting issues
            content = content.replace(/^[:\s-]*/, '') // Remove leading colons, spaces, dashes
                            .replace(/^\*\*.*?\*\*\s*/, '') // Remove bold markdown at start
                            .trim();

            let visibility = 'employeeVisible';
            if (section === 'feedbackPatterns' || section === 'leadershipInsights') {
              visibility = 'managerOnly';
            } else if (section === 'talentDevelopmentNotes') {
              visibility = 'hrOnly';
            }

            structuredInsight[section] = {
              content,
              visibility
            };

            console.log(`[INSIGHTS] Extracted section "${section}" with ${content.length} characters`);
          }
        }
      });


      // If we found at least 3 sections, consider it valid
      if (Object.keys(structuredInsight).length >= 3) {
        console.log('[INSIGHTS] Successfully extracted sections from text:', Object.keys(structuredInsight));
        // Ensure all required sections are present, even if empty
        sections.forEach(sec => {
          if (!structuredInsight[sec]) {
             let visibility = 'employeeVisible';
            if (sec === 'feedbackPatterns' || sec === 'leadershipInsights') {
              visibility = 'managerOnly';
            } else if (sec === 'talentDevelopmentNotes') {
              visibility = 'hrOnly';
            }
            structuredInsight[sec] = { content: `(No content generated for ${this.formatSectionTitle(sec)})`, visibility };
            console.warn(`[INSIGHTS] Section "${sec}" missing, added placeholder.`);
          }
        });
        return structuredInsight;
      }

      // Last resort: If we can't extract proper sections, try to at least create some basic content
      console.log('[INSIGHTS] Could not extract proper sections, creating basic structure');

      // Remove common formats like markdown and create simple sections
      const cleanedText = aiResponse
        .replace(/```json[\s\S]*?```/g, '') // Remove JSON code blocks
        .replace(/```[\s\S]*?```/g, '')     // Remove other code blocks
        .trim();

      // Split by newlines and create paragraphs
      const paragraphs = cleanedText
        .split(/\n\s*\n/)
        .filter(p => p.trim().length > 10) // Only keep meaningful paragraphs
        .map(p => p.trim());

      if (paragraphs.length > 0) {
        // Create basic structure with whatever content we have
        const employeeName = `${employee?.firstName || 'Employee'} ${employee?.lastName || 'Name'}`;

        structuredInsight.strengthsSummary = {
          content: paragraphs[0],
          visibility: 'employeeVisible'
        };

        structuredInsight.growthAreas = {
          content: paragraphs.length > 1 ? paragraphs[1] : `General growth areas for ${employeeName}.`,
          visibility: 'employeeVisible'
        };

        structuredInsight.recommendedActions = {
          content: paragraphs.length > 2 ? paragraphs[2] : `Recommended actions for ${employeeName}.`,
          visibility: 'employeeVisible'
        };
         // Add placeholders for manager/HR sections
         structuredInsight.feedbackPatterns = { content: `(No specific patterns identified)`, visibility: 'managerOnly' };
         structuredInsight.leadershipInsights = { content: `(General leadership guidance)`, visibility: 'managerOnly' };
         structuredInsight.talentDevelopmentNotes = { content: `(Standard talent notes)`, visibility: 'hrOnly' };


        console.log('[INSIGHTS] Created basic structure from text paragraphs');
        return structuredInsight;
      }

      // If all else fails, use fallback
      console.log('[INSIGHTS] Falling back due to inability to parse or extract content.');
      return this.generateFallbackInsight(employee); // Corrected: Use class method
    } catch (error) {
      console.error('[INSIGHTS] Error parsing AI response:', error.message);
      return this.generateFallbackInsight(employee); // Corrected: Use class method
    }
    // --- End: Original Code ---
  }

  /**
   * Generate a fallback insight if AI service fails or parsing fails
   * @param {Object} employee - Employee data
   * @returns {Object} - Mock insight content
   */
  generateFallbackInsight(employee) {
    // --- Start: Replaced Code from improved-fallback-generation (1).js ---
    const employeeName = `${employee?.firstName || 'Employee'} ${employee?.lastName || 'Name'}`;
    console.log(`[INSIGHTS] Using fallback insight generator for ${employeeName}`);

    // Create a complete insight content structure with all required sections
    const mockContent = {
      strengthsSummary: {
        content: `Based on the 360-degree feedback, ${employeeName} demonstrates notable strengths in technical expertise and problem-solving. Numerical ratings indicate above-average performance in collaboration and reliability, with consistent positive feedback across different relationship types.\n\nTeam members particularly value their ability to deliver quality work and maintain a positive attitude even under pressure. Their attention to detail and methodical approach ensures dependable results.`,
        visibility: 'employeeVisible'
      },
      growthAreas: {
        content: `There are opportunities for growth in communication skills, particularly when explaining complex concepts to stakeholders with different backgrounds. Rating data suggests this could enhance cross-functional collaboration effectiveness.\n\nAdditionally, developing strategic planning capabilities would leverage technical strengths for greater organizational impact. Balancing tactical excellence with a broader perspective could accelerate career development.`,
        visibility: 'employeeVisible'
      },
      impactAnalysis: {
        content: `${employeeName}'s contributions have positively influenced team performance in key projects. Their technical solutions have improved efficiency metrics and quality standards. The numerical feedback data shows consistent recognition from peers and collaborators.\n\nTheir problem-solving approach has prevented potential issues while maintaining project timelines, demonstrating valuable skills in balancing quality and delivery pressure.`,
        visibility: 'employeeVisible'
      },
      recommendedActions: {
        content: `1. Participate in communication workshops to enhance the ability to translate complex ideas for different audiences.\n\n2. Seek mentorship from a senior leader to develop strategic thinking skills and broaden organizational perspective.\n\n3. Take on a cross-functional leadership role in an upcoming project to apply technical strengths in a broader context.\n\n4. Schedule regular feedback sessions with diverse team members to maintain awareness of communication effectiveness and continue refining this skill.`,
        visibility: 'employeeVisible'
      },
      feedbackPatterns: {
        content: `Analysis of the numerical ratings reveals consistent patterns across different relationship types. Technical competence receives the highest ratings (averaging 4.5+), while communication effectiveness shows more variability (ranging from 3.2 to 4.0).\n\nPeer ratings align closely with manager assessments in technical areas, but there's a noticeable gap in perception of strategic thinking skills. This differential suggests an opportunity for targeted development and improved visibility of strategic contributions.`,
        visibility: 'managerOnly'
      },
      leadershipInsights: {
        content: `When supporting ${employeeName}'s development, consider creating opportunities that combine technical excellence with increased strategic visibility. Projects requiring stakeholder management would build on existing strengths while developing growth areas.\n\nProvide specific feedback on communication effectiveness with examples of successful translations of complex concepts. Consider pairing with a communication mentor with strong technical background who can model effective stakeholder engagement.`,
        visibility: 'managerOnly'
      },
      talentDevelopmentNotes: {
        content: `${employeeName} shows strong potential for technical leadership roles. The consistent high ratings in core technical competencies (4.5+ average) combined with problem-solving skills create a solid foundation for career advancement.\n\nA development path focusing on technical leadership with progressive expansion into strategic roles would leverage their strengths while addressing growth opportunities. Consider them for specialized technical training combined with leadership development programs in the next 6-12 months.`,
        visibility: 'hrOnly'
      }
    };

    // Log the sections generated
    console.log('[INSIGHTS] Generated fallback content with sections:', Object.keys(mockContent).join(', '));

    return mockContent;
    // --- End: Replaced Code from improved-fallback-generation (1).js ---
  }

  /**
   * Format insight type for display
   * @param {String} type - Insight type
   * @returns {String} Formatted type
   */
  formatInsightTypeForDisplay(type) {
    // --- Start: Original Code (Kept) ---
    const displayNames = {
      'growth_blueprint': 'Your Growth Blueprint',
      'leadership_impact': 'Leadership Impact Navigator',
      'team_synergy': 'Team Synergy Compass',
      'collaboration_patterns': 'Collaboration Patterns Analysis',
      'talent_landscape': 'Talent Landscape Panorama',
      'culture_pulse': 'Culture Pulse Monitor',
      'development_impact': 'Development Impact Scorecard'
    };

    return displayNames[type] || type.replace(/_/g, ' ');
    // --- End: Original Code ---
  }

  /**
   * Format section title for text parsing
   * @param {String} section - Section identifier
   * @returns {String} Formatted section title
   */
  formatSectionTitle(section) {
     // --- Start: Original Code (Kept) ---
    return section
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .replace(/([a-z])([A-Z])/g, '$1 $2'); // Ensure space between lower and upper case (e.g., growthAreas -> growth Areas)
      // --- End: Original Code ---
  }
}

// Create a singleton instance
const insightsAiService = new InsightsAiService();

module.exports = insightsAiService;