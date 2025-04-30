// services/ai-feedback-service.js
const axios = require('axios');
require('dotenv').config();

/**
 * Service for evaluating feedback quality using FluxAI
 */
class AiFeedbackService {
  constructor() {
    // Self-contained FluxAI configuration
    this.fluxAiConfig = {
      baseUrl: process.env.FLUX_AI_BASE_URL || 'https://ai.runonflux.com',
      apiKey: process.env.FLUX_AI_API_KEY,
      model: process.env.FLUX_AI_MODEL || 'DeepSeek R1 Distill Qwen 32B',

      endpoints: {
        balance: '/v1/balance',
        llms: '/v1/llms',
        chat: '/v1/chat/completions',
        files: '/v1/files'
      }
    };

    console.log(`FluxAI configured with baseUrl: ${this.fluxAiConfig.baseUrl}`);
    console.log(`FluxAI model: ${this.fluxAiConfig.model}`);
  }

  /**
   * Evaluate feedback for quality using FluxAI
   */
  async evaluateFeedback(responses, assessorType, targetEmployeeId) {
    try {
      console.log('Evaluating feedback using FluxAI');

      // IMPORTANT: First perform our own rule-based check for clearly inappropriate content
      // This ensures we catch obvious issues even if AI fails
      const quickAnalysis = this.analyzeFeedback(responses);
      if (quickAnalysis.hasOffensiveLanguage || quickAnalysis.nonConstructivePhrases.length > 0) {
        console.log('Rule-based pre-check found offensive content - skipping AI evaluation');
        return this.fallbackEvaluation(responses, assessorType);
      }

      // Check if API key is configured
      if (!this.fluxAiConfig.apiKey) {
        console.warn('FluxAI API key not configured. Falling back to rule-based evaluation.');
        return this.fallbackEvaluation(responses, assessorType);
      }

      // Format the feedback in a simple text format
      const formattedFeedback = this.formatFeedbackForAI(responses, assessorType);
      console.log('Formatted feedback (sample):', formattedFeedback.substring(0, 200) + '...');

      // Create a detailed, structured prompt for analysis
      const prompt = this.createAIPrompt(responses, assessorType);

      console.log('Calling FluxAI API with improved structured prompt...');

      try {
        // Create the request data
        const requestData = {
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          stream: false
        };

        // Include model if specified
        if (this.fluxAiConfig.model) {
          requestData.model = this.fluxAiConfig.model;
        }

        // Make the API call with proper headers
        const response = await axios({
          method: 'POST',
          url: `${this.fluxAiConfig.baseUrl}${this.fluxAiConfig.endpoints.chat}`,
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': this.fluxAiConfig.apiKey
          },
          data: requestData
        });

        // Log information for debugging
        console.log('FluxAI API status code:', response.status);

        if (response.data && response.data.choices && response.data.choices.length > 0) {
          // Extract the content from the response, handling different possible formats
          let aiContent = null;
          const choice = response.data.choices[0];

          if (typeof choice.message === 'object' && choice.message.content) {
            // Standard format: choice.message is an object with content property
            aiContent = choice.message.content;
          } else if (typeof choice.message === 'string') {
            // Alternative format: choice.message is a string directly
            aiContent = choice.message;
          } else if (choice.content) {
            // Another alternative: content directly on choice
            aiContent = choice.content;
          } else {
            // If we can't find content in expected places, try to extract from choice as a string
            aiContent = JSON.stringify(choice);
          }

          if (aiContent) {
            console.log('AI response content:', aiContent);

            // Check for refusal patterns or very short responses - these often indicate the AI detected inappropriate content
            if (aiContent.includes('**QUALITY:') || aiContent.includes('QUALITY:')) {
              console.log('AI provided a proper structured analysis');

              // Extract structured information from AI response
              // ***MODIFICATION POINT*** Quality extraction now considers specificity
              const quality = this.extractQualityFromAIResponse(aiContent);
              const suggestions = this.extractSuggestionsFromAIResponse(aiContent);
              const questionFeedback = this.extractQuestionFeedbackFromAIResponse(aiContent, responses);
              

              // Generate appropriate message based on quality assessment
              // ***MODIFICATION POINT*** Message generation might be refined based on quality
              const message = this.generateMessageFromQuality(quality, aiContent); // Pass aiContent for context

              return {
                quality,
                message,
                suggestions,
                questionFeedback,
                analysisDetails: {
                  aiResponse: aiContent,
                  extractedQuality: quality,
                  usedAI: true
                }
              };
            }
            // Only fall back if the response is very short or contains explicit refusal language
            else if (aiContent.length < 50 ||
                     aiContent.match(/i (cannot|can't|am unable to) (analyze|evaluate|review|provide)/i) ||
                     aiContent.match(/would not be (appropriate|ethical|responsible)/i)) {
              console.log('AI likely refused to analyze the content');
              return this.fallbackEvaluation(responses, assessorType);
            }

            // Extract structured information from AI response (even if QUALITY tag missing, attempt analysis)
             // ***MODIFICATION POINT*** Quality extraction now considers specificity
            const quality = this.extractQualityFromAIResponse(aiContent);
            const suggestions = this.extractSuggestionsFromAIResponse(aiContent);
            const questionFeedback = this.extractQuestionFeedbackFromAIResponse(aiContent, responses);

            // Generate appropriate message based on quality assessment
            // ***MODIFICATION POINT*** Message generation might be refined based on quality
            const message = this.generateMessageFromQuality(quality, aiContent); // Pass aiContent for context

            return {
              quality,
              message,
              suggestions,
              questionFeedback,
              analysisDetails: {
                aiResponse: aiContent,
                extractedQuality: quality,
                usedAI: true
              }
            };
          } else {
            console.warn('Could not extract content from AI response');
            console.log('Raw response data:', JSON.stringify(response.data, null, 2));
          }
        } else {
          console.warn('No choices in API response:', JSON.stringify(response.data, null, 2));
        }

        // If we reach this point, something went wrong with parsing the response
        console.warn('Could not properly parse FluxAI response. Falling back to rule-based evaluation.');
        return this.fallbackEvaluation(responses, assessorType);

      } catch (apiError) {
        console.error('Error calling FluxAI API:', apiError.message);

        if (apiError.response) {
          console.error('FluxAI API error status:', apiError.response.status);
          console.error('FluxAI API error data:', JSON.stringify(apiError.response.data, null, 2));
        }

        if (apiError.request) {
          console.error('Request was made but no response received');
        }

        return this.fallbackEvaluation(responses, assessorType);
      }

    } catch (error) {
      console.error('Error in feedback evaluation:', error.message);
      return this.fallbackEvaluation(responses, assessorType);
    }
  }

  // Create a more improved prompt for AI analysis
  createAIPrompt(responses, assessorType) {
    // Use the *modified* formatFeedbackForAI which includes categories
    const formattedFeedback = this.formatFeedbackForAI(responses, assessorType);
  
    // Calculate average rating for incongruence check context
    const ratingResponses = responses.filter(r => r.questionType === 'rating' && typeof r.rating === 'number');
    let averageRating = null;
    if (ratingResponses.length > 0) {
        const sum = ratingResponses.reduce((acc, r) => acc + r.rating, 0);
        averageRating = (sum / ratingResponses.length).toFixed(1);
    }
  
    return `You are an expert 360 Feedback Coach. Your goal is to help the assessor provide feedback that is specific, fair, balanced, actionable, and professional, ultimately aiding the recipient's development. Review the following 360-degree feedback provided by a ${assessorType}:

${formattedFeedback}

Critically evaluate the feedback based on ALL the following dimensions:

QUALITY: Overall assessment ('good', 'needs_improvement', 'poor'). Base this on the combined evaluation of other dimensions. Downgrade quality if Specificity, Actionability, or Congruence are poor.
SPECIFICITY: Are claims and ratings supported by concrete examples or behavioral descriptions? ('good', 'needs_improvement', 'poor'). High ratings (4/5) or low ratings (1/2) require specific justification in the comments. General statements without examples indicate poor specificity.
ACTIONABILITY: Does constructive feedback suggest clear, actionable steps or areas for focus? ('good', 'needs_improvement', 'poor'). Vague criticisms are not actionable.
BALANCE: Is there a fair mix of strengths and areas for development, or is it overwhelmingly positive or negative? ('good', 'needs_improvement', 'poor').
PROFESSIONALISM: Is the language respectful, objective, and constructive? ('good', 'needs_improvement', 'poor'). Avoids personal attacks, insults, or overly casual language.
CONGRUENCE (Rating vs. Comment): Do the numerical ratings align with the sentiment and content of the written comments? ('good', 'needs_improvement', 'poor'). Check for mismatches (e.g., average rating is ${averageRating}/5, but comments are overwhelmingly positive/negative, or vice-versa). Explicitly state if a mismatch is detected.
CONGRUENCE (Category Consistency): Review ratings within the same category. Are there potentially contradictory ratings (e.g., 1 and 5) for closely related skills within a category that might warrant review? ('good', 'questionable', 'poor'). Only flag 'questionable' or 'poor' if contradictions seem significant. It's okay if ratings differ somewhat.
BEHAVIOR vs. TRAIT: Does the feedback focus on observable behaviors (good) rather than fixed personality traits (less helpful)? ('good', 'needs_improvement', 'poor'). E.g., "Did not meet deadline" (behavior) vs. "Is lazy" (trait).
IMPACT: Does the feedback explain the impact of the behaviors mentioned (e.g., "When deadlines are missed, it delays the project kickoff")? ('good', 'needs_improvement', 'poor').
CONFIDENTIALITY: Avoids mentioning specific confidential projects, salaries, or personal issues? ('good', 'needs_improvement', 'poor').
Provide your analysis in the following EXACT format:

OVERALL ASSESSMENT

QUALITY: [good | needs_improvement | poor]
SPECIFICITY: [good | needs_improvement | poor]
ACTIONABILITY: [good | needs_improvement | poor]
BALANCE: [good | needs_improvement | poor]
PROFESSIONALISM: [good | needs_improvement | poor]
CONGRUENCE (Rating vs. Comment): [good | needs_improvement | poor] - [Brief comment, e.g., "Aligns well" or "Significant mismatch detected: low ratings but positive text."]
CONGRUENCE (Category Consistency): [good | questionable | poor] - [Brief comment, e.g., "Consistent" or "Ratings in 'Category X' vary significantly (e.g., 1 vs 5). Consider reviewing."]
BEHAVIOR vs. TRAIT: [good | needs_improvement | poor] - [Brief comment if improvement needed]
IMPACT: [good | needs_improvement | poor] - [Brief comment if improvement needed]
CONFIDENTIALITY: [good | needs_improvement | poor] - [Brief comment if improvement needed]

SUMMARY: [Your concise overall summary (1-2 sentences) highlighting key strengths and weaknesses of the feedback provided.]

RECOMMENDATIONS FOR IMPROVEMENT

[Specific recommendation 1, focusing on the most critical areas based on the assessment above. Suggest using the STAR method (Situation, Task, Action, Result) for examples if specificity is poor.]
[Specific recommendation 2]
[Optional specific recommendation 3]
QUESTION-SPECIFIC FEEDBACK

[Provide feedback ONLY for questions with notable issues, keyed by "Question X:". Focus on lack of specificity for ratings, generic comments, potential incongruence, behavior/trait issues, etc. Be concise.]
Question X: [e.g., Rating 5/5 lacks supporting examples in comments.]
Question Y: [e.g., Comment focuses on personality ("not creative") rather than observable behavior.]
Question Z: [e.g., Ratings for Q-Z (Category C) and Q-W (Category C) seem contradictory (1 vs 5). Is this intended?]`;
  }

  // Extract quality assessment from AI response - MODIFIED
  extractQualityFromAIResponse(aiResponse) {
      let determinedQuality = 'good'; // Default assumption

      // Look for the main structured quality assessment first
      const qualityMatch = aiResponse.match(/\*\*QUALITY:\s*(good|needs_improvement|poor)\*\*/i) ||
                          aiResponse.match(/QUALITY:\s*(good|needs_improvement|poor)/i);

      if (qualityMatch && qualityMatch[1]) {
          determinedQuality = qualityMatch[1].toLowerCase().trim();
          console.log(`AI explicitly rated quality as: ${determinedQuality}`);
      } else {
          // Fallback text analysis (keep existing logic here if needed)
          // ... (existing fallback logic based on keywords like 'offensive', 'needs improvement')
          console.warn('Could not find structured QUALITY tag. Attempting fallback analysis.');
          // Basic fallback based on keywords - less reliable
          const lowerResponse = aiResponse.toLowerCase();
          if (lowerResponse.includes('poor') || lowerResponse.includes('offensive') || lowerResponse.includes('unprofessional') || lowerResponse.includes('significant revision')) {
              determinedQuality = 'poor';
          } else if (lowerResponse.includes('needs improvement') || lowerResponse.includes('lacks specific') || lowerResponse.includes('too general') || lowerResponse.includes('unbalanced') || lowerResponse.includes('vague')) {
              determinedQuality = 'needs_improvement';
          }
      }

      // **Crucial Override Logic:** Even if AI says 'good', downgrade if other critical factors are poor.
      // The prompt *asks* the AI to do this, but this adds a safety net.
      if (determinedQuality === 'good') {
          const specificityMatch = aiResponse.match(/\*\*SPECIFICITY:\s*(needs_improvement|poor)\*\*/i) || aiResponse.match(/SPECIFICITY:\s*(needs_improvement|poor)/i);
          const actionabilityMatch = aiResponse.match(/\*\*ACTIONABILITY:\s*(needs_improvement|poor)\*\*/i) || aiResponse.match(/ACTIONABILITY:\s*(needs_improvement|poor)/i);
          const ratingCongruenceMatch = aiResponse.match(/\*\*CONGRUENCE \(Rating vs\. Comment\):\s*(needs_improvement|poor)\*\*/i) || aiResponse.match(/CONGRUENCE \(Rating vs\. Comment\):\s*(needs_improvement|poor)/i);
          const categoryCongruenceMatch = aiResponse.match(/\*\*CONGRUENCE \(Category Consistency\):\s*(questionable|poor)\*\*/i) || aiResponse.match(/CONGRUENCE \(Category Consistency\):\s*(questionable|poor)/i);

          if (specificityMatch || actionabilityMatch || ratingCongruenceMatch || categoryCongruenceMatch ) {
              console.log(`Overriding AI quality to 'needs_improvement' due to issues in specificity, actionability, or congruence.`);
              determinedQuality = 'needs_improvement';
          }
      }

      // Check for outright refusal
      if (determinedQuality !== 'poor') {
          const lowerResponse = aiResponse.toLowerCase();
          if (lowerResponse.includes('cannot provide') ||
              lowerResponse.includes('cannot analyze') ||
              lowerResponse.includes('cannot review') ||
              lowerResponse.includes('cannot evaluate') ||
              lowerResponse.includes('i cannot') ||
              lowerResponse.includes('unable to') ||
              lowerResponse.includes('would not be appropriate')) {
            console.log('AI refused to analyze feedback - treating as poor quality');
            determinedQuality = 'poor';
          }
      }


      console.log(`Final determined quality: ${determinedQuality}`);
      return determinedQuality;
  }
  
  // Extract suggestions from AI response - (No changes needed here, logic seems robust enough)
  extractSuggestionsFromAIResponse(aiResponse) {
     const suggestions = [];

    // Enhanced Regex to find Recommendations section more reliably
    const recSectionMatch = aiResponse.match(/recommendations?:?\s*([\s\S]*?)(?=\n\n\*\*?question-specific feedback|\n\n\*\*?\w+|\n\n$)/i);
    const sectionToSearch = recSectionMatch ? recSectionMatch[1] : aiResponse; // Search within section or whole response

    // Regex to find numbered or bulleted list items
    const bulletRegex = /^\s*(?:[\*\-\•]|\d+\.?)\s+(.+)/gm; // Matches lines starting with bullets or numbers
    let match;

    while ((match = bulletRegex.exec(sectionToSearch)) !== null) {
        if (match[1]) {
            let suggestion = match[1].trim()
                .replace(/\*\*/g, '') // Remove markdown bold
                .replace(/\[|\]/g, ''); // Remove potential leftover brackets

            // Basic filtering for meaningful suggestions
            if (suggestion.length > 15 && suggestion.split(' ').length > 3) {
                 // Capitalize first letter
                 suggestion = suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
                 suggestions.push(suggestion);
            }
        }
    }

    // Fallback if no structured suggestions found
    if (suggestions.length === 0) {
        const fallbackPatterns = [
            /consider\s+(.*?)\./gi,
            /suggest\s+(.*?)\./gi,
            /recommend\s+(.*?)\./gi,
            /improve by\s+(.*?)\./gi,
            /needs to\s+(.*?)\./gi,
            /should focus on\s+(.*?)\./gi
        ];

        for (const pattern of fallbackPatterns) {
            const fallbackMatches = aiResponse.matchAll(pattern);
            for (const fm of fallbackMatches) {
                if (fm[1] && fm[1].trim().length > 15) {
                    let cleanSuggestion = fm[1].trim().replace(/\*\*/g, '');
                    cleanSuggestion = cleanSuggestion.charAt(0).toUpperCase() + cleanSuggestion.slice(1);
                    if (!suggestions.includes(cleanSuggestion)) { // Avoid duplicates
                        suggestions.push(cleanSuggestion);
                    }
                }
            }
            if (suggestions.length >= 2) break; // Stop if we have enough fallbacks
        }
    }

    // Final fallback based on quality if still no suggestions
    if (suggestions.length === 0) {
        const quality = this.extractQualityFromAIResponse(aiResponse); // Re-assess quality if needed
        if (quality === 'poor') {
            suggestions.push('Revise feedback to be constructive and professional, avoiding harsh language.');
            suggestions.push('Focus on specific behaviors and provide actionable suggestions.');
        } else if (quality === 'needs_improvement') {
            suggestions.push('Provide specific examples to support your ratings and comments.');
            suggestions.push('Ensure feedback is balanced, including both strengths and areas for development.');
        } else {
            // Even for 'good' feedback, a reminder can be useful
             suggestions.push('Continue providing specific, balanced, and actionable feedback.');
        }
    }

    // Limit to max 3 suggestions
    return suggestions.slice(0, 3);
  }


  /**
   * Extract question-specific feedback from AI response
   */
  extractQuestionFeedbackFromAIResponse(aiResponse, responses) {
    const questionFeedback = {};
    const aiProvidedFeedbackFor = new Set(); // Track questions AI already commented on

    console.log("Starting robust AI Question-Specific Feedback extraction (v3)...");

    // --- Step 1: Parse AI's Explicit Question-Specific Feedback using Block Matching ---

    // Simplified Regex: Find the section and capture everything after it until the end (or maybe until next known major header)
    // We will capture everything from "QUESTION-SPECIFIC FEEDBACK" onwards for now.
    const questionFeedbackSectionMatch = aiResponse.match(/QUESTION-SPECIFIC FEEDBACK([\s\S]*)/i); // Capture everything after the header

    if (questionFeedbackSectionMatch && questionFeedbackSectionMatch[1]) {
      // IMPORTANT: We might capture too much here (like subsequent log lines if they exist in aiResponse).
      // We rely on the block splitting logic below to only process relevant parts.
      const feedbackSectionText = questionFeedbackSectionMatch[1].trim();

      // Split the section into potential blocks based on "Question X" patterns
      // This regex looks for "Question" followed by number(s) and potentially "and" at the START of a line (using \n or ^)
      const feedbackBlocks = feedbackSectionText.split(/\s+(?=Question\s+\d+(?:\s+and\s+\d+)*:?)/i);

      console.log(`Found ${feedbackBlocks.length} potential feedback blocks after splitting.`);

      feedbackBlocks.forEach((block, index) => {
        const currentBlock = block.trim(); // Trim whitespace for clean processing
        if (!currentBlock) {
             console.log(`Block ${index + 1} is empty, skipping.`);
             return;
        }
        console.log(`Processing Block ${index + 1}: ${currentBlock.substring(0, 100)}...`);

        // Extract question numbers mentioned at the start of the block
        // Ensure it matches the absolute beginning of the processed block string
        const questionNumberMatch = currentBlock.match(/^Question\s+(\d+(?:\s+and\s+\d+)*):?/i);
        if (!questionNumberMatch || !questionNumberMatch[1]) {
           console.log(`Block ${index + 1} does not start with expected 'Question X:' pattern.`);
           return; // Skip block if it doesn't start as expected
        }

        const numbersStr = questionNumberMatch[1]; // e.g., "1", "4", "2 and 3"
        // Get the text AFTER the "Question X:" prefix in the current block
        const feedbackTextRaw = currentBlock.substring(questionNumberMatch[0].length).trim();

        // Extract the actual feedback (might be after question text)
        const lines = feedbackTextRaw.split('\n').map(l => l.trim()).filter(l => l);
        let feedbackText = feedbackTextRaw; // Default

        if (lines.length > 1) {
            const firstLineLower = lines[0].toLowerCase();
            // Check if first line looks like a known question
             const matchedQuestion = responses.find(resp => {
                 if (!resp.questionText) return false;
                 const respTextLower = resp.questionText.toLowerCase();
                 // More robust check: Does the first line contain multiple keywords from the question?
                 const questionWords = respTextLower.split(/\s+/).filter(w => w.length > 3); // Get significant words
                 const lineWords = firstLineLower.split(/\s+/);
                 const commonWords = questionWords.filter(qw => lineWords.includes(qw));
                 // Heuristic: If >50% of significant question words are in the first line, assume it's the question text
                 return questionWords.length > 0 && (commonWords.length / questionWords.length > 0.5);
             });

            if (matchedQuestion) {
                feedbackText = lines.slice(1).join('\n').trim();
                console.log(`Block ${index + 1}: Identified first line as question text, taking feedback from line 2 onwards.`);
            } else {
                 feedbackText = lines.join('\n').trim();
                 console.log(`Block ${index + 1}: Assuming all lines are feedback text.`);
            }
        } else if (lines.length === 1) {
            // If only one line, it's likely the feedback itself
            feedbackText = lines[0];
        } else {
             console.log(`Block ${index + 1}: No text content found after 'Question X:'.`);
             feedbackText = ''; // Set to empty if no lines
        }


        if (!feedbackText || feedbackText.length < 10) {
            console.log(`Block ${index + 1}: No meaningful feedback text found after filtering (Text: "${feedbackText}").`);
            return; // Skip if no actual feedback content
        }

        // Get all numbers mentioned (e.g., "1", "4", "2", "3")
        const questionNumbers = numbersStr.match(/\d+/g).map(Number);

        questionNumbers.forEach(qNum => {
          if (qNum > 0 && qNum <= responses.length) {
            const targetQuestion = responses[qNum - 1]; // Map number to question object
            if (targetQuestion && targetQuestion.questionId) {
              const questionId = targetQuestion.questionId;
              const cleanFeedback = feedbackText.replace(/\*\*/g, ''); // Clean markdown
              // Append feedback if multiple blocks target the same question (less likely with new split)
              questionFeedback[questionId] = (questionFeedback[questionId] ? questionFeedback[questionId] + "\n" : "") + (cleanFeedback.charAt(0).toUpperCase() + cleanFeedback.slice(1));
              aiProvidedFeedbackFor.add(questionId); // Mark as processed
              console.log(`AI Feedback extracted for Q${qNum} (ID: ${questionId}): "${questionFeedback[questionId].substring(0,50)}..."`);
            } else {
               console.log(`Warning: Could not find valid question object for Q${qNum}`);
            }
          } else {
             console.log(`Warning: Invalid question number ${qNum} encountered.`);
          }
        });
      });

    } else {
        console.log("No 'QUESTION-SPECIFIC FEEDBACK' header found in AI response.");
    }
    // --- END Step 1 ---

    console.log(`AI provided specific feedback for question IDs: [${[...aiProvidedFeedbackFor].join(', ')}]`);


    // --- Step 2: Augment with Local Checks ONLY if AI didn't already provide feedback ---
    console.log("Starting local augmentation checks...");
    responses.forEach((response, index) => {
      if (!response.questionId) return;
      const questionId = response.questionId;

      // A. Check for high/low ratings lacking justification (only if AI didn't mention this question)
      if (response.questionType === 'rating' && (response.rating >= 4 || response.rating <= 2)) {
          if (aiProvidedFeedbackFor.has(questionId)) {
             console.log(`Skipping local rating check for ${questionId} - AI already provided feedback.`);
          }

          let associatedCommentText = '';
          let associatedCommentQuestionId = null;
          const openEndedInCategory = responses.filter(r => r.questionId !== questionId && r.questionType === 'open_ended' && r.category === response.category && r.text);
          openEndedInCategory.forEach(r => {
              associatedCommentText += (r.text || '') + ' ';
              if(aiProvidedFeedbackFor.has(r.questionId)) { associatedCommentQuestionId = r.questionId; }
          });
          const nextQuestion = responses[index + 1];
          if (nextQuestion && nextQuestion.questionType === 'open_ended' && nextQuestion.text && nextQuestion.category === response.category) {
              if (!openEndedInCategory.find(r => r.questionId === nextQuestion.questionId)){
                  associatedCommentText += (nextQuestion.text || '') + ' ';
                  if(aiProvidedFeedbackFor.has(nextQuestion.questionId)) { associatedCommentQuestionId = nextQuestion.questionId; }
              }
          }

           if (associatedCommentQuestionId) {
               console.log(`Skipping local rating check for ${questionId} - Justified by AI feedback on associated question ${associatedCommentQuestionId}.`);
           }

          const commentWordCount = associatedCommentText.trim().split(/\s+/).filter(Boolean).length;
          if (commentWordCount < 5) {
              const ratingType = response.rating >= 4 ? 'High' : 'Low';
              const message = `${ratingType} rating (${response.rating}/5) should be supported by specific examples or comments.`;
              if (!questionFeedback[questionId]) {
                questionFeedback[questionId] = message;
                console.log(`Local check added: '${message}' to rating question ${questionId}`);
           } else {
               // Log why we are not adding the local check message again
               if (aiProvidedFeedbackFor.has(questionId)) {
                    console.log(`Local rating check message NOT added for ${questionId} - AI already provided specific feedback.`);
               } else {
                    console.log(`Local rating check message NOT added for ${questionId} - Message already exists (likely from a previous local check iteration, though this shouldn't happen often). Existing: ${questionFeedback[questionId]}`);
               }
           }
          }
      }

      // B. Check for very short open-ended answers (only if AI didn't mention this question)
      if (response.questionType === 'open_ended' && response.text) {
           if (aiProvidedFeedbackFor.has(questionId)) {
               console.log(`Skipping local brevity check for ${questionId} - AI already provided feedback.`);
               return;
           }
          const wordCount = response.text.trim().split(/\s+/).filter(Boolean).length;
          if (wordCount > 0 && wordCount < 5) {
              const message = 'This response is very brief. Consider adding more detail.';
               if (!questionFeedback[questionId]) {
                   questionFeedback[questionId] = message;
                   console.log(`Local check added: '${message}' to open-ended question ${questionId}`);
               } else {
                    console.log(`Local check skipped for ${questionId} - feedback already exists: ${questionFeedback[questionId]}`);
               }
          }
      }
    });
     // --- END Step 2 ---

    console.log("Final Question Feedback Object:", JSON.stringify(questionFeedback, null, 2));
    return questionFeedback;
  }


  // Generate a message based on extracted quality - MODIFIED
  generateMessageFromQuality(quality, aiContent = '') {
    switch (quality) {
      case 'poor':
        // Check for refusal
        const refused = /cannot provide|cannot analyze|cannot review|cannot evaluate|i cannot|unable to|would not be appropriate/i.test(aiContent);
        if (refused) { return 'The AI assistant could not process the feedback due to potentially inappropriate content. Please revise.'; }
        // Check for offensive language
        const offensive = /offensive|inappropriate|unprofessional|derogatory/i.test(aiContent);
        if (offensive) { return 'Your feedback contains language flagged as unprofessional or inappropriate. Please revise for respect and constructiveness.'; }
        // Check for major congruence issues if explicitly mentioned
        const majorMismatch = /Significant mismatch detected/i.test(aiContent);
        if (majorMismatch) { return 'Your feedback needs significant revision. There seems to be a major inconsistency between ratings and comments. Please review suggestions.'; }
        return 'Your feedback needs significant revision. Please review the suggestions for improvement.';
  
      case 'needs_improvement':
        // Check if downgraded due to specificity
        const specificityIssue = /SPECIFICITY:\s*(needs_improvement|poor)/i.test(aiContent) || /lack of specific|lacks specific|too general|no examples provided/i.test(aiContent);
        if (specificityIssue) { return 'Your feedback is generally okay, but lacks specific examples, especially for ratings. Please add more detail using methods like STAR.'; }
         // Check for rating/comment congruence issues
         const ratingCongruenceIssue = /CONGRUENCE \(Rating vs\. Comment\):\s*(needs_improvement|poor)/i.test(aiContent);
         if (ratingCongruenceIssue) { return 'Your feedback could be more effective. Consider if your ratings fully align with the tone and content of your comments.'; }
         // Check for category congruence issues
         const categoryCongruenceIssue = /CONGRUENCE \(Category Consistency\):\s*(questionable|poor)/i.test(aiContent);
         if (categoryCongruenceIssue) { return 'Your feedback could be more effective. The AI noticed potentially inconsistent ratings within related categories. Please review the specific suggestions.'; }
        return 'Your feedback could be more effective. Please review the suggestions for improvement.';
  
      case 'good':
        return 'Your feedback looks good! It seems specific, balanced, and actionable.'; // More positive reinforcement
      default:
        return 'Thank you for your feedback.';
    }
  }


  // Format feedback in a simplified format for AI analysis - (No changes needed)
  formatFeedbackForAI(responses, assessorType) {
    let result = `Assessor Type: ${assessorType}\n\n`;
  
    // Map questions to their original index/number for consistent referencing
    const questionNumberMap = {};
    responses.forEach((r, index) => {
        if (r.questionId) {
            questionNumberMap[r.questionId] = index + 1;
        }
    });
  
    // Group by category first for better context
    const responsesByCategory = responses.reduce((acc, response) => {
        const category = response.category || 'General'; // Default category if none provided
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(response);
        return acc;
    }, {});
  
    result += "FEEDBACK DETAILS:\n";
  
    for (const category in responsesByCategory) {
        result += `\n--- Category: ${category} ---\n`;
        const categoryResponses = responsesByCategory[category];
  
        categoryResponses.forEach(response => {
            const qNum = questionNumberMap[response.questionId] || '?';
            result += `Question ${qNum}: ${response.questionText}\n`;
            if (response.questionType === 'rating') {
                result += `  Rating: ${response.rating || 'Not provided'}/5\n`;
            }
            if (response.questionType === 'open_ended') {
                 // Ensure response.text is treated as a string, even if null/undefined
                 const responseText = typeof response.text === 'string' ? response.text : '';
                result += `  Response: "${responseText || 'Not provided'}"\n`;
            }
        });
    }
  
    return result;
  }


  /**
   * Analyze feedback for various quality factors (comprehensive analysis)
   */
   // Enhanced analyzeFeedback with more refined checks
   analyzeFeedback(responses) {
    const analysis = {
        hasOffensiveLanguage: false,
        offensivePhrases: [],
        nonConstructivePhrases: [],
        incompleteResponses: [],
        shortResponses: [], // Responses deemed too brief (e.g., < 5 words)
        longResponses: [], // Responses deemed too long (e.g., > 250 words)
        noExamples: [], // Open-ended responses lacking example keywords
        highRatingNoComment: [], // High ratings (4/5) without sufficient comment justification
        lowRatingNoComment: [], // Low ratings (1/2) without sufficient comment justification
        tooSpecific: [], // Responses possibly containing confidential info
        feedbackBalance: {
            positive: 0,
            negative: 0,
            neutral: 0,
            tooPositive: false, // Mostly positive comments
            tooNegative: false // Mostly negative comments
        },
        totalResponseCount: 0,
        totalOpenEndedCount: 0,
        totalRatingCount: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } // Track rating counts
    };

    // Expanded lists for detection
    const offensiveTerms = [
        'moron', 'idiot', 'stupid', 'incompetent', 'useless', 'hopeless', 'clueless', 'fool',
        'terrible', 'awful', 'worst', 'disaster', 'mess', 'worthless', 'joke', 'waste', 'pathetic',
        // Added potentially offensive/unprofessional terms
        'lazy', 'arrogant', 'dishonest', 'untrustworthy', 'backstabber', 'gossip', 'suck up'
    ];
    const nonConstructivePatterns = [
        'change company', 'quit', 'resign', 'find another job', 'give up', 'fire', 'fired',
        'not suited', 'wrong profession', 'wrong job', 'not cut out', 'leave the company',
        'should be let go', 'get out', 'move on', 'leave the team', 'not a good fit',
        // Added more subtle non-constructive phrases
        'no future here', 'better off elsewhere', 'pointless', 'beyond help'
    ];
    const positiveTerms = ['good', 'great', 'excellent', 'outstanding', 'impressive', 'fantastic', 'amazing', 'superb', 'exceptional', 'perfect', 'strength', 'brilliant', 'valuable', 'asset', 'leader', 'initiative', 'reliable', 'consistent', 'proactive'];
    const negativeTerms = ['bad', 'poor', 'weak', 'inadequate', 'disappointing', 'terrible', 'horrible', 'awful', 'fails', 'struggling', 'needs work', 'insufficient', 'concern', 'issue', 'problem', 'lack', 'missed', 'late', 'slow', 'unclear', 'confusing'];
    const specificityFlags = ['confidential', 'secret', 'private', 'told me privately', 'HR issue', 'salary', 'personal problem', 'medical condition'];
    const exampleKeywords = ['example', 'instance', 'such as', 'e.g.', 'demonstrated', 'showed', 'when', 'scenario', 'situation'];

    let totalRatings = 0;
    let sumRatings = 0;

    // First pass: Analyze individual responses
    responses.forEach(response => {
        analysis.totalResponseCount++;
        const questionId = response.questionId;
        if (!questionId) return; // Skip if no question ID

        // Track response type counts and ratings
        if (response.questionType === 'rating') {
            analysis.totalRatingCount++;
            const rating = parseInt(response.rating);
            if (!isNaN(rating) && rating >= 1 && rating <= 5) {
                totalRatings++;
                sumRatings += rating;
                analysis.ratingDistribution[rating]++;
            } else if (response.required) {
                 analysis.incompleteResponses.push(questionId);
            }
        } else if (response.questionType === 'open_ended') {
            analysis.totalOpenEndedCount++;
            const text = (response.text || '').trim();
            const lowerText = text.toLowerCase();

            if (!text && response.required) {
                analysis.incompleteResponses.push(questionId);
                return; // Skip further analysis for empty required responses
            }
            if (!text) {
                return; // Skip further analysis for empty optional responses
            }

            const wordCount = text.split(/\s+/).filter(Boolean).length;

            // Check length
            if (wordCount < 5) analysis.shortResponses.push(questionId);
            if (wordCount > 250) analysis.longResponses.push(questionId); // Increased threshold slightly

            // Check offensive language
            offensiveTerms.forEach(term => {
                const regex = new RegExp(`\\b${term}\\b`, 'i');
                if (regex.test(lowerText)) {
                    analysis.hasOffensiveLanguage = true;
                    analysis.offensivePhrases.push({ questionId, phrase: term });
                }
            });

            // Check non-constructive patterns
            nonConstructivePatterns.forEach(pattern => {
                 const regex = new RegExp(`\\b${pattern}\\b`, 'i');
                if (regex.test(lowerText)) {
                    analysis.nonConstructivePhrases.push({ questionId, phrase: pattern });
                }
            });

            // Check for examples
            const hasExamples = exampleKeywords.some(keyword => lowerText.includes(keyword));
            if (!hasExamples && wordCount > 15) { // Flag if reasonably long but no example keywords
                analysis.noExamples.push(questionId);
            }

            // Check for potentially confidential info
            specificityFlags.forEach(flag => {
                if (lowerText.includes(flag)) {
                    if (!analysis.tooSpecific.find(item => item.questionId === questionId)) {
                        analysis.tooSpecific.push({ questionId, phrase: flag });
                    }
                }
            });

            // Basic sentiment analysis
            let positiveScore = 0;
            let negativeScore = 0;
            positiveTerms.forEach(term => { if (lowerText.includes(term)) positiveScore++; });
            negativeTerms.forEach(term => { if (lowerText.includes(term)) negativeScore++; });

            if (positiveScore > negativeScore * 1.5) analysis.feedbackBalance.positive++;
            else if (negativeScore > positiveScore * 1.5) analysis.feedbackBalance.negative++;
            else analysis.feedbackBalance.neutral++;
        }
    });

     // Second pass: Analyze relationships between ratings and comments
     responses.forEach((response, index) => {
         const questionId = response.questionId;
         if (response.questionType === 'rating') {
             const rating = parseInt(response.rating);
             if (rating === 4 || rating === 5 || rating === 1 || rating === 2) {
                 // Find related open-ended comments (e.g., next question or same category)
                 let relatedCommentText = '';
                 const nextQuestion = responses[index + 1];
                 if (nextQuestion && nextQuestion.questionType === 'open_ended' && nextQuestion.text) {
                      // Check if next question seems related (e.g., same category or generic improvement question)
                     if (nextQuestion.category === response.category || /improve|develop|suggestion|comment/i.test(nextQuestion.questionText || '')) {
                         relatedCommentText += (nextQuestion.text || '') + ' ';
                     }
                 }
                 // Look for general comment questions
                 responses.forEach(r => {
                     if (r.questionType === 'open_ended' && /overall|additional comment|summary|final thoughts/i.test(r.questionText || '') && r.text) {
                         relatedCommentText += (r.text || '') + ' ';
                     }
                 });

                 const commentWordCount = relatedCommentText.trim().split(/\s+/).filter(Boolean).length;

                 if (commentWordCount < 10) { // Require at least 10 words justification
                     if (rating >= 4) analysis.highRatingNoComment.push(questionId);
                     if (rating <= 2) analysis.lowRatingNoComment.push(questionId);
                 }
             }
         }
     });

    // Calculate overall metrics
    if (totalRatings > 0) {
        analysis.averageRating = sumRatings / totalRatings;
    }
    if (analysis.totalOpenEndedCount > 0) {
        const positivePercentage = (analysis.feedbackBalance.positive / analysis.totalOpenEndedCount) * 100;
        const negativePercentage = (analysis.feedbackBalance.negative / analysis.totalOpenEndedCount) * 100;
        analysis.feedbackBalance.tooPositive = positivePercentage > 80 && analysis.feedbackBalance.negative === 0; // Adjusted threshold
        analysis.feedbackBalance.tooNegative = negativePercentage > 80 && analysis.feedbackBalance.positive === 0; // Adjusted threshold
    }

    // Remove duplicates from lists like incompleteResponses etc.
    analysis.incompleteResponses = [...new Set(analysis.incompleteResponses)];
    analysis.shortResponses = [...new Set(analysis.shortResponses)];
    analysis.longResponses = [...new Set(analysis.longResponses)];
    analysis.noExamples = [...new Set(analysis.noExamples)];
    analysis.highRatingNoComment = [...new Set(analysis.highRatingNoComment)];
    analysis.lowRatingNoComment = [...new Set(analysis.lowRatingNoComment)];

    return analysis;
}


