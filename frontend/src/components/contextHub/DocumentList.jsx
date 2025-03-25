import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useMutation } from 'react-query'
import { toast } from 'react-toastify'
import {
  DocumentIcon,
  DocumentTextIcon,
  DocumentChartBarIcon,
  PhotoIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  PencilIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'
import documentService from '../../services/documentService'
import ConfirmDialog from '../common/ConfirmDialog'

export default function DocumentList({ documents, refetch }) {
  const [documentToDelete, setDocumentToDelete] = useState(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  
  // Delete document mutation
  const deleteMutation = useMutation(
    (documentId) => documentService.deleteDocument(documentId),
    {
      onSuccess: () => {
        toast.success('Document deleted successfully')
        refetch()
        setDocumentToDelete(null)
        setIsConfirmOpen(false)
      },
      onError: (error) => {
        console.error('Error deleting document:', error)
        toast.error('Failed to delete document')
        setDocumentToDelete(null)
        setIsConfirmOpen(false)
      }
    }
  )
  
  // Handle delete document
  const handleDeleteDocument = () => {
    if (!documentToDelete) return
    deleteMutation.mutate(documentToDelete.id)
  }
  
  // Get document icon based on mime type
  const getDocumentIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) {
      return <PhotoIcon className="h-10 w-10 text-gray-400" />
    }
    
    if (mimeType.includes('pdf')) {
      return <DocumentTextIcon className="h-10 w-10 text-red-400" />
    }
    
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
      return <DocumentChartBarIcon className="h-10 w-10 text-green-400" />
    }
    
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return <DocumentTextIcon className="h-10 w-10 text-blue-400" />
    }
    
    return <DocumentIcon className="h-10 w-10 text-gray-400" />
  }
  
  return (
    <>
      <ul className="divide-y divide-gray-200">
        {documents.map((document) => {
          const createdDate = new Date(document.created_at)
          
          return (
            <li key={document.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {getDocumentIcon(document.mime_type)}
                </div>
                
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link
                        to={`/documents/${document.id}`}
                        className="text-lg font-medium text-primary-600 hover:text-primary-700"
                      >
                        {document.title}
                      </Link>
                      
                      <p className="text-sm text-gray-500 mt-1">
                        Uploaded: {format(createdDate, 'MMM d, yyyy')}
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <a
                        href={documentService.getDocumentDownloadUrl(document.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center p-2 text-sm font-medium text-gray-700 bg-white rounded-md hover:bg-gray-50"
                        title="Download document"
                      >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                      </a>
                      
                      <Link
                        to={`/documents/${document.id}/edit`}
                        className="inline-flex items-center p-2 text-sm font-medium text-gray-700 bg-white rounded-md hover:bg-gray-50"
                        title="Edit document details"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </Link>
                      
                      <button
                        type="button"
                        className="inline-flex items-center p-2 text-sm font-medium text-red-700 bg-white rounded-md hover:bg-red-50"
                        onClick={() => {
                          setDocumentToDelete(document)
                          setIsConfirmOpen(true)
                        }}
                        title="Delete document"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  {document.description && (
                    <p className="text-sm text-gray-600 mt-2">{document.description}</p>
                  )}
                  
                  {document.tags && document.tags.length > 0 && (
                    <div className="flex flex-wrap items-center mt-2">
                      <span className="text-xs text-gray-500 mr-2">Tags:</span>
                      {document.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2 mb-1"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      
      {/* Confirm delete dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Delete Document"
        message={`Are you sure you want to delete "${documentToDelete?.title}"? This action cannot be undone.`}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        onConfirm={handleDeleteDocument}
        onCancel={() => {
          setIsConfirmOpen(false)
          setDocumentToDelete(null)
        }}
        isDestructive={true}
      />
    </>
  )
}