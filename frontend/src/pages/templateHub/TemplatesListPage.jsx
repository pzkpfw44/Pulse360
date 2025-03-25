import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline'
import templateService from '../../services/templateService'
import TemplateList from '../../components/templateHub/TemplateList'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'

export default function TemplatesListPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showDefault, setShowDefault] = useState(null) // null = all, true = default only, false = non-default only
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  
  // Fetch templates
  const { 
    data: templates, 
    isLoading, 
    error,
    refetch
  } = useQuery(
    ['templates', searchQuery, showDefault, currentPage],
    () => templateService.getAllTemplates(
      searchQuery,
      showDefault,
      pageSize,
      (currentPage - 1) * pageSize
    ),
    { keepPreviousData: true }
  )
  
  // Handle search
  const handleSearch = (e) => {
    e.preventDefault()
    setCurrentPage(1)
    refetch()
  }
  
  // Handle filter changes
  const handleFilterChange = (value) => {
    setShowDefault(value)
    setCurrentPage(1)
  }
  
  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
  }
  
  // Calculate total pages
  const totalTemplates = templates?.length || 0
  const totalPages = Math.ceil(totalTemplates / pageSize)
  
  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Feedback Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage feedback question templates for your 360-degree feedback cycles.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/templates/create"
            className="btn-primary inline-flex items-center"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Create Template
          </Link>
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Filters & Search */}
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:w-64 mb-4 sm:mb-0">
              <form onSubmit={handleSearch}>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="text"
                    className="form-input block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button type="submit" className="sr-only">Search</button>
              </form>
            </div>
            
            <div className="flex space-x-2">
              <button
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  showDefault === null
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => handleFilterChange(null)}
              >
                All
              </button>
              <button
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  showDefault === true
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => handleFilterChange(true)}
              >
                Default
              </button>
              <button
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  showDefault === false
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => handleFilterChange(false)}
              >
                Custom
              </button>
            </div>
          </div>
        </div>
        
        {/* Template list */}
        {isLoading ? (
          <div className="px-4 py-5 sm:p-6">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="px-4 py-5 sm:p-6 text-center text-red-500">
            Error loading templates. Please try again.
          </div>
        ) : templates && templates.length > 0 ? (
          <TemplateList templates={templates} refetch={refetch} />
        ) : (
          <div className="px-4 py-5 sm:p-6">
            <EmptyState
              title="No templates found"
              description="Get started by creating your first feedback template."
              buttonText="Create Template"
              buttonLink="/templates/create"
              icon="template"
            />
          </div>
        )}
        
        {/* Pagination */}
        {templates && templates.length > 0 && totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, totalTemplates)}
                  </span>{' '}
                  of <span className="font-medium">{totalTemplates}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => handlePageChange(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === i + 1
                          ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10l-3.293-3.293a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}