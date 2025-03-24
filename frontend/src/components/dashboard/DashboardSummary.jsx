import { Link } from 'react-router-dom'
import { PlusIcon } from '@heroicons/react/24/outline'
import LoadingSpinner from '../common/LoadingSpinner'

export default function DashboardSummary({ 
  isLoadingTemplates, 
  isLoadingDocuments, 
  templates, 
  documents, 
  templatesError,
  documentsError 
}) {
  return (
    <div className="card">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Resources</h2>
      
      {/* Templates section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Recent Templates</h3>
          <Link 
            to="/templates/create" 
            className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            New Template
          </Link>
        </div>
        
        {isLoadingTemplates ? (
          <LoadingSpinner size="sm" />
        ) : templatesError ? (
          <div className="text-sm text-red-500">Error loading templates</div>
        ) : templates && templates.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {templates.slice(0, 3).map((template) => (
              <li key={template.id} className="py-3">
                <Link to={`/templates/${template.id}`} className="block hover:bg-gray-50 -m-3 p-3 rounded-md">
                  <p className="text-sm font-medium text-gray-900 truncate">{template.title}</p>
                  <p className="text-sm text-gray-500 mt-1 truncate">
                    {template.description || `${template.questions?.length || 0} questions`}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-gray-500 text-center py-2">No templates found</div>
        )}
        
        <div className="mt-2 text-right">
          <Link to="/templates" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            View all templates →
          </Link>
        </div>
      </div>
      
      {/* Documents section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Recent Documents</h3>
          <Link 
            to="/documents/upload" 
            className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Upload Document
          </Link>
        </div>
        
        {isLoadingDocuments ? (
          <LoadingSpinner size="sm" />
        ) : documentsError ? (
          <div className="text-sm text-red-500">Error loading documents</div>
        ) : documents && documents.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {documents.slice(0, 3).map((document) => (
              <li key={document.id} className="py-3">
                <Link to={`/documents/${document.id}`} className="block hover:bg-gray-50 -m-3 p-3 rounded-md">
                  <p className="text-sm font-medium text-gray-900 truncate">{document.title}</p>
                  <div className="flex justify-between mt-1">
                    <p className="text-sm text-gray-500 truncate">
                      {document.description || document.mime_type}
                    </p>
                    <div className="flex flex-wrap">
                      {document.tags && document.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="ml-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-gray-500 text-center py-2">No documents found</div>
        )}
        
        <div className="mt-2 text-right">
          <Link to="/documents" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            View all documents →
          </Link>
        </div>
      </div>
    </div>
  )
}