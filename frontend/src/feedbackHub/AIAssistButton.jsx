import {
    ArrowPathIcon,
    LightBulbIcon,
    ArrowsPointingOutIcon,
    ArrowsPointingInIcon
  } from '@heroicons/react/24/outline'
  
  export default function AIAssistButton({ type, onClick, isLoading }) {
    let icon = <LightBulbIcon className="h-4 w-4" />
    let text = 'AI Assist'
    let tooltip = 'Get AI assistance'
    let bgColor = 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
    
    switch (type) {
      case 'improve':
        text = 'Improve'
        tooltip = 'Improve this response with AI suggestions'
        icon = <LightBulbIcon className="h-4 w-4" />
        bgColor = 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
        break
      case 'expand':
        text = 'Expand'
        tooltip = 'Expand this response with more details'
        icon = <ArrowsPointingOutIcon className="h-4 w-4" />
        bgColor = 'bg-green-100 text-green-700 hover:bg-green-200'
        break
      case 'summarize':
        text = 'Summarize'
        tooltip = 'Summarize this response more concisely'
        icon = <ArrowsPointingInIcon className="h-4 w-4" />
        bgColor = 'bg-amber-100 text-amber-700 hover:bg-amber-200'
        break
      case 'example':
        text = 'Example'
        tooltip = 'Show an example response'
        icon = <LightBulbIcon className="h-4 w-4" />
        bgColor = 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        break
    }
    
    return (
      <button
        type="button"
        className={`inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md ${bgColor}`}
        onClick={onClick}
        disabled={isLoading}
        title={tooltip}
      >
        {isLoading ? (
          <ArrowPathIcon className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          icon
        )}
        <span className="ml-1">{isLoading ? 'Processing...' : text}</span>
      </button>
    )
  }