  /**
   * Fallback evaluation using comprehensive rule-based analysis - Enhanced
   */
  fallbackEvaluation(responses, assessorType) {
    console.log('Using enhanced fallback evaluation method');
    const analysisResults = this.analyzeFeedback(responses); // Use the enhanced analysis

    let quality = 'good';
    let message = 'Your feedback looks reasonable based on basic checks.'; // Default message
    const suggestions = [];
    const questionFeedback = {};
    const issues = new Set(); // Use a Set for unique issues

    // Determine Quality based on analysis
    if (analysisResults.hasOffensiveLanguage || analysisResults.nonConstructivePhrases.length > 0) {
        quality = 'poor';
        message = 'Your feedback contains potentially unprofessional or non-constructive language. Please revise.';
        if (analysisResults.hasOffensiveLanguage) issues.add('offensive_language');
        if (analysisResults.nonConstructivePhrases.length > 0) issues.add('non_constructive');
    } else if (analysisResults.incompleteResponses.length > 0) {
        quality = 'needs_improvement'; // Or 'poor' if many are incomplete? Let's start with needs_improvement
        message = 'Some required questions are unanswered. Please complete all required fields.';
        issues.add('incomplete');
    } else if (analysisResults.shortResponses.length > analysisResults.totalOpenEndedCount / 2 || // Many short answers
               analysisResults.highRatingNoComment.length > 0 || // High ratings lack comments
               analysisResults.lowRatingNoComment.length > 0 || // Low ratings lack comments
               analysisResults.noExamples.length > analysisResults.totalOpenEndedCount / 2) { // Many answers lack examples
        quality = 'needs_improvement';
        message = 'Your feedback could be more detailed and specific. Please review the suggestions.';
        if (analysisResults.shortResponses.length > 0) issues.add('too_brief');
        if (analysisResults.highRatingNoComment.length > 0) issues.add('high_rating_no_comment');
        if (analysisResults.lowRatingNoComment.length > 0) issues.add('low_rating_no_comment');
        if (analysisResults.noExamples.length > 0) issues.add('no_examples');
    } else if (analysisResults.tooSpecific.length > 0) {
        quality = 'needs_improvement';
        message = 'Some responses might contain overly specific details. Ensure confidentiality is maintained.';
        issues.add('too_specific');
    } else if (analysisResults.feedbackBalance.tooPositive || analysisResults.feedbackBalance.tooNegative) {
        quality = 'needs_improvement';
        message = 'The feedback seems unbalanced. Aim for a mix of strengths and areas for development.';
        if (analysisResults.feedbackBalance.tooPositive) issues.add('too_positive');
        if (analysisResults.feedbackBalance.tooNegative) issues.add('too_negative');
    } else if (analysisResults.longResponses.length > 0) {
        // Long responses are less critical, only flag if quality is otherwise good
        if (quality === 'good') {
             quality = 'needs_improvement';
             message = 'Some responses are quite long. Consider being more concise while keeping key details.';
             issues.add('too_long');
        }
    }

     // Generate Question-Specific Feedback based on analysis
    analysisResults.offensivePhrases.forEach(({ questionId }) => {
        questionFeedback[questionId] = 'This response contains potentially inappropriate language.';
    });
    analysisResults.nonConstructivePhrases.forEach(({ questionId }) => {
        questionFeedback[questionId] = 'This suggestion may not be constructive for development.';
    });
    analysisResults.incompleteResponses.forEach(questionId => {
        questionFeedback[questionId] = 'This required question needs a response.';
    });
    analysisResults.shortResponses.forEach(questionId => {
        questionFeedback[questionId] = (questionFeedback[questionId] ? questionFeedback[questionId] + ' ' : '') + 'This response is very brief. Please add more detail or examples.';
    });
     analysisResults.longResponses.forEach(questionId => {
        questionFeedback[questionId] = (questionFeedback[questionId] ? questionFeedback[questionId] + ' ' : '') + 'This response is quite long. Consider summarizing key points.';
    });
    analysisResults.noExamples.forEach(questionId => {
        questionFeedback[questionId] = (questionFeedback[questionId] ? questionFeedback[questionId] + ' ' : '') + 'Consider adding a specific example to illustrate this point.';
    });
    analysisResults.highRatingNoComment.forEach(questionId => {
        questionFeedback[questionId] = (questionFeedback[questionId] ? questionFeedback[questionId] + ' ' : '') + 'A high rating should ideally be supported by comments or examples.';
    });
     analysisResults.lowRatingNoComment.forEach(questionId => {
        questionFeedback[questionId] = (questionFeedback[questionId] ? questionFeedback[questionId] + ' ' : '') + 'A low rating should ideally be explained with specific comments or examples.';
    });
    analysisResults.tooSpecific.forEach(({ questionId }) => {
        questionFeedback[questionId] = 'This may contain overly specific or confidential details. Consider generalizing.';
    });


    // Generate General Suggestions based on identified issues
    if (issues.has('offensive_language')) suggestions.push('Replace unprofessional language with constructive, respectful feedback.');
    if (issues.has('non_constructive')) suggestions.push('Focus suggestions on actionable improvements within the current role.');
    if (issues.has('incomplete')) suggestions.push('Ensure all required questions are answered before submitting.');
    if (issues.has('too_brief')) suggestions.push('Provide more detailed responses, especially for open-ended questions.');
     if (issues.has('no_examples') || issues.has('high_rating_no_comment') || issues.has('low_rating_no_comment')) suggestions.push('Include concrete examples to illustrate your points and justify ratings.');
     if (issues.has('too_long')) suggestions.push('Aim for clear and concise responses, avoiding unnecessary length.');
    if (issues.has('too_specific')) suggestions.push('Avoid sharing confidential information; keep feedback focused on observable behaviors.');
    if (issues.has('too_positive')) suggestions.push('Balance positive feedback by also including constructive areas for growth.');
    if (issues.has('too_negative')) suggestions.push('Balance critical feedback by also acknowledging strengths and positive contributions.');


    // If no specific issues found, but quality isn't perfect, add generic advice
    if (suggestions.length === 0 && quality === 'needs_improvement') {
      suggestions.push('Review feedback for clarity, specificity, and balance.');
    }
    // If truly no issues found
     if (suggestions.length === 0 && quality === 'good') {
       message = 'Your feedback appears well-balanced and constructive based on basic checks.' // More positive default good message
       suggestions.push('Continue providing thoughtful and detailed feedback.');
     }

    return {
      quality,
      message,
      suggestions: suggestions.slice(0, 3), // Limit suggestions
      questionFeedback,
      analysisDetails: {
        ...analysisResults,
        usedAI: false // Explicitly flag that AI was not used for this result
      }
    };
  }


