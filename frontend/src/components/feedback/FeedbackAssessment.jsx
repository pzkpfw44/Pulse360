import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, ChevronRight, Send, RefreshCw, Info } from 'lucide-react';

const FeedbackAssessment = ({ 
  campaignId, 
  assessorToken, 
  questions,
  targetEmployee = { name: "Alex Chen", position: "Product Manager" },
  assessorType = "peer" // Can be: manager, peer, direct_report, self, external
}) => {
  // State for responses, validation, and current question
  const [responses, setResponses] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [aiEvaluation, setAiEvaluation] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [allQuestionsAnswered, setAllQuestionsAnswered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bypassWarning, setBypassWarning] = useState(false);
  const [assessmentComplete, setAssessmentComplete] = useState(false);

  // Check if all questions have responses
  useEffect(() => {
    if (!questions || questions.length === 0) return;
    
    const requiredQuestions = questions.filter(q => q.required);
    const answeredRequired = requiredQuestions.every(q => 
      responses[q.id] && (
        (q.type === 'rating' && responses[q.id].rating) || 
        (q.type === 'open_ended' && responses[q.id].text && responses[q.id].text.trim().length > 0)
      )
    );
    
    setAllQuestionsAnswered(answeredRequired);
  }, [responses, questions]);

  // Handle response changes
  const handleResponseChange = (questionId, field, value) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value
      }
    }));
    
    // Reset AI evaluation when responses change
    setAiEvaluation(null);
    setBypassWarning(false);
  };

  // Get open-ended responses for AI evaluation
  const getOpenEndedResponses = () => {
    const openEndedResponses = {};
    
    if (!questions) return {};
    
    questions.forEach(question => {
      if (question.type === 'open_ended' && responses[question.id]?.text) {
        openEndedResponses[question.id] = {
          question: question.text,
          response: responses[question.id].text,
          category: question.category || 'General'
        };
      }
    });
    
    return openEndedResponses;
  };

  // Evaluate feedback using AI
  const evaluateFeedback = async () => {
    setIsEvaluating(true);
    setAiEvaluation(null);
    
    try {
      const openEndedResponses = getOpenEndedResponses();
      
      // If no open-ended responses, skip AI evaluation
      if (Object.keys(openEndedResponses).length === 0) {
        setAiEvaluation({
          status: 'success',
          message: 'No written feedback to evaluate. You can submit your assessment.',
          suggestions: []
        });
        setIsEvaluating(false);
        return;
      }
      
      // Mock AI evaluation for demo
      // In production, this would be an API call to your AI service
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      // Perform basic analysis on the feedback
      const evaluationResult = mockEvaluateFeedback(openEndedResponses, assessorType);
      setAiEvaluation(evaluationResult);
    } catch (error) {
      console.error('Error evaluating feedback:', error);
      setAiEvaluation({
        status: 'error',
        message: 'We encountered a problem evaluating your feedback. You can revise manually or proceed anyway.',
        suggestions: []
      });
    } finally {
      setIsEvaluating(false);
    }
  };
  
  // Mock evaluation function that analyzes feedback text
  const mockEvaluateFeedback = (openEndedResponses, assessorType) => {
    // Combine all response texts for analysis
    const feedbackText = Object.values(openEndedResponses)
      .map(item => item.response)
      .join(' ');
    
    const wordCount = feedbackText.split(/\s+/).length;
    
    // Check for balance indicators
    const hasPositive = /excellent|great|good|strength|well done|impressive|skilled|effective|capable/i.test(feedbackText);
    const hasNegative = /improve|could be better|challenge|difficult|struggle|weakness|limitation/i.test(feedbackText);
    const hasActionable = /suggest|try|consider|recommend|could|should|might want to|would benefit from/i.test(feedbackText);
    const hasIdentifiers = /I|me|my team|our|we worked together|I think|in my opinion/i.test(feedbackText);
    const containsOffensiveLanguage = /moron|idiot|stupid|incompetent|useless|dumb|sucks|terrible|awful/i.test(feedbackText);
    const containsUnprofessionalAdvice = /quit|leave|find another|fire|get rid|fired|resign/i.test(feedbackText);
    const hasMinimalResponses = Object.values(openEndedResponses).some(item => 
      item.response.trim().length < 5 || item.response === '-');
    
    // Different response types based on feedback content
    if (containsOffensiveLanguage) {
      return {
        status: 'needs_improvement',
        message: 'Your feedback contains inappropriate or offensive language that is not constructive.',
        suggestions: [
          'Remove offensive terms like "moron" and use professional language',
          'Focus on behaviors rather than making personal judgments',
          'Describe the specific behaviors that concern you rather than using labels'
        ]
      };
    } else if (containsUnprofessionalAdvice) {
      return {
        status: 'needs_improvement',
        message: 'Your feedback contains suggestions that are not constructive for professional development.',
        suggestions: [
          'Focus on actionable improvements rather than suggesting career changes',
          'Provide specific development suggestions that can be implemented in the current role',
          'Recommend specific skills or behaviors that could be improved'
        ]
      };
    } else if (hasMinimalResponses) {
      return {
        status: 'needs_improvement',
        message: 'Some of your responses are too brief to be meaningful. Please provide more detail.',
        suggestions: [
          'Elaborate on all questions with substantive responses',
          'Provide specific examples to support your feedback',
          'Ensure all required questions have complete answers'
        ]
      };
    } else if (wordCount < 20) {
      return {
        status: 'needs_improvement',
        message: 'Your feedback is too brief to be meaningful. Consider adding more detail and specific examples.',
        suggestions: [
          'Add specific examples of observed behaviors',
          'Expand your feedback with more context',
          'Provide actionable suggestions for improvement'
        ]
      };
    } else if (!hasPositive && hasNegative) {
      return {
        status: 'needs_improvement',
        message: 'Your feedback focuses primarily on areas for improvement without acknowledging strengths.',
        suggestions: [
          'Balance criticism by acknowledging specific strengths',
          'Begin with positive observations before addressing areas for improvement',
          'Consider using the "feedback sandwich" approach: positive-improvement-positive'
        ]
      };
    } else if (hasPositive && !hasNegative) {
      return {
        status: 'needs_improvement',
        message: 'Your feedback is positive but lacks constructive areas for development.',
        suggestions: [
          'Include some areas where growth would be beneficial',
          'Suggest specific skills that could be further developed',
          'Provide balanced feedback by mentioning both strengths and areas for improvement'
        ]
      };
    } else if (!hasActionable) {
      return {
        status: 'needs_improvement',
        message: 'Your feedback lacks specific, actionable recommendations for improvement.',
        suggestions: [
          'Include specific actions the person could take to improve',
          'Suggest resources or approaches that might help them develop',
          'Be more specific about how certain behaviors could be enhanced'
        ]
      };
    } else if (hasIdentifiers) {
      return {
        status: 'needs_improvement',
        message: 'Your feedback contains details that might reveal your identity, which could compromise confidentiality.',
        suggestions: [
          'Remove personal pronouns that could identify you',
          'Focus on observed behaviors rather than your interactions',
          'Avoid mentioning specific projects or events that only you would know about'
        ]
      };
    } else {
      return {
        status: 'success',
        message: 'Your feedback is balanced, specific, and constructive. It provides clear examples and actionable suggestions for improvement.',
        suggestions: []
      };
    }
  };

  // Submit feedback
  const submitFeedback = async (bypass = false) => {
    setSubmitting(true);
    
    try {
      // Prepare data for submission
      const submissionData = {
        campaignId,
        assessorToken,
        targetEmployeeId: targetEmployee.id,
        responses: Object.entries(responses).map(([questionId, response]) => ({
          questionId,
          rating: response.rating,
          text: response.text,
        })),
        bypassedAiRecommendations: bypass
      };
      
      // If bypassing and we have AI evaluation, include it
      if (bypass && aiEvaluation) {
        submissionData.aiEvaluationResults = aiEvaluation;
      }
      
      // For demo purposes, simulate API submission with a delay
      console.log('Submitting feedback:', submissionData);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, you would call your API:
      // await fetch('/api/feedback/submit', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(submissionData)
      // });
      
      setSubmitted(true);
      setAssessmentComplete(true);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // Show error message to user
    } finally {
      setSubmitting(false);
    }
  };
  
  const renderProgressBar = () => {
    const progress = Math.round((Object.keys(responses).length / questions.length) * 100);
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
        <div 
          className="bg-blue-600 h-2.5 rounded-full" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    );
  };

  const renderRatingQuestion = (question) => {
    const currentResponse = responses[question.id] || {};
    const rating = currentResponse.rating || 0;
    
    return (
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">{question.text}</h3>
        {question.category && (
          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mb-3">
            {question.category}
          </span>
        )}
        
        <div className="flex items-center justify-between mt-3">
          <div className="text-sm text-gray-500">Poor</div>
          <div className="flex-1 mx-4">
            <div className="flex justify-between space-x-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    rating === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => handleResponseChange(question.id, 'rating', value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="text-sm text-gray-500">Excellent</div>
        </div>
      </div>
    );
  };

  const renderOpenEndedQuestion = (question) => {
    const currentResponse = responses[question.id] || {};
    const text = currentResponse.text || '';
    
    return (
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">{question.text}</h3>
        {question.category && (
          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mb-3">
            {question.category}
          </span>
        )}
        
        <textarea
          rows="4"
          className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500"
          placeholder="Enter your feedback here..."
          value={text}
          onChange={(e) => handleResponseChange(question.id, 'text', e.target.value)}
        />
        
        <div className="mt-1 text-xs text-gray-500">
          Provide specific examples and constructive feedback
        </div>
      </div>
    );
  };

  // Render assessment complete page
  if (assessmentComplete) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
          <p className="text-gray-600 mb-6">
            Your feedback has been submitted successfully. Your insights will help {targetEmployee.name} grow professionally.
          </p>
          <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-800 mb-6">
            <p>This assessment is now complete. You can close this window.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Feedback Assessment</h1>
        <p className="text-gray-600">
          You're providing feedback for <span className="font-semibold">{targetEmployee.name}</span> ({targetEmployee.position})
        </p>
        <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
          <p>Your feedback will help {targetEmployee.name} understand their strengths and areas for growth. Please be specific, constructive, and balanced.</p>
        </div>
      </div>

      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Questions */}
      <div className="mb-8">
        {questions && questions.map((question, index) => (
          <div key={question.id || index} className="mb-8 p-4 border border-gray-200 rounded-lg">
            {question.type === 'rating' && renderRatingQuestion(question)}
            {question.type === 'open_ended' && renderOpenEndedQuestion(question)}
          </div>
        ))}
      </div>

      {/* AI Evaluation Section */}
      <div className="mb-8">
        <div className="border-t border-gray-200 pt-6 mb-4">
          <h2 className="text-xl font-bold mb-4">Review Your Feedback</h2>
          
          {!aiEvaluation && !isEvaluating && (
            <button
              onClick={evaluateFeedback}
              disabled={!allQuestionsAnswered}
              className={`w-full flex items-center justify-center px-4 py-3 rounded-md ${
                allQuestionsAnswered
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Info className="w-5 h-5 mr-2" />
              {allQuestionsAnswered 
                ? "Check My Feedback with AI Assistant" 
                : "Please answer all required questions first"}
            </button>
          )}
          
          {isEvaluating && (
            <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
              <RefreshCw className="w-5 h-5 text-blue-500 animate-spin mr-2" />
              <span>Analyzing your feedback...</span>
            </div>
          )}
          
          {aiEvaluation && (
            <div className={`p-4 rounded-lg mb-4 ${
              aiEvaluation.status === 'success' ? 'bg-green-50' : 'bg-yellow-50'
            }`}>
              <div className="flex items-start">
                {aiEvaluation.status === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-500 mr-2 mt-0.5" />
                )}
                <div>
                  <h3 className={`font-medium ${
                    aiEvaluation.status === 'success' ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {aiEvaluation.status === 'success' ? 'Feedback looks good!' : 'Suggestions for improvement:'}
                  </h3>
                  <p className="text-gray-700 mt-1">{aiEvaluation.message}</p>
                  
                  {aiEvaluation.suggestions && aiEvaluation.suggestions.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {aiEvaluation.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start">
                          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2 mt-0.5">Tip</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submission controls */}
      <div className="flex flex-col gap-3">
        {aiEvaluation && aiEvaluation.status !== 'success' && !bypassWarning && (
          <button
            onClick={() => setBypassWarning(true)}
            className="px-4 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 flex items-center justify-center"
          >
            <ChevronRight className="w-5 h-5 mr-2" />
            Submit Anyway
          </button>
        )}
        
        {bypassWarning && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
            <h4 className="font-medium text-red-800 mb-1">Are you sure?</h4>
            <p className="text-sm text-gray-700 mb-3">
              Your feedback may not be as constructive as it could be. The HR/admin team will receive the AI's suggestions along with your feedback.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setBypassWarning(false)}
                className="px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
              >
                Revise My Feedback
              </button>
              <button
                onClick={() => submitFeedback(true)}
                className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Anyway'}
              </button>
            </div>
          </div>
        )}
        
        <button
          onClick={() => submitFeedback(false)}
          disabled={submitting || !allQuestionsAnswered || (!bypassWarning && aiEvaluation && aiEvaluation.status !== 'success')}
          className={`px-4 py-3 rounded-md flex items-center justify-center ${
            submitting || !allQuestionsAnswered || (!bypassWarning && aiEvaluation && aiEvaluation.status !== 'success')
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          <Send className="w-5 h-5 mr-2" />
          {submitting 
            ? 'Submitting...' 
            : !allQuestionsAnswered 
              ? 'Please answer all required questions' 
              : (!aiEvaluation) 
                ? 'Check Feedback Before Submitting' 
                : 'Submit Feedback'}
        </button>
      </div>
    </div>
  );
};

export default FeedbackAssessment;