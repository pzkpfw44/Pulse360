import { useState, useRef, useCallback } from 'react'
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/solid'

export default function TagInput({ 
  value, 
  onChange, 
  placeholder = 'Add tag...', 
  suggestions = [] 
}) {
  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState([])
  const inputRef = useRef(null)
  
  // Filter suggestions based on input value
  const filterSuggestions = useCallback((input) => {
    if (!input) {
      return []
    }
    
    // Filter suggestions that:
    // 1. Include the input as a substring
    // 2. Are not already selected
    // 3. Limit to 5 suggestions
    const filtered = suggestions
      .filter(
        (suggestion) => 
          suggestion.toLowerCase().includes(input.toLowerCase()) && 
          !value.includes(suggestion)
      )
      .slice(0, 5)
    
    setFilteredSuggestions(filtered)
  }, [suggestions, value])
  
  // Add a tag
  const addTag = (tag) => {
    const trimmedTag = tag.trim()
    if (trimmedTag && !value.includes(trimmedTag)) {
      const newTags = [...value, trimmedTag]
      onChange(newTags)
    }
    setInputValue('')
    setFilteredSuggestions([])
    inputRef.current?.focus()
  }
  
  // Remove a tag
  const removeTag = (tagToRemove) => {
    const newTags = value.filter((tag) => tag !== tagToRemove)
    onChange(newTags)
  }
  
  // Handle key down
  const handleKeyDown = (e) => {
    // Add tag on Enter or comma
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (inputValue) {
        addTag(inputValue)
      }
    }
    
    // Remove last tag on Backspace if input is empty
    if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }
  
  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value
    setInputValue(newValue)
    filterSuggestions(newValue)
  }
  
  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    addTag(suggestion)
  }
  
  return (
    <div className="relative">
      <div
        className={`flex flex-wrap items-center p-2 border rounded-md bg-white ${
          isFocused ? 'border-primary-500 ring-1 ring-primary-500' : 'border-gray-300'
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Render selected tags */}
        {value.map((tag) => (
          <div
            key={tag}
            className="flex items-center mr-2 mb-2 px-2 py-1 text-sm bg-primary-100 text-primary-800 rounded-md"
          >
            <span>{tag}</span>
            <button
              type="button"
              className="ml-1 text-primary-600 hover:text-primary-800"
              onClick={() => removeTag(tag)}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
        
        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          className="flex-1 min-w-[120px] p-1 outline-none bg-transparent"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true)
            filterSuggestions(inputValue)
          }}
          onBlur={() => {
            setIsFocused(false)
            // Give time for suggestion click to register before hiding suggestions
            setTimeout(() => setFilteredSuggestions([]), 150)
          }}
          placeholder={value.length === 0 ? placeholder : ''}
        />
      </div>
      
      {/* Suggestions dropdown */}
      {filteredSuggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-300 max-h-60 overflow-auto">
          <ul className="py-1">
            {filteredSuggestions.map((suggestion) => (
              <li
                key={suggestion}
                className="px-3 py-2 cursor-pointer hover:bg-primary-50 flex items-center"
                onMouseDown={() => handleSuggestionClick(suggestion)} // Use mouseDown to fire before blur
              >
                <PlusIcon className="h-4 w-4 mr-2 text-primary-500" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}