  // Create a test request to diagnose issues with FluxAI (No changes needed)
  async testFluxAiDirectly() {
    console.log('Testing FluxAI connection directly...');

    try {
      // Try a simple check of the API first
      const response = await axios({
        method: 'GET',
        url: `${this.fluxAiConfig.baseUrl}${this.fluxAiConfig.endpoints.llms}`,
        headers: {
          'X-API-KEY': this.fluxAiConfig.apiKey
        }
      });

      console.log('FluxAI models endpoint response:', JSON.stringify(response.data, null, 2));

      // Now test the chat endpoint with a very simple request
      const chatResponse = await axios({
        method: 'POST',
        url: `${this.fluxAiConfig.baseUrl}${this.fluxAiConfig.endpoints.chat}`,
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.fluxAiConfig.apiKey
        },
        data: {
          messages: [
            {
              role: "user",
              content: "Hello, this is a test message. Can you reply with a simple greeting?"
            }
          ],
          stream: false
        }
      });

      console.log('FluxAI chat response status:', chatResponse.status);
      console.log('FluxAI chat response data:', JSON.stringify(chatResponse.data, null, 2));

      return {
        success: true,
        llmsResponse: response.data,
        chatResponse: chatResponse.data
      };

    } catch (error) {
      console.error('Error in direct FluxAI test:', error.message);

      if (error.response) {
        console.error('API error response:', error.response.status, JSON.stringify(error.response.data, null, 2));
      }

      return {
        success: false,
        error: error.message,
        response: error.response?.data
      };
    }
  }
}

module.exports = new AiFeedbackService();