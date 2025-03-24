import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from 'react-query'
import { toast } from 'react-toastify'
import { format } from 'date-fns'
import {
  ArrowPathIcon,
  LightBulbIcon,
  DocumentTextIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline'
import feedbackService from '../../services/feedbackService'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import FeedbackQuestion from '../../components/feedbackHub/FeedbackQuestion'
import AIAssistButton from '../../components/feedbackHub/AIAssistButton'

export default function FeedbackFormPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [answers, setAnswers] = useState({})
  const [comments, setComments] = useState('')
  const [saveTimestamp, setSaveTimestamp] = useState(null)
  const [autoSaveInterval, setAutoSaveInterval] = useState(null)
  const [isAIAssisting, setIsAIAssisting] = useState(false)
  const [activeQuestion, setActiveQuestion] = useState(null)
  
  // Fetch feedback form data
  const { data: form, isLoading, error } = useQuery(
    ['feedback-form', token],
    () => feedbackService.getFeedbackForm(token),
    {
      retry: 1,
      onError: (err) => {
        console.error('Error fetching feedback form:', err)
        toast.error('Error loading feedback form. The link may be invalid or expired.')
      }
    }
  )
  
  // Save draft mutation
  const saveDraftMutation = useMutation(
    (data) => feedbackService.saveDraft(token, data.answers, data.comments),
    {
      onSuccess: (data) => {
        setSaveTimestamp(new Date())
      },
      onError: (err) => {
        console.error('Error saving draft:', err)
        toast.error('Failed to save draft. Please try again.')
      }
    }
  )
  
  // Submit feedback mutation
  const submitMutation = useMutation(
    (data) => feedbackService.submitFeedback(token, data.answers, data.comments),
    {
      onSuccess: (data) => {
        toast.success('Feedback submitted successfully!')
        navigate('/feedback/thank-you')
      },
      onError: (err) => {
        console.error('Error submitting feedback:', err)
        toast.error('Failed to submit feedback. Please try again.')
      }
    }
  )
  
  // AI assistance mutation
  const aiAssistMutation = useMutation(
    (data) => feedbackService.getAIAssistance(
      token,
      data.questionId,
      data.currentText,
      data.requestType
    ),
    {
      onSuccess: (data) => {
        setIsAIAssisting(false)
        
        // Update the answer with improved text
        if (data.improved_text && activeQuestion) {
          const updatedAnswers = { ...answers }
          updatedAnswers[activeQuestion] = data.improved_text
          setAnswers(updatedAnswers)
          
          toast.success('AI assistance applied!')
        }
      },
      onError: (err) => {
        setIsAIAssisting(false)
        console.error('Error getting AI assistance:', err)
        toast.error('Failed to get AI assistance. Please try again.')
      }
    }
  )
  
  // Load pre-existing draft answers if available
  useEffect(() => {
    if (form && form.draft_answers) {
      const answersMap = {}
      form.draft_answers.forEach(answer => {
        answersMap[answer.question_id] = answer.value
      })
      setAnswers(answersMap)
      
      if (form.comments) {
        setComments(form.comments)
      }
    }
  }, [form])
  
  // Set up auto-save interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (Object.keys(answers).length > 0) {
        handleSaveDraft()
      }
    }, 60000) // Auto-save every minute
    
    setAutoSaveInterval(interval)
    
    return () => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval)
      }
    }
  }, [answers, comments])
  
  // Handle answer change
  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
  }
  
  // Handle save draft
  const handleSaveDraft = () => {
    // Convert answers to the format expected by the API
    const answersArray = Object.entries(answers).map(([questionId, value]) => ({
      question_id: questionId,
      value
    }))
    
    saveDraftMutation.mutate({
      answers: answersArray,
      comments
    })
  }
  
  // Handle submit
  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Validate answers
    const requiredQuestions = form.questions.filter(q => q.required)
    const unansweredQuestions = requiredQuestions.filter(q => !answers[q.id])
    
    if (unansweredQuestions.length > 0) {
      toast.error(`Please answer all required questions (${unansweredQuestions.length} remaining)`)
      return
    }
    
    // Convert answers to the format expected by the API
    const answersArray = Object.entries(answers).map(([questionId, value]) => ({
      question_id: questionId,
      value
    }))
    
    if (confirm('Are you sure you want to submit? You won\'t be able to make changes after submission.')) {
      submitMutation.mutate({
        answers: answersArray,
        comments
      })
    }
  }
  
  // Handle AI assistance
  const handleAIAssist = (questionId, requestType) => {
    const currentText = answers[questionId] || ''
    
    if (!currentText.trim()) {
      toast.warning('Please enter some text before requesting AI assistance')
      return
    }
    
    setIsAIAssisting(true)
    setActiveQuestion(questionId)
    
    aiAssistMutation.mutate({
      questionId,
      currentText,
      requestType
    })
  }
  
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-500">Loading feedback form...</p>
      </div>
    )
  }
  
  if (error || !form) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
          <DocumentTextIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
        </div>
        <h3 className="mt-3 text-lg font-medium text-gray-900">Error Loading Form</h3>
        <p className="mt-2 text-sm text-gray-500">
          The feedback link appears to be invalid or expired. Please contact the HR team for assistance.
        </p>
      </div>
    )
  }
  
  // Check if feedback is already completed
  if (form.status === 'completed') {
    return (
      <div className="text-center py-12">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mt-3 text-lg font-medium text-gray-900">Feedback Already Submitted</h3>
        <p className="mt-2 text-sm text-gray-500">
          Thank you for your participation! Your feedback has already been submitted.
        </p>
      </div>
    )
  }
  
  return (
    <div className="max-w-3xl mx-auto bg-white shadow rounded-lg">
      <div className="px-6 py-5 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">
          Feedback for: {form.subject_name}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Cycle: {form.cycle_title}
        </p>
        {form.deadline && (
          <p className="mt-1 text-sm text-red-600">
            Please complete by: {format(new Date(form.deadline), 'MMM d, yyyy')}
          </p>
        )}
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="px-6 py-5">
          <div className="space-y-8">
            {form.questions.map((question) => (
              <FeedbackQuestion
                key={question.id}
                question={question}
                value={answers[question.id] || ''}
                onChange={(value) => handleAnswerChange(question.id, value)}
                onAIAssist={(requestType) => handleAIAssist(question.id, requestType)}
                isAIAssisting={isAIAssisting && activeQuestion === question.id}
              />
            ))}
            
            <div>
              <label htmlFor="comments" className="block text-sm font-medium text-gray-700">
                Additional Comments (Optional)
              </label>
              <div className="mt-1">
                <textarea
                  id="comments"
                  name="comments"
                  rows={4}
                  className="form-input"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
              </div>
              <div className="mt-2 flex justify-end space-x-2">
                <AIAssistButton
                  type="improve"
                  onClick={() => handleAIAssist('comments', 'improve')}
                  isLoading={isAIAssisting && activeQuestion === 'comments'}
                />
                <AIAssistButton
                  type="expand"
                  onClick={() => handleAIAssist('comments', 'expand')}
                  isLoading={isAIAssisting && activeQuestion === 'comments'}
                />
                <AIAssistButton
                  type="summarize"
                  onClick={() => handleAIAssist('comments', 'summarize')}
                  isLoading={isAIAssisting && activeQuestion === 'comments'}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 rounded-b-lg">
          <div className="text-sm text-gray-500">
            {saveTimestamp ? (
              <span>Last saved: {format(saveTimestamp, 'h:mm a')}</span>
            ) : (
              <span>Auto-save enabled</span>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              className="btn-secondary flex items-center"
              onClick={handleSaveDraft}
              disabled={saveDraftMutation.isLoading}
            >
              {saveDraftMutation.isLoading ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Save Draft
                </>
              )}
            </button>
            
            <button
              type="submit"
              className="btn-primary"
              disabled={submitMutation.isLoading}
            >
              {submitMutation.isLoading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}