// frontend/src/pages/Insights360.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  BarChart2, Clock, AlertTriangle, 
  Search, Filter, Plus, RefreshCw, ArrowRight, Eye,
  Lightbulb, Users, Building, FileText, Download
} from 'lucide-react';
import api from '../services/api';
import SelfDevelopmentSection from '../components/insights/SelfDevelopmentSection';
import TeamDevelopmentSection from '../components/insights/TeamDevelopmentSection';
import OrganizationWideSection from '../components/insights/OrganizationWideSection';

const Insights360 = () => {
  const navigate = useNavigate();
  const { section } = useParams();
  const [activeSection, setActiveSection] = useState(section || 'self');
  const [availableSections, setAvailableSections] = useState({
    self: true,      // Initially only Self Development is active
    team: false,     // Prepared for future activation
    organization: false // Prepared for future activation
  });
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAvailableCampaigns();
  }, []);

  useEffect(() => {
    // Update active section if provided in URL
    if (section) {
      setActiveSection(section);
    }
  }, [section]);

  const fetchAvailableCampaigns = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      const response = await api.get('/insights/campaigns');
      setCampaigns(response.data.campaigns || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching campaigns for insights:', err);
      setError('Failed to load available campaigns. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    navigate(`/insights-360/${section}`);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Insights 360</h1>
          <p className="text-sm text-gray-500">
            Analyze feedback data and generate actionable insights
          </p>
        </div>
        
        <button
          onClick={fetchAvailableCampaigns}
          className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Section Navigation */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => handleSectionChange('self')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeSection === 'self'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Lightbulb className="h-5 w-5 mr-2" />
                Self Development
              </div>
            </button>
            
            <button
              onClick={() => handleSectionChange('team')}
              disabled={!availableSections.team}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                !availableSections.team
                  ? 'border-transparent text-gray-400 cursor-not-allowed'
                  : activeSection === 'team'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              title={!availableSections.team ? 'Coming Soon' : ''}
            >
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Team Development
                {!availableSections.team && (
                  <span className="ml-2 bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                    Coming Soon
                  </span>
                )}
              </div>
            </button>
            
            <button
              onClick={() => handleSectionChange('organization')}
              disabled={!availableSections.organization}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                !availableSections.organization
                  ? 'border-transparent text-gray-400 cursor-not-allowed'
                  : activeSection === 'organization'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              title={!availableSections.organization ? 'Coming Soon' : ''}
            >
              <div className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Organization-Wide
                {!availableSections.organization && (
                  <span className="ml-2 bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                    Coming Soon
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p>{error}</p>
          <button
            className="text-red-700 underline mt-1"
            onClick={fetchAvailableCampaigns}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Active Section Content */}
      <div className="insights-content">
        {activeSection === 'self' && (
          <SelfDevelopmentSection 
            campaigns={campaigns}
            loading={loading}
            onRefresh={fetchAvailableCampaigns}
          />
        )}
        
        {activeSection === 'team' && (
          <TeamDevelopmentSection />
        )}
        
        {activeSection === 'organization' && (
          <OrganizationWideSection />
        )}
      </div>
    </div>
  );
};

export default Insights360;