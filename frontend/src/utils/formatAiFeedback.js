// frontend/src/utils/formatAiFeedback.js

/**
 * Formats the potentially complex AI Coach analysis for display in the UI.
 * This version focuses on populating questionFeedback for inconsistencies.
 * @param {Object} aiAnalysis - Raw analysis result from the backend evaluateFeedback endpoint.
 * @param {Array} responses - User's current feedback responses (with question details).
 * @returns {Object} - Formatted data structure for the FeedbackAssessment component.
 */
export const formatAiFeedback = (aiAnalysis, responses) => {
  if (!aiAnalysis) return null;

  // Default structure
  const formatted = {
      quality: 'good',
      message: 'Feedback evaluated.',
      suggestions: [],
      // We might not need observations anymore if we push everything relevant to questionFeedback
      observations: {
           ratingCommentCongruence: null, // Still useful to know the overall flag
           categoryConsistency: null,   // Still useful to know the overall flag
           // other observations can remain if needed for other UI elements
      },
      questionFeedback: {}, // Initialize with potentially existing AI feedback
      rawAnalysis: aiAnalysis.analysisDetails?.aiResponse || '',
      isFallback: !aiAnalysis.analysisDetails?.usedAI
  };

  // Overwrite defaults with data from aiAnalysis
  formatted.quality = aiAnalysis.quality || formatted.quality;
  formatted.message = aiAnalysis.message || formatted.message;
  formatted.suggestions = aiAnalysis.suggestions || formatted.suggestions;
  // IMPORTANT: Initialize questionFeedback with what the AI *already* provided
  formatted.questionFeedback = aiAnalysis.questionFeedback || {};

  // --- Parse the OVERALL ASSESSMENT section for Congruence Flags ---
  let ratingCongruenceIssue = null;
  let ratingCongruenceDetail = null;
  let categoryConsistencyIssue = null;
  let categoryConsistencyDetail = null;

  if (formatted.rawAnalysis) {
      const assessmentSectionMatch = formatted.rawAnalysis.match(/OVERALL ASSESSMENT([\s\S]*?)(?=\n\n\*\*?SUMMARY|\n\n\*\*?RECOMMENDATIONS|\n\n$)/i);

      if (assessmentSectionMatch && assessmentSectionMatch[1]) {
          const assessmentLines = assessmentSectionMatch[1].trim().split('\n');

          assessmentLines.forEach(line => {
              const cleanLine = line.trim();
              if (!cleanLine) return;

              // Try matching Congruence (Rating vs. Comment)
              const matchRatingCongruence = cleanLine.match(/^CONGRUENCE \(Rating vs\. Comment\):\s*(good|needs_improvement|poor)\s*-\s*(.*)/i);
              if (matchRatingCongruence) {
                  ratingCongruenceIssue = matchRatingCongruence[1].toLowerCase();
                  ratingCongruenceDetail = matchRatingCongruence[2].trim();
                  formatted.observations.ratingCommentCongruence = ratingCongruenceIssue; // Store overall flag
                  return;
              }

              // Try matching Congruence (Category Consistency)
              const matchCategoryCongruence = cleanLine.match(/^CONGRUENCE \(Category Consistency\):\s*(good|questionable|poor)\s*-\s*(.*)/i);
              if (matchCategoryCongruence) {
                  categoryConsistencyIssue = matchCategoryCongruence[1].toLowerCase();
                  categoryConsistencyDetail = matchCategoryCongruence[2].trim();
                  formatted.observations.categoryConsistency = categoryConsistencyIssue; // Store overall flag
                  return;
              }
          });
      }
  }
  // --- END Parsing Logic ---


  // --- Add Congruence Issues to Question Feedback if detected ---

  // 1. Handle Rating/Comment Inconsistency
  if (ratingCongruenceIssue && ratingCongruenceIssue !== 'good' && ratingCongruenceDetail) {
      // Try to add this feedback to relevant questions (e.g., all rating questions or all open-ended questions)
      // Add to suggestion list as well for general visibility
      formatted.suggestions.push(`Rating/Comment Inconsistency: ${ratingCongruenceDetail}`);

      // Add note to open-ended questions if comments seem mismatched
      responses.forEach(response => {
          if (response.questionType === 'open_ended' && response.text) {
               const qId = response.questionId;
               if (qId && !formatted.questionFeedback[qId]?.includes('align with ratings')) { // Avoid duplicate messages
                  formatted.questionFeedback[qId] = `${formatted.questionFeedback[qId] || ''} Consider if this comment aligns with the overall ratings provided. ${ratingCongruenceDetail}`.trim();
               }
          }
          // Add note to rating questions if they lack comments or seem mismatched
          if (response.questionType === 'rating' && response.rating) {
               const qId = response.questionId;
               // Check if it lacks justification per the detail message
               const lacksJustification = /lack|missing|no example|unsupported/i.test(ratingCongruenceDetail);
               if (lacksJustification && qId && !formatted.questionFeedback[qId]?.includes('justified by comments')) {
                   formatted.questionFeedback[qId] = `${formatted.questionFeedback[qId] || ''} Ensure rating is justified by specific comments/examples. ${ratingCongruenceDetail}`.trim();
               }
          }
      });
  }

  // 2. Handle Category Consistency Issue
  if (categoryConsistencyIssue && categoryConsistencyIssue !== 'good' && categoryConsistencyDetail) {
      // Add to main suggestions
       formatted.suggestions.push(`Category Consistency: ${categoryConsistencyDetail}`);

      // Try to find the category mentioned in the detail, if any
      const categoryMatch = categoryConsistencyDetail.match(/category ['"]?(.*?)['"]?/i);
      const mentionedCategory = categoryMatch ? categoryMatch[1] : null;

      // Add note to questions in the mentioned category, or all questions if category not specified
      responses.forEach(response => {
          const qId = response.questionId;
          if (!qId) return;

          const belongsToMentionedCategory = mentionedCategory && response.category && response.category.toLowerCase() === mentionedCategory.toLowerCase();

          if (mentionedCategory && belongsToMentionedCategory) {
               // Add specific note to questions in the flagged category
               if (!formatted.questionFeedback[qId]?.includes('Review consistency')) {
                  formatted.questionFeedback[qId] = `${formatted.questionFeedback[qId] || ''} Review consistency of ratings within the '${response.category}' category. ${categoryConsistencyDetail}`.trim();
               }
          } else if (!mentionedCategory) {
               // If no category was specified in the detail, add a more generic note to all questions
               // (This might be too noisy, consider skipping this else block)
               // if (!formatted.questionFeedback[qId]?.includes('Review consistency')) {
               //    formatted.questionFeedback[qId] = `${formatted.questionFeedback[qId] || ''} Review consistency of ratings across related questions.`.trim();
               // }
          }
      });
  }
  // --- END Adding Congruence Issues ---


  // Ensure suggestions are reasonable
  if (!formatted.isFallback && formatted.suggestions.length === 0 && formatted.quality !== 'good') {
      formatted.suggestions.push("Review feedback for specificity, balance, and actionability.");
  }
  // Remove duplicates and filter short suggestions
  formatted.suggestions = [...new Set(formatted.suggestions)].filter(s => s && s.length > 10);

  return formatted;
};

// Keep the detectRatingTextMismatch function if it's still used elsewhere or as a potential future check.
// It wasn't explicitly used in the formatting logic above, as we now rely more on the AI/backend for congruence checks.
/**
 * Detects mismatches between ratings and text feedback sentiment (Optional Helper)
 * @param {Array} responses - User's feedback responses
 * @returns {Boolean} - Whether a mismatch was detected
 */
const detectRatingTextMismatch = (responses) => {
    const ratingResponses = responses.filter(r => r.questionType === 'rating' && r.rating);
    const textResponses = responses.filter(r => r.questionType === 'open_ended' && r.text);
    if (ratingResponses.length === 0 || textResponses.length === 0) return false;
    const avgRating = ratingResponses.reduce((sum, r) => sum + (parseInt(r.rating) || 3), 0) / ratingResponses.length;
    const positiveTerms = ['excellent', 'outstanding', 'amazing', 'great', 'perfect', 'rockstar', 'superb', 'fantastic', 'incredible', 'exceptional', 'all strengths'];
    const negativeTerms = ['poor', 'terrible', 'awful', 'horrible', 'bad', 'weak', 'needs significant', 'struggling', 'fails', 'inadequate'];
    let positiveTextCount = 0; let negativeTextCount = 0;
    textResponses.forEach(response => { const text = response.text.toLowerCase(); positiveTerms.forEach(term => { if (text.includes(term)) positiveTextCount++; }); negativeTerms.forEach(term => { if (text.includes(term)) negativeTextCount++; }); });
    const isVeryPositiveText = positiveTextCount > 1 && negativeTextCount === 0;
    const isVeryNegativeText = negativeTextCount > 1 && positiveTextCount === 0;
    return (avgRating <= 2 && isVeryPositiveText) || (avgRating >= 4.5 && isVeryNegativeText);
};