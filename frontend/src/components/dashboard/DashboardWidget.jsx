import { Link } from 'react-router-dom'

export default function DashboardWidget({ stat }) {
  return (
    <Link
      to={stat.href}
      className="bg-white overflow-hidden shadow rounded-lg transition-transform hover:transform hover:scale-105"
    >
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 rounded-md p-3 ${stat.color}`}>
            <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">{stat.count}</div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-5 py-3">
        <div className="text-sm">
          <div className="font-medium text-primary-600 hover:text-primary-700 inline-flex items-center">
            View all
            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  )
}