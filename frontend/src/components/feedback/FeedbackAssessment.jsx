import React, { useState } from 'react';
import api from '../../services/api';
import { formatAiFeedback } from '../../utils/formatAiFeedback';

const FeedbackAssessment = ({ 
  campaignId, 
  assessorToken, 
  questions, 
  targetEmployee,
  assessorType
}) => {
  const [responses, setResponses] = useState({});
  const [ratings, setRatings] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiChecking, setAiChecking] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [formattedFeedback, setFormattedFeedback] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [bypassWarningOpen, setBypassWarningOpen] = useState(false);

  // Handle text response changes
  const handleResponseChange = (questionId, value) => {
    setResponses({
      ...responses,
      [questionId]: value
    });
    // Clear error when user starts typing
    if (errors[questionId]) {
      setErrors({
        ...errors,
        [questionId]: null
      });
    }
    // Reset AI feedback when user makes changes
    if (aiFeedback) {
      setAiFeedback(null);
      setFormattedFeedback(null);
    }
  };

  // Handle rating changes
  const handleRatingChange = (questionId, value) => {
    setRatings({
      ...ratings,
      [questionId]: value
    });
    // Clear error when user selects rating
    if (errors[questionId]) {
      setErrors({
        ...errors,
        [questionId]: null
      });
    }
    // Reset AI feedback when user makes changes
    if (aiFeedback) {
      setAiFeedback(null);
      setFormattedFeedback(null);
    }
  };

  // Validate feedback before submitting
  const validateFeedback = () => {
    const newErrors = {};
    let isValid = true;

    questions.forEach(question => {
      if (question.required) {
        if (question.type === 'open_ended' && (!responses[question.id] || responses[question.id].trim() === '')) {
          newErrors[question.id] = 'This question requires a response';
          isValid = false;
        } else if (question.type === 'rating' && !ratings[question.id]) {
          newErrors[question.id] = 'Please select a rating';
          isValid = false;
        }
      }
    });

    // Check open-ended responses for minimum length (at least 10 characters)
    questions.filter(q => q.type === 'open_ended' && q.required).forEach(question => {
      if (responses[question.id] && responses[question.id].length < 10) {
        newErrors[question.id] = 'Please provide a more detailed response (at least 10 characters)';
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // Check feedback quality with AI
  const checkFeedbackWithAI = async () => {
    if (!validateFeedback()) {
      return;
    }

    setAiChecking(true);
    setAiFeedback(null);
    setFormattedFeedback(null);

    try {
      // Format the responses for the API
      const formattedResponses = questions.map(question => {
        return {
          questionId: question.id,
          questionText: question.text,
          questionType: question.type,
          category: question.category,
          rating: ratings[question.id] || null,
          text: responses[question.id] || ''
        };
      });

      const response = await api.post('/feedback/evaluate', {
        responses: formattedResponses,
        assessorType,
        targetEmployeeId: targetEmployee.id
      });

      // Process the AI feedback data
      setAiFeedback(response.data);
      
      // Format the AI feedback for display
      const formatted = formatAiFeedback(response.data, formattedResponses);
      setFormattedFeedback(formatted);
    } catch (error) {
      console.error('Error checking feedback with AI:', error);
      setAiFeedback({
        quality: 'error',
        message: 'An error occurred while checking your feedback. Please try again later.'
      });
      setFormattedFeedback({
        quality: 'error',
        message: 'An error occurred while checking your feedback. Please try again later.',
        suggestions: [],
        questionFeedback: {}
      });
    } finally {
      setAiChecking(false);
    }
  };

  // Submit feedback
  const submitFeedback = async (bypassAiRecommendations = false) => {
    if (!validateFeedback()) {
      window.scrollTo(0, 0);
      return;
    }

    // If AI feedback quality is not good and bypass warning is not confirmed
    if (formattedFeedback && formattedFeedback.quality !== 'good' && !bypassAiRecommendations) {
      setBypassWarningOpen(true);
      return;
    }

    setIsSubmitting(true);
    setBypassWarningOpen(false);

    try {
      // Format the responses for the API
      const formattedResponses = questions.map(question => {
        return {
          questionId: question.id,
          questionText: question.text,
          questionType: question.type,
          category: question.category,
          rating: ratings[question.id] || null,
          text: responses[question.id] || ''
        };
      });

      await api.post('/feedback/submit', {
        campaignId,
        assessorToken,
        targetEmployeeId: targetEmployee.id,
        responses: formattedResponses,
        bypassedAiRecommendations: bypassAiRecommendations,
        aiEvaluationResults: aiFeedback
      });

      setSubmitted(true);
      window.scrollTo(0, 0);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setErrors({
        ...errors,
        general: 'An error occurred while submitting your feedback. Please try again.'
      });
      window.scrollTo(0, 0);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If feedback has been submitted, show thank you message
  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
        <div className="text-center mb-6">
          <div className="bg-green-100 text-green-800 p-4 rounded-lg">
            <h2 className="text-xl font-semibold">Thank You!</h2>
            <p className="mt-2">Your feedback has been submitted successfully.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">360° Feedback Assessment</h1>
        <p className="text-gray-600 mt-1">
          Providing feedback for: <span className="font-semibold">{targetEmployee.name}</span>
          {targetEmployee.position && <span> - {targetEmployee.position}</span>}
        </p>
        <div className="bg-blue-50 text-blue-700 p-3 rounded-lg mt-4">
          <p>Your feedback will help {targetEmployee.name} understand their strengths and areas for growth. Please be specific, constructive, and balanced.</p>
        </div>
      </div>

      {/* Errors at the top */}
      {errors.general && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p>{errors.general}</p>
        </div>
      )}

      {/* AI Feedback Results */}
      {formattedFeedback && (
        <div className={`mb-6 p-4 rounded-lg ${
          formattedFeedback.quality === 'good' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : formattedFeedback.quality === 'needs_improvement' 
              ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
              : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <h3 className="font-semibold mb-2">
            AI Assistant Feedback {formattedFeedback.quality === 'good' && '✓'}
          </h3>
          <p>{formattedFeedback.message}</p>

          {formattedFeedback.suggestions && formattedFeedback.suggestions.length > 0 && (
            <div className="mt-3">
              <p className="font-medium">Suggestions for improvement:</p>
              <ul className="list-disc ml-5 mt-1">
                {formattedFeedback.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {formattedFeedback.quality !== 'good' && (
            <div className="mt-3">
              <p className="font-medium">Specific feedback on responses:</p>
              <div className="mt-2 bg-white bg-opacity-50 rounded-md p-3">
                {Object.keys(formattedFeedback.questionFeedback).length > 0 ? (
                  questions.map((question, index) => {
                    const feedback = formattedFeedback.questionFeedback[question.id];
                    if (!feedback) return null;
                    
                    return (
                      <div key={question.id} className="mb-3 last:mb-0">
                        <p className="font-medium">Question {index + 1}:</p>
                        <p className="text-sm italic mb-1">"{question.text}"</p>
                        <p className="text-sm bg-yellow-50 p-2 rounded">{feedback}</p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm italic">Your feedback contains general issues. Please review and apply the suggestions above.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress Bar - based on filled in required questions */}
      <div className="mb-8">
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-500"
            style={{ 
              width: `${calculateProgress()}%` 
            }}
          ></div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-8">
        {questions.map((question, index) => (
          <div key={question.id} className={`p-6 border rounded-lg ${
            errors[question.id] 
              ? 'border-red-300 bg-red-50' 
              : formattedFeedback?.questionFeedback?.[question.id]
                ? 'border-yellow-300 bg-yellow-50'
                : 'border-gray-200'
          }`}>
            <h3 className="text-lg font-medium">{question.text}</h3>
            
            {/* Category Tag */}
            <div className="mt-1 mb-3">
              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {question.category}
              </span>
            </div>
            
            {/* Rating Input */}
            {question.type === 'rating' && (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Poor</span>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleRatingChange(question.id, value)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors
                          ${
                            ratings[question.id] === value
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">Excellent</span>
                </div>
              </div>
            )}
            
            {/* Text Input */}
            {question.type === 'open_ended' && (
              <div className="mt-4">
                <textarea
                  rows="4"
                  className={`w-full p-3 border ${
                    errors[question.id] 
                      ? 'border-red-300' 
                      : formattedFeedback?.questionFeedback?.[question.id]
                        ? 'border-yellow-300'
                        : 'border-gray-300'
                  } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="Provide specific examples and constructive feedback"
                  value={responses[question.id] || ''}
                  onChange={(e) => handleResponseChange(question.id, e.target.value)}
                ></textarea>
                {responses[question.id] && (
                  <div className="text-xs text-gray-500 mt-1">
                    Character count: {responses[question.id].length}
                  </div>
                )}
              </div>
            )}
            
            {/* Error Message */}
            {errors[question.id] && (
              <p className="mt-2 text-sm text-red-600">{errors[question.id]}</p>
            )}
            
            {/* AI Feedback on this question */}
            {formattedFeedback?.questionFeedback?.[question.id] && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">AI Suggestion:</span> {formattedFeedback.questionFeedback[question.id]}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Review and Submit Section */}
      <div className="mt-10 border-t border-gray-200 pt-6">
        <h2 className="text-xl font-bold mb-4">Review Your Feedback</h2>
        
        {/* Initially show only AI Check button */}
        {!formattedFeedback ? (
          <button
            type="button"
            onClick={checkFeedbackWithAI}
            disabled={aiChecking}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors flex items-center justify-center"
          >
            {aiChecking ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Checking with AI...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                </svg>
                Check My Feedback with AI Assistant
              </>
            )}
          </button>
        ) : (
          // After AI check, show appropriate buttons based on feedback quality
          <div className="space-y-4">
            {/* For good feedback quality, show submit button */}
            {formattedFeedback.quality === 'good' ? (
              <button
                type="button"
                onClick={() => submitFeedback(false)}
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md shadow-sm transition-colors flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Submit Feedback
                  </>
                )}
              </button>
            ) : (
              // For needs improvement or poor feedback, show revision options
              <>
                <button
                  type="button"
                  onClick={checkFeedbackWithAI}
                  disabled={aiChecking}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors flex items-center justify-center"
                >
                  {aiChecking ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Checking with AI...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                      </svg>
                      Check Again After Making Changes
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setBypassWarningOpen(true)}
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-md shadow-sm transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                  Submit Anyway
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bypass Warning Modal */}
      {bypassWarningOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="mb-4">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <h3 className="text-lg font-semibold">Submit Anyway?</h3>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                Our AI assistant has flagged potential issues with your feedback. Are you sure you want to submit it as is?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-md text-sm">
                <p><strong>Important:</strong> If you proceed, the AI's concerns about your feedback will be shared with HR/administrators (not with {targetEmployee.name}).</p>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setBypassWarningOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors"
              >
                Go Back & Revise
              </button>
              <button
                type="button"
                onClick={() => submitFeedback(true)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Anyway'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper function to calculate progress
  function calculateProgress() {
    const totalRequired = questions.filter(q => q.required).length;
    
    if (totalRequired === 0) return 100;
    
    let completed = 0;
    
    questions.forEach(question => {
      if (!question.required) return;
      
      if (question.type === 'rating' && ratings[question.id]) {
        completed++;
      } else if (question.type === 'open_ended' && responses[question.id] && responses[question.id].trim() !== '') {
        completed++;
      }
    });
    
    return Math.round((completed / totalRequired) * 100);
  }
};

export default FeedbackAssessment;