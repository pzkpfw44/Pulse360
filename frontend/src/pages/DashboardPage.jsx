import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { 
  DocumentTextIcon, 
  ClipboardDocumentListIcon, 
  ClipboardDocumentCheckIcon,
  UserGroupIcon 
} from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import cycleService from '../services/cycleService'
import templateService from '../services/templateService'
import documentService from '../services/documentService'
import DashboardWidget from '../components/dashboard/DashboardWidget'
import FeedbackCycleList from '../components/controlHub/FeedbackCycleList'
import LoadingSpinner from '../components/common/LoadingSpinner'
import DashboardSummary from '../components/dashboard/DashboardSummary'

export default function DashboardPage() {
  const { currentUser } = useAuth()
  const [activeStatus, setActiveStatus] = useState('active')
  
  // Fetch active cycles
  const { 
    data: activeCycles, 
    isLoading: isLoadingCycles,
    error: cyclesError
  } = useQuery(
    ['cycles', activeStatus],
    () => cycleService.getMyCycles('', activeStatus, null, null, 5, 0),
    { keepPreviousData: true }
  )
  
  // Fetch recent templates
  const { 
    data: templates, 
    isLoading: isLoadingTemplates,
    error: templatesError
  } = useQuery(
    'recent-templates',
    () => templateService.getAllTemplates('', null, 5, 0),
    { keepPreviousData: true }
  )
  
  // Fetch recent documents
  const {
    data: documents,
    isLoading: isLoadingDocuments,
    error: documentsError
  } = useQuery(
    'recent-documents',
    () => documentService.getAllDocuments('', [], 5, 0),
    { keepPreviousData: true }
  )
  
  // Count stats
  const stats = [
    { name: 'Active Cycles', count: 0, icon: ClipboardDocumentCheckIcon, color: 'bg-blue-500', href: '/cycles?status=active' },
    { name: 'Templates', count: 0, icon: ClipboardDocumentListIcon, color: 'bg-purple-500', href: '/templates' },
    { name: 'Documents', count: 0, icon: DocumentTextIcon, color: 'bg-green-500', href: '/documents' },
    { name: 'Users', count: 0, icon: UserGroupIcon, color: 'bg-yellow-500', href: '/users' },
  ]
  
  // Update counts when data is loaded
  useEffect(() => {
    if (activeCycles) {
      stats[0].count = activeCycles.length
    }
    if (templates) {
      stats[1].count = templates.length
    }
    if (documents) {
      stats[2].count = documents.length
    }
  }, [activeCycles, templates, documents])
  
  return (
    <div>
      <div className="py-4">
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome, {currentUser?.full_name}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here's what's happening with your feedback cycles today.
        </p>
      </div>
      
      {/* Stats overview */}
      <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <DashboardWidget key={stat.name} stat={stat} />
        ))}
      </div>
      
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cycles section */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Feedback Cycles</h2>
            <div className="flex space-x-2">
              <button
                className={`px-3 py-1 text-sm rounded-md ${
                  activeStatus === 'active'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setActiveStatus('active')}
              >
                Active
              </button>
              <button
                className={`px-3 py-1 text-sm rounded-md ${
                  activeStatus === 'draft'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setActiveStatus('draft')}
              >
                Drafts
              </button>
              <button
                className={`px-3 py-1 text-sm rounded-md ${
                  activeStatus === 'completed'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setActiveStatus('completed')}
              >
                Completed
              </button>
            </div>
          </div>
          
          {isLoadingCycles ? (
            <LoadingSpinner />
          ) : cyclesError ? (
            <div className="text-center py-4 text-red-500">Error loading cycles</div>
          ) : activeCycles && activeCycles.length > 0 ? (
            <FeedbackCycleList cycles={activeCycles} />
          ) : (
            <div className="text-center py-4 text-gray-500">
              No {activeStatus} cycles found.
              <div className="mt-2">
                <Link to="/cycles/create" className="btn-primary">
                  Create New Cycle
                </Link>
              </div>
            </div>
          )}
          
          <div className="mt-4 text-right">
            <Link to="/cycles" className="text-sm font-medium text-primary-600 hover:text-primary-700">
              View all cycles →
            </Link>
          </div>
        </div>
        
        {/* Summary section */}
        <DashboardSummary
          isLoadingTemplates={isLoadingTemplates}
          isLoadingDocuments={isLoadingDocuments}
          templates={templates}
          documents={documents}
        />
      </div>
    </div>
  )
}