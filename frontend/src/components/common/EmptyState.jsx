import { Link } from 'react-router-dom'
import {
  DocumentIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'

export default function EmptyState({
  title,
  description,
  buttonText,
  buttonLink,
  icon = 'document'
}) {
  // Map of possible icons
  const icons = {
    document: DocumentIcon,
    documentText: DocumentTextIcon,
    template: ClipboardDocumentListIcon,
    cycle: ClipboardDocumentCheckIcon,
    user: UserGroupIcon
  }
  
  // Get the appropriate icon component
  const IconComponent = icons[icon] || DocumentIcon
  
  return (
    <div className="bg-white shadow rounded-lg flex flex-col items-center justify-center p-12 text-center">
      <div className="mx-auto h-12 w-12 text-gray-400">
        <IconComponent className="h-full w-full" />
      </div>
      <h3 className="mt-4 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
      {buttonText && buttonLink && (
        <div className="mt-6">
          <Link to={buttonLink} className="btn-primary">
            {buttonText}
          </Link>
        </div>
      )}
    </div>
  )
}