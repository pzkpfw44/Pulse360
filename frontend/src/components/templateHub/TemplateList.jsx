import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useMutation } from 'react-query'
import { toast } from 'react-toastify'
import {
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  TrashIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import templateService from '../../services/templateService'
import ConfirmDialog from '../common/ConfirmDialog'

export default function TemplateList({ templates, refetch }) {
  const [templateToDelete, setTemplateToDelete] = useState(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isCloning, setIsCloning] = useState(false)
  
  // Delete template mutation
  const deleteMutation = useMutation(
    (templateId) => templateService.deleteTemplate(templateId),
    {
      onSuccess: () => {
        toast.success('Template deleted successfully')
        refetch()
        setTemplateToDelete(null)
        setIsConfirmOpen(false)
      },
      onError: (error) => {
        console.error('Error deleting template:', error)
        toast.error('Failed to delete template')
        setTemplateToDelete(null)
        setIsConfirmOpen(false)
      }
    }
  )
  
  // Clone template mutation
  const cloneMutation = useMutation(
    (templateId) => templateService.cloneTemplate(templateId),
    {
      onSuccess: () => {
        toast.success('Template cloned successfully')
        refetch()
        setIsCloning(false)
      },
      onError: (error) => {
        console.error('Error cloning template:', error)
        toast.error('Failed to clone template')
        setIsCloning(false)
      }
    }
  )
  
  // Handle delete template
  const handleDeleteTemplate = () => {
    if (!templateToDelete) return
    deleteMutation.mutate(templateToDelete.id)
  }
  
  // Handle clone template
  const handleCloneTemplate = (template) => {
    setIsCloning(true)
    cloneMutation.mutate(template.id)
  }
  
  // Get question count by category
  const getQuestionsByCategory = (questions) => {
    const categories = {}
    
    questions.forEach(question => {
      const category = question.category || 'General'
      if (!categories[category]) {
        categories[category] = 0
      }
      categories[category]++
    })
    
    return categories
  }
  
  return (
    <>
      <ul className="divide-y divide-gray-200">
        {templates.map((template) => {
          const createdDate = new Date(template.created_at)
          const questionCount = template.questions?.length || 0
          const categories = getQuestionsByCategory(template.questions || [])
          
          return (
            <li key={template.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {template.is_default ? (
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <StarIconSolid className="h-6 w-6 text-yellow-500" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <ClipboardDocumentListIcon className="h-6 w-6 text-primary-600" />
                    </div>
                  )}
                </div>
                
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link
                        to={`/templates/${template.id}`}
                        className="text-lg font-medium text-primary-600 hover:text-primary-700"
                      >
                        {template.title}
                      </Link>
                      
                      <div className="flex items-center mt-1">
                        <span className="text-sm text-gray-500">
                          Created: {format(createdDate, 'MMM d, yyyy')}
                        </span>
                        <span className="mx-2 text-gray-300">•</span>
                        <span className="text-sm text-gray-500">
                          {questionCount} questions
                        </span>
                        {template.is_default && (
                          <>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Default template
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Link
                        to={`/templates/${template.id}`}
                        className="inline-flex items-center p-2 text-sm font-medium text-gray-700 bg-white rounded-md hover:bg-gray-50"
                        title="View template"
                      >
                        <ClipboardDocumentCheckIcon className="h-5 w-5" />
                      </Link>
                      
                      <button
                        type="button"
                        className="inline-flex items-center p-2 text-sm font-medium text-gray-700 bg-white rounded-md hover:bg-gray-50"
                        onClick={() => handleCloneTemplate(template)}
                        disabled={isCloning}
                        title="Clone template"
                      >
                        {isCloning ? (
                          <ArrowPathIcon className="h-5 w-5 animate-spin" />
                        ) : (
                          <DocumentDuplicateIcon className="h-5 w-5" />
                        )}
                      </button>
                      
                      <Link
                        to={`/templates/${template.id}/edit`}
                        className="inline-flex items-center p-2 text-sm font-medium text-gray-700 bg-white rounded-md hover:bg-gray-50"
                        title="Edit template"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </Link>
                      
                      <button
                        type="button"
                        className="inline-flex items-center p-2 text-sm font-medium text-red-700 bg-white rounded-md hover:bg-red-50"
                        onClick={() => {
                          setTemplateToDelete(template)
                          setIsConfirmOpen(true)
                        }}
                        title="Delete template"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  {template.description && (
                    <p className="text-sm text-gray-600 mt-2">{template.description}</p>
                  )}
                  
                  {/* Categories */}
                  {Object.keys(categories).length > 0 && (
                    <div className="flex flex-wrap items-center mt-2">
                      <span className="text-xs text-gray-500 mr-2">Categories:</span>
                      {Object.entries(categories).map(([category, count]) => (
                        <span
                          key={category}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2 mb-1"
                        >
                          {category} ({count})
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
        title="Delete Template"
        message={`Are you sure you want to delete "${templateToDelete?.title}"? This action cannot be undone.`}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        onConfirm={handleDeleteTemplate}
        onCancel={() => {
          setIsConfirmOpen(false)
          setTemplateToDelete(null)
        }}
        isDestructive={true}
      />
    </>
  )
}