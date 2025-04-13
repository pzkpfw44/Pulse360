// frontend/src/App.jsx

import React, { useState, useEffect } from "react";
import api from "./services/api";
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ContextHub from './pages/ContextHub';
import TemplateReview from './components/contexthub/TemplateReview';
import TemplateList from './components/contexthub/TemplateList';
import CommunicationTemplates from './pages/CommunicationTemplates';
import CampaignCreate from './pages/CampaignCreate';
import CampaignMonitoringDashboard from './pages/CampaignMonitoringDashboard';
import CampaignDetailMonitoring from './pages/CampaignDetailMonitoring';
import CampaignList from './components/campaigns/CampaignList';
import CampaignView from './pages/CampaignView';
import Settings from './pages/Settings';
import Integration from './pages/Integration';
import { MainLayout } from './components/layout/MainLayout';
import WorkInProgress from './components/WorkInProgress';
import FeedbackAssessmentPage from './pages/FeedbackAssessmentPage';

// External routes that don't use MainLayout
const ExternalFeedbackRoute = ({ children }) => {
  // Check if the path includes feedback token routes
  const path = window.location.pathname;
  const isExternalFeedback = path.startsWith('/feedback/') && path !== '/feedback/assessment';
  
  if (isExternalFeedback) {
    return children;
  }
  
  // Use MainLayout for internal routes
  return <MainLayout>{children}</MainLayout>;
};

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check API connection
    const checkApiStatus = async () => {
      try {
        await api.get('/health');
        setLoading(false);
      } catch (err) {
        console.error('API connection error:', err);
        setError('Failed to connect to API. Please make sure the backend is running.');
        setLoading(false);
      }
    };

    checkApiStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading Pulse360...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <p className="font-medium">Connection Error</p>
          <p className="text-sm">{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <ExternalFeedbackRoute>
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<Dashboard />} />
        
        {/* ContextHub */}
        <Route path="/contexthub" element={<ContextHub />} />
        <Route path="/contexthub/templates/:id" element={<TemplateReview />} />
        <Route path="/templates" element={<TemplateList />} />
        <Route path="/communication-templates" element={<CommunicationTemplates />} />
        
        {/* ControlHub */}
        <Route path="/start-360" element={<CampaignCreate />} />
        <Route path="/campaign/edit/:id" element={<CampaignCreate />} />
        <Route path="/campaign/view/:id" element={<CampaignView />} />
        <Route path="/monitor-360" element={<CampaignMonitoringDashboard />} />
        <Route path="/monitor-360/campaign/:id" element={<CampaignDetailMonitoring />} />
        
        {/* FeedbackHub */}
        <Route path="/results-360" element={<WorkInProgress title="Results 360" />} />
        <Route path="/insights-360" element={<WorkInProgress title="Insights 360" />} />
        <Route path="/feedback/:token" element={<FeedbackAssessmentPage />} />
        <Route path="/feedback/assessment" element={<FeedbackAssessmentPage />} />
        <Route path="/feedback/assessment/:token" element={<FeedbackAssessmentPage />} />
        
        {/* System */}
        <Route path="/integration" element={<Integration />} />
        <Route path="/settings" element={<Settings />} />
        
        {/* Redirect any unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ExternalFeedbackRoute>
  );
}

export default App;