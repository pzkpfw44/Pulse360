import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import documentService from '../../services/documentService'
import DocumentList from '../../components/contextHub/DocumentList'
import DocumentFilters from '../../components/contextHub/DocumentFilters'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'

export default function DocumentsListPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  
  // Fetch all document tags
  const { 
    data: allTags,
    isLoading: isLoadingTags
  } = useQuery(
    'document-tags',
    () => documentService.getAllTags(),
    { staleTime: 300000 } // 5 minutes
  )
  
  // Fetch documents
  const { 
    data: documents, 
    isLoading: isLoadingDocuments,
    error: documentsError,
    refetch: refetchDocuments
  } = useQuery(
    ['documents', searchQuery, selectedTags, currentPage],
    () => documentService.getAllDocuments(
      searchQuery,
      selectedTags,
      pageSize,
      (currentPage - 1) * pageSize
    ),
    { keepPreviousData: true }
  )
  
  // Handle search input
  const handleSearch = (e) => {
    e.preventDefault()
    setCurrentPage(1)
  }
  
  // Handle tag selection
  const handleTagSelect = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
    setCurrentPage(1)
  }
  
  // Handle pagination
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
  }
  
  // Calculate total pages
  const totalDocuments = documents?.length || 0
  const totalPages = Math.ceil(totalDocuments / pageSize)
  
  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload and manage documents for your feedback templates and cycles.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/documents/upload"
            className="btn-primary inline-flex items-center"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Upload Document
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Filters */}
        <div className="lg:col-span-1">
          <div className="card sticky top-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
            
            {/* Search box */}
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  className="form-input pl-10"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button type="submit" className="sr-only">Search</button>
            </form>
            
            {/* Tag filters */}
            <DocumentFilters 
              allTags={allTags || []} 
              selectedTags={selectedTags} 
              onTagSelect={handleTagSelect} 
              isLoading={isLoadingTags}
            />
            
            {/* Clear filters */}
            {(searchQuery || selectedTags.length > 0) && (
              <div className="mt-4">
                <button
                  type="button"
                  className="text-sm text-primary-600 hover:text-primary-700"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedTags([])
                    setCurrentPage(1)
                  }}
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Document list */}
        <div className="lg:col-span-3">
          {isLoadingDocuments ? (
            <div className="bg-white shadow rounded-lg p-6">
              <LoadingSpinner />
            </div>
          ) : documentsError ? (
            <div className="bg-white shadow rounded-lg p-6 text-center text-red-500">
              Error loading documents. Please try again.
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="bg-white shadow rounded-lg">
              <DocumentList 
                documents={documents} 
                refetch={refetchDocuments}
              />
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
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
                          {Math.min(currentPage * pageSize, totalDocuments)}
                        </span>{' '}
                        of <span className="font-medium">{totalDocuments}</span> results
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
          ) : (
            <EmptyState
              title="No documents found"
              description="Get started by uploading your first document."
              buttonText="Upload Document"
              buttonLink="/documents/upload"
              icon="document"
            />
          )}
        </div>
      </div>
    </div>
  )
}