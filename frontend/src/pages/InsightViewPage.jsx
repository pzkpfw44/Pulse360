// frontend/src/pages/InsightViewPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import api from '../services/api';
import InsightView from '../components/insights/InsightView';

const InsightViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('employeeVisible');
  
  useEffect(() => {
    fetchInsight();
  }, [id]);
  
  const fetchInsight = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/insights/${id}`);
      setInsight(response.data.insight);
      setError(null);
    } catch (err) {
      console.error('Error fetching insight:', err);
      setError('Failed to load insight. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateContent = async () => {
    try {
      setLoading(true);
      await api.post(`/insights/${id}/regenerate`);
      await fetchInsight();
    } catch (err) {
      console.error('Error regenerating content:', err);
      setError('Failed to regenerate content. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md text-red-700">
        {error}
        <button 
          className="ml-4 text-blue-500 underline"
          onClick={fetchInsight}
        >
          Retry
        </button>
      </div>
    );
  }
  
  if (!insight) {
    return <div>No insight data found</div>;
  }

  // Check if any content exists for the active tab
  const hasVisibleContent = () => {
    if (!insight || !insight.content) return false;
    
    const contentEntries = Object.entries(insight.content);
    return contentEntries.some(([_, data]) => {
      const visibility = data?.visibility || 'employeeVisible';
      if (activeTab === 'hrOnly') return true; // HR sees everything
      if (activeTab === 'managerOnly') return visibility !== 'hrOnly';
      if (activeTab === 'employeeVisible') return visibility === 'employeeVisible';
      return false;
    });
  };
  
  // Show regenerate button if no content for this view
  if (!hasVisibleContent()) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">No content available for this view level.</p>
        <p className="text-sm text-gray-400 mb-4">Try regenerating the content or switching to a different view.</p>
        <button
          onClick={handleRegenerateContent}
          className="px-4 py-2 bg-purple-600 text-white rounded-md flex items-center justify-center mx-auto"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Regenerate Content
        </button>
      </div>
    );
  }
  
  // FIXED: Rendering the InsightView component instead of returning null
  return <InsightView insight={insight} loading={loading} error={error} onRefresh={fetchInsight} />;
};

export default InsightViewPage;