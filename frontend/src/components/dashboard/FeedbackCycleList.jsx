import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  DocumentIcon,
  UserIcon,
  ChartBarIcon,
  PencilIcon
} from '@heroicons/react/24/outline'

// Status badge component
const StatusBadge = ({ status }) => {
  let color = ''
  switch (status) {
    case 'draft':
      color = 'bg-gray-100 text-gray-800'
      break
    case 'active':
      color = 'bg-green-100 text-green-800'
      break
    case 'completed':
      color = 'bg-blue-100 text-blue-800'
      break
    case 'archived':
      color = 'bg-gray-100 text-gray-800'
      break
    default:
      color = 'bg-gray-100 text-gray-800'
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function FeedbackCycleList({ cycles }) {
  return (
    <ul className="divide-y divide-gray-200">
      {cycles.map((cycle) => {
        // Parse the dates
        const createdDate = new Date(cycle.created_at)
        
        // Calculate completion rate
        const completionRate = cycle.analytics?.completion_rate || 0
        const completionColor = 
          completionRate < 25 ? 'text-red-500' :
          completionRate < 50 ? 'text-yellow-500' :
          completionRate < 75 ? 'text-blue-500' :
          'text-green-500'
        
        return (
          <li key={cycle.id} className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <Link 
                  to={`/cycles/${cycle.id}`}
                  className="text-lg font-medium text-primary-600 hover:text-primary-700"
                >
                  {cycle.title}
                </Link>
                <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                  <StatusBadge status={cycle.status} />
                  <span>{format(createdDate, 'MMM d, yyyy')}</span>
                  <span className={`font-semibold ${completionColor}`}>
                    {completionRate}% complete
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Link
                  to={`/cycles/${cycle.id}`}
                  className="inline-flex items-center p-2 text-sm font-medium text-gray-700 bg-white rounded-md hover:bg-gray-50"
                  title="View details"
                >
                  <DocumentIcon className="w-5 h-5" />
                </Link>
                
                <Link
                  to={`/cycles/${cycle.id}/status`}
                  className="inline-flex items-center p-2 text-sm font-medium text-gray-700 bg-white rounded-md hover:bg-gray-50"
                  title="View status"
                >
                  <UserIcon className="w-5 h-5" />
                </Link>
                
                {cycle.status === 'completed' && (
                  <Link
                    to={`/cycles/${cycle.id}/report`}
                    className="inline-flex items-center p-2 text-sm font-medium text-gray-700 bg-white rounded-md hover:bg-gray-50"
                    title="View report"
                  >
                    <ChartBarIcon className="w-5 h-5" />
                  </Link>
                )}
                
                {cycle.status === 'draft' && (
                  <Link
                    to={`/cycles/${cycle.id}/edit`}
                    className="inline-flex items-center p-2 text-sm font-medium text-gray-700 bg-white rounded-md hover:bg-gray-50"
                    title="Edit cycle"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </Link>
                )}
              </div>
            </div>
            
            {cycle.analytics && (
              <div className="mt-2 flex space-x-4 text-xs text-gray-500">
                <div>
                  <span className="font-medium">{cycle.analytics.total_evaluators}</span> evaluators
                </div>
                <div>
                  <span className="font-medium">{cycle.analytics.completed_count}</span> completed
                </div>
                <div>
                  <span className="font-medium">{cycle.analytics.pending_count}</span> pending
                </div>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}