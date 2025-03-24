import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'

// Layouts
import MainLayout from './layouts/MainLayout'
import PublicLayout from './layouts/PublicLayout'
import FeedbackLayout from './layouts/FeedbackLayout'

// Public Pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'

// Protected Pages
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'

// ContextHub Pages
import DocumentsListPage from './pages/contextHub/DocumentsListPage'
import DocumentUploadPage from './pages/contextHub/DocumentUploadPage'
import DocumentViewPage from './pages/contextHub/DocumentViewPage'

// TemplateHub Pages
import TemplatesListPage from './pages/templateHub/TemplatesListPage'
import TemplateCreatePage from './pages/templateHub/TemplateCreatePage'
import TemplateEditPage from './pages/templateHub/TemplateEditPage'
import TemplateViewPage from './pages/templateHub/TemplateViewPage'

// ControlHub Pages
import CyclesListPage from './pages/controlHub/CyclesListPage'
import CycleCreatePage from './pages/controlHub/CycleCreatePage'
import CycleEditPage from './pages/controlHub/CycleEditPage'
import CycleViewPage from './pages/controlHub/CycleViewPage'
import CycleStatusPage from './pages/controlHub/CycleStatusPage'
import CycleReportPage from './pages/controlHub/CycleReportPage'

// FeedbackHub Pages
import FeedbackFormPage from './pages/feedbackHub/FeedbackFormPage'
import FeedbackThankYouPage from './pages/feedbackHub/FeedbackThankYouPage'

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      
      {/* Feedback Routes (Public with token) */}
      <Route element={<FeedbackLayout />}>
        <Route path="/feedback/:token" element={<FeedbackFormPage />} />
        <Route path="/feedback/thank-you" element={<FeedbackThankYouPage />} />
      </Route>
      
      {/* Protected Routes */}
      <Route element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        
        {/* ContextHub Routes */}
        <Route path="/documents" element={<DocumentsListPage />} />
        <Route path="/documents/upload" element={<DocumentUploadPage />} />
        <Route path="/documents/:id" element={<DocumentViewPage />} />
        
        {/* TemplateHub Routes */}
        <Route path="/templates" element={<TemplatesListPage />} />
        <Route path="/templates/create" element={<TemplateCreatePage />} />
        <Route path="/templates/:id" element={<TemplateViewPage />} />
        <Route path="/templates/:id/edit" element={<TemplateEditPage />} />
        
        {/* ControlHub Routes */}
        <Route path="/cycles" element={<CyclesListPage />} />
        <Route path="/cycles/create" element={<CycleCreatePage />} />
        <Route path="/cycles/:id" element={<CycleViewPage />} />
        <Route path="/cycles/:id/edit" element={<CycleEditPage />} />
        <Route path="/cycles/:id/status" element={<CycleStatusPage />} />
        <Route path="/cycles/:id/report" element={<CycleReportPage />} />
      </Route>
      
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App