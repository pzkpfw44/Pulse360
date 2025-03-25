import { Outlet } from 'react-router-dom'

export default function FeedbackLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center">
          <img className="h-8 w-auto" src="/logo.svg" alt="Pulse360" />
          <span className="ml-2 text-xl font-semibold text-primary-700">Pulse360</span>
        </div>
      </header>
      
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <Outlet />
          </div>
        </div>
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col items-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Pulse360. All rights reserved.</p>
          <p className="mt-1">Thank you for participating in the 360-degree feedback process.</p>
        </div>
      </footer>
    </div>
  )
}