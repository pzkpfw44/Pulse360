// frontend/src/App.jsx

import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'; // Import Outlet, useLocation
import api from "./services/api";

// Layouts
import { MainLayout } from './components/layout/MainLayout';
import { ExternalLayout } from './components/layout/ExternalLayout'; // Import ExternalLayout

// Pages (Import necessary pages)
import Dashboard from './pages/Dashboard';
import ContextHub from './pages/ContextHub';
import TemplateList from './components/contexthub/TemplateList'; // Assuming this is the main page?
import CommunicationTemplates from './pages/CommunicationTemplates';
import CampaignCreate from './pages/CampaignCreate';
import CampaignMonitoringDashboard from './pages/CampaignMonitoringDashboard';
import CampaignDetailMonitoring from './pages/CampaignDetailMonitoring';
import CampaignView from './pages/CampaignView';
import Settings from './pages/Settings';
import Integration from './pages/Integration';
import FeedbackAssessmentPage from './pages/FeedbackAssessmentPage';
import Results360 from './pages/Results360';
import Insights360 from './pages/Insights360';
import InsightViewPage from './pages/InsightViewPage';
// Remove TemplateReview import if not used directly in routes below


// --- Helper Component to Determine Layout ---
// This approach renders the correct layout based on the route path.
const LayoutDecider = () => {
    const location = useLocation();
    // Define paths that should use the ExternalLayout
    const externalPaths = ['/feedback/']; // Match base path for feedback tokens

    const useExternalLayout = externalPaths.some(path => location.pathname.startsWith(path));

    // Render the appropriate layout wrapping the Outlet (which renders the matched child route)
    return useExternalLayout ? <ExternalLayout><Outlet /></ExternalLayout> : <MainLayout><Outlet /></MainLayout>;
};


function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check API connection
    const checkApiStatus = async () => {
      try {
        await api.get('/health'); // Assuming a health check endpoint exists
        setLoading(false);
      } catch (err) {
        console.error('API connection error:', err);
        setError('Failed to connect to the server. Please ensure it is running and accessible.');
        setLoading(false);
      }
    };
    checkApiStatus();
  }, []);


  // --- Loading and Error States ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-muted">
        {/* Use themed colors if available, fallback if not */}
        <div style={{borderColor: '#E5E7EB', borderTopColor: '#3B82F6'}} className="w-12 h-12 border-4 rounded-full animate-spin"></div>
        <p style={{color: '#6B7280'}} className="mt-4">Loading Pulse360...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-muted p-4">
        <div className="max-w-md w-full bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded relative text-center" role="alert">
          <strong className="font-bold block mb-1">Connection Error</strong>
          <span className="block sm:inline">{error}</span>
        </div>
         <button
            onClick={() => window.location.reload()}
            style={{backgroundColor: '#2563EB', color: 'white'}} // Fallback button style
            className="mt-4 px-4 py-2 rounded-md shadow-sm transition-colors hover:opacity-90"
          >
            Retry
          </button>
      </div>
    );
  }

  // --- Main Application Routes ---
  return (
    <Routes>
        {/* Use LayoutDecider as the parent route for all authenticated/main app routes */}
        <Route element={<LayoutDecider />}>
            {/* Routes using MainLayout or ExternalLayout based on path */}
            <Route path="/" element={<Dashboard />} />

            {/* ContextHub */}
            <Route path="/contexthub" element={<ContextHub />} />
            {/* Removed TemplateReview route - assuming it's part of ContextHub or TemplateList */}
            <Route path="/templates" element={<TemplateList />} />
            <Route path="/communication-templates" element={<CommunicationTemplates />} />

            {/* ControlHub */}
            <Route path="/start-360" element={<CampaignCreate />} />
            <Route path="/campaign/edit/:id" element={<CampaignCreate />} />
            <Route path="/campaign/view/:id" element={<CampaignView />} />
            <Route path="/monitor-360" element={<CampaignMonitoringDashboard />} />
            <Route path="/monitor-360/campaign/:id" element={<CampaignDetailMonitoring />} />

            {/* FeedbackHub - Uses ExternalLayout via LayoutDecider */}
            <Route path="/feedback/:token" element={<FeedbackAssessmentPage />} />
            {/* Keep specific /feedback/assessment route if needed, it will use MainLayout */}
            {/* <Route path="/feedback/assessment" element={<FeedbackAssessmentPage />} /> */}
            {/* <Route path="/feedback/assessment/:token" element={<FeedbackAssessmentPage />} /> */}


            {/* Results and Insights */}
            <Route path="/results-360" element={<Results360 />} />
            <Route path="/results-360/campaign/:campaignId" element={<Results360 />} />
            <Route path="/insights-360" element={<Insights360 />} />
            {/* <Route path="/insights-360/:section" element={<Insights360 />} /> // Simplified routes? */}
            <Route path="/insights-360/view/:id" element={<InsightViewPage />} />

            {/* System */}
            <Route path="/integration" element={<Integration />} />
            <Route path="/settings" element={<Settings />} />

            {/* Fallback Redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
    </Routes>
  );
}

export default App;