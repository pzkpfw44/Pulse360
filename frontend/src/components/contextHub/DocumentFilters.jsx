import LoadingSpinner from '../common/LoadingSpinner'

export default function DocumentFilters({ 
  allTags, 
  selectedTags, 
  onTagSelect, 
  isLoading 
}) {
  // Count documents with each tag (in a real implementation this would come from the API)
  const getTagCount = (tag) => {
    // This is a placeholder function
    // In a real implementation, the backend would provide tag counts
    return Math.floor(Math.random() * 10) + 1 // Just for demonstration
  }
  
  if (isLoading) {
    return (
      <div className="py-4">
        <h3 className="text-sm font-medium text-gray-700">Tags</h3>
        <div className="mt-2">
          <LoadingSpinner size="sm" />
        </div>
      </div>
    )
  }
  
  if (!allTags || allTags.length === 0) {
    return (
      <div className="py-4">
        <h3 className="text-sm font-medium text-gray-700">Tags</h3>
        <p className="mt-1 text-sm text-gray-500">No tags available</p>
      </div>
    )
  }
  
  return (
    <div className="py-4">
      <h3 className="text-sm font-medium text-gray-700">Filter by Tags</h3>
      <div className="mt-2 space-y-2">
        {allTags.map((tag) => (
          <div key={tag} className="flex items-center">
            <input
              id={`tag-${tag}`}
              name={`tag-${tag}`}
              type="checkbox"
              checked={selectedTags.includes(tag)}
              onChange={() => onTagSelect(tag)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor={`tag-${tag}`} className="ml-3 text-sm text-gray-600 flex justify-between w-full">
              <span>{tag}</span>
              <span className="text-xs text-gray-500 rounded-full bg-gray-100 px-2 py-0.5">
                {getTagCount(tag)}
              </span>
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}