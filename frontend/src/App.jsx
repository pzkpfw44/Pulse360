import React, { useState, useEffect } from "react";
import api from "./services/api";
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ContextHub from './pages/ContextHub';
import TemplateReview from './components/contexthub/TemplateReview';
import TemplateList from './components/contexthub/TemplateList';
import Settings from './pages/Settings';
import { MainLayout } from './components/layout/MainLayout';
import WorkInProgress from './components/WorkInProgress';

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
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/contexthub" element={<ContextHub />} />
        <Route path="/contexthub/templates/:id" element={<TemplateReview />} />
        <Route path="/templates" element={<TemplateList />} />
        <Route path="/cycles" element={<WorkInProgress title="Feedback Cycles" />} />
        <Route path="/reports" element={<WorkInProgress title="Reports" />} />
        <Route path="/feedback" element={<WorkInProgress title="Provide Feedback" />} />
        <Route path="/team" element={<WorkInProgress title="Team Management" />} />
        <Route path="/integration" element={<WorkInProgress title="Integration" />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}

export default App;