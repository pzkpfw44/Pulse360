// frontend/src/components/insights/SelfDevelopmentSection.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Plus, ArrowRight, Eye, 
  Lightbulb, FileText, Download, BarChart2, RefreshCw,
  Clock, CheckCircle2, AlertTriangle, User
} from 'lucide-react';
import api from '../../services/api';
import InsightGenerateModal from './InsightGenerateModal';
import InsightCard from './InsightCard';

const SelfDevelopmentSection = ({ campaigns, loading, onRefresh }) => {
  const navigate = useNavigate();
  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  
  useEffect(() => {
    fetchUserInsights();
  }, []);
  
  const fetchUserInsights = async () => {
    try {
      setInsightsLoading(true);
      const response = await api.get('/insights');
      
      // Filter to just self development insights
      const selfInsights = response.data.insights.filter(
        insight => ['growth_blueprint', 'leadership_impact'].includes(insight.type)
      );
      
      setInsights(selfInsights);
      setInsightsError(null);
    } catch (err) {
      console.error('Error fetching insights:', err);
      setInsightsError('Failed to load insights. Please try again.');
    } finally {
      setInsightsLoading(false);
    }
  };
  
  const handleOpenGenerateModal = () => {
    setShowGenerateModal(true);
  };
  
  const handleCloseGenerateModal = () => {
    setShowGenerateModal(false);
  };
  
  const handleGenerateSuccess = () => {
    fetchUserInsights();
    handleCloseGenerateModal();
  };
  
  const handleViewInsight = (id) => {
    navigate(`/insights-360/view/${id}`);
  };
  
  // ADD THIS FUNCTION - Handle deleting insights
  const handleDeleteInsight = async (insightId) => {
    try {
      const updatedInsights = insights.filter(insight => insight.id !== insightId);
      setInsights(updatedInsights);
    } catch (err) {
      console.error('Error deleting insight:', err);
      setInsightsError('Failed to delete insight. Please try again.');
    }
  };
  
  const filteredInsights = insights.filter(insight => {
    if (!searchTerm) return true;
    
    const searchTermLower = searchTerm.toLowerCase();
    return (
      insight.title.toLowerCase().includes(searchTermLower) ||
      (insight.targetEmployee && 
        `${insight.targetEmployee.firstName} ${insight.targetEmployee.lastName}`.toLowerCase().includes(searchTermLower)
      )
    );
  });
  
  // Check if there are campaigns with enough data for insights
  const hasCampaignsWithData = campaigns.some(campaign => 
    campaign.completionRate > 0 && campaign.targetEmployee
  );
  
  // Define the report types
  const reportTypes = [
    {
      id: 'growth_blueprint',
      title: 'Your Growth Blueprint',
      description: 'Transforms feedback data into a personalized development roadmap highlighting strengths, opportunities, and specific growth actions.',
      enabled: true
    },
    {
      id: 'leadership_impact',
      title: 'Leadership Impact Navigator',
      description: 'Evaluates leadership style and effectiveness against your company\'s leadership model, revealing how leaders influence team performance.',
      enabled: false // This will be enabled in a future update
    }
  ];
  
  return (
    <div>
      {/* Introduction Panel */}
      <div className="bg-white rounded-lg shadow mb-6 p-5">
        <div className="flex items-start">
          <div className="flex-shrink-0 rounded-full p-2 bg-blue-100">
            <Lightbulb className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <h2 className="text-lg font-semibold">Self Development Insights</h2>
            <p className="text-gray-600 mt-1">
              Leverage AI to transform feedback into personalized development insights and growth plans.
              Select a campaign to generate insights for an individual's development journey.
            </p>
          </div>
        </div>
      </div>
      
      {/* Search and Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Search insights..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button
          onClick={handleOpenGenerateModal}
          disabled={!hasCampaignsWithData}
          className={`inline-flex items-center px-4 py-2 rounded-md ${
            hasCampaignsWithData
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          title={!hasCampaignsWithData ? 'No campaigns with feedback data available' : ''}
        >
          <Plus className="h-5 w-5 mr-2" />
          Generate New Insight
        </button>
      </div>
      
      {/* Report Type Cards */}
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4">Available Report Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportTypes.map((report) => (
            <div
              key={report.id}
              className={`bg-white rounded-lg shadow p-4 border-l-4 ${
                report.enabled
                  ? 'border-blue-500 hover:shadow-md transition-shadow cursor-pointer'
                  : 'border-gray-300 opacity-75'
              }`}
              onClick={() => report.enabled && handleOpenGenerateModal()}
            >
              <div className="flex items-start">
                <div className={`flex-shrink-0 rounded-full p-2 ${
                  report.enabled ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <Lightbulb className={`h-5 w-5 ${
                    report.enabled ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                </div>
                <div className="ml-4">
                  <div className="flex items-center">
                    <h4 className="font-medium">{report.title}</h4>
                    {!report.enabled && (
                      <span className="ml-2 bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {report.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Generated Insights List */}
      <div>
        <h3 className="text-lg font-medium mb-4">Your Generated Insights</h3>
        
        {insightsLoading ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg shadow">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading insights...</p>
          </div>
        ) : insightsError ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p>{insightsError}</p>
            <button
              className="text-red-700 underline mt-1"
              onClick={fetchUserInsights}
            >
              Try Again
            </button>
          </div>
        ) : filteredInsights.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Insights Generated Yet</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm
                ? "No insights match your search criteria."
                : "Generate your first insight to get started with development planning."}
            </p>
            {!searchTerm && hasCampaignsWithData && (
              <button
                onClick={handleOpenGenerateModal}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Generate First Insight
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredInsights.map((insight) => (
              <InsightCard 
                key={insight.id}
                insight={insight}
                onView={() => handleViewInsight(insight.id)}
                onDelete={handleDeleteInsight}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Generate Modal */}
      <InsightGenerateModal
        isOpen={showGenerateModal}
        onClose={handleCloseGenerateModal}
        onSuccess={handleGenerateSuccess}
        campaigns={campaigns}
        reportTypes={reportTypes.filter(r => r.enabled)}
      />
    </div>
  );
};

export default SelfDevelopmentSection;