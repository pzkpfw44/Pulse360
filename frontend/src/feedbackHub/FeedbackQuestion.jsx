import { useState } from 'react'
import AIAssistButton from './AIAssistButton'

export default function FeedbackQuestion({ 
  question, 
  value, 
  onChange, 
  onAIAssist,
  isAIAssisting 
}) {
  const [comment, setComment] = useState('')
  
  // Generate stars for rating questions
  const renderRatingInput = () => {
    const maxRating = question.options 
      ? Math.max(...question.options.map(o => Number(o.value)))
      : 5
    
    return (
      <div className="flex items-center space-x-2">
        {[...Array(maxRating)].map((_, i) => {
          const ratingValue = i + 1
          return (
            <button
              key={i}
              type="button"
              className={`w-10 h-10 flex items-center justify-center rounded-full focus:outline-none ${
                ratingValue <= value 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}
              onClick={() => onChange(ratingValue)}
            >
              {ratingValue}
            </button>
          )
        })}
        <span className="ml-2 text-sm text-gray-500">
          {value ? `${value} out of ${maxRating}` : 'Not rated'}
        </span>
      </div>
    )
  }
  
  // Generate multiple choice input
  const renderMultipleChoiceInput = () => {
    return (
      <div className="mt-1 space-y-2">
        {question.options.map((option) => (
          <div key={option.value} className="flex items-center">
            <input
              id={`question-${question.id}-option-${option.value}`}
              name={`question-${question.id}`}
              type="radio"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <label
              htmlFor={`question-${question.id}-option-${option.value}`}
              className="ml-3 block text-sm text-gray-700"
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
    )
  }
  
  // Generate checkbox input
  const renderCheckboxInput = () => {
    // Handle checkbox as an array of values
    const valueArray = Array.isArray(value) ? value : value ? [value] : []
    
    const handleCheckboxChange = (optionValue) => {
      const newValue = [...valueArray]
      const index = newValue.indexOf(optionValue)
      
      if (index === -1) {
        newValue.push(optionValue)
      } else {
        newValue.splice(index, 1)
      }
      
      onChange(newValue)
    }
    
    return (
      <div className="mt-1 space-y-2">
        {question.options.map((option) => (
          <div key={option.value} className="flex items-center">
            <input
              id={`question-${question.id}-option-${option.value}`}
              name={`question-${question.id}`}
              type="checkbox"
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              checked={valueArray.includes(option.value)}
              onChange={() => handleCheckboxChange(option.value)}
            />
            <label
              htmlFor={`question-${question.id}-option-${option.value}`}
              className="ml-3 block text-sm text-gray-700"
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
    )
  }
  
  // Generate text or textarea input
  const renderTextInput = () => {
    const inputType = question.type === 'textarea'
    
    return (
      <div>
        {inputType ? (
          <textarea
            id={`question-${question.id}`}
            name={`question-${question.id}`}
            rows={4}
            className="form-input"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter your response to the question...`}
          />
        ) : (
          <input
            type="text"
            id={`question-${question.id}`}
            name={`question-${question.id}`}
            className="form-input"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter your response to the question...`}
          />
        )}
        
        {(question.type === 'textarea') && (
          <div className="mt-2 flex justify-end space-x-2">
            <AIAssistButton
              type="improve"
              onClick={() => onAIAssist('improve')}
              isLoading={isAIAssisting}
            />
            <AIAssistButton
              type="expand"
              onClick={() => onAIAssist('expand')}
              isLoading={isAIAssisting}
            />
            <AIAssistButton
              type="summarize"
              onClick={() => onAIAssist('summarize')}
              isLoading={isAIAssisting}
            />
          </div>
        )}
      </div>
    )
  }
  
  // Render the appropriate input based on question type
  const renderInput = () => {
    switch (question.type) {
      case 'rating':
        return renderRatingInput()
      case 'multiplechoice':
        return renderMultipleChoiceInput()
      case 'checkbox':
        return renderCheckboxInput()
      case 'text':
      case 'textarea':
      default:
        return renderTextInput()
    }
  }
  
  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex justify-between">
        <label className="block text-sm font-medium text-gray-900">
          {question.text}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {question.category && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {question.category}
          </span>
        )}
      </div>
      
      {question.description && (
        <p className="mt-1 text-sm text-gray-500">{question.description}</p>
      )}
      
      <div className="mt-3">
        {renderInput()}
      </div>
      
      <div className="mt-3">
        <label className="block text-xs font-medium text-gray-500">
          Additional Comment (Optional)
        </label>
        <textarea
          rows={2}
          className="mt-1 form-input text-sm"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add any additional context or explanation for your answer..."
        />
      </div>
    </div>
  )
}