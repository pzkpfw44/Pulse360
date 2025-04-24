import React, { useState, useEffect } from 'react';
import { 
  Users, MessageSquare, FileText, BarChart2, 
  ArrowUpRight, ArrowDownRight, AlertTriangle,
  ArrowRight, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Simple card component that shows raw data
const MetricCard = ({ title, rawData, icon: Icon, isLoading, error }) => {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          {isLoading ? (
            <p className="mt-1 text-2xl font-bold">Loading...</p>
          ) : error ? (
            <div className="mt-1">
              <p className="text-red-500 text-sm">Error loading data</p>
            </div>
          ) : (
            <>
              <p className="mt-1 text-2xl font-bold">{rawData.value}</p>
              {rawData.subtitle && (
                <p className="text-xs text-gray-500 mt-0.5">{rawData.subtitle}</p>
              )}
            </>
          )}
        </div>
        
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

const StatusIndicator = ({ label, status }) => {
  return (
    <div className="flex items-center mb-1">
      <div
        className={`w-2 h-2 rounded-full mr-2 ${
          status === 'active' ? 'bg-green-500' : 'bg-amber-500'
        }`}
      />
      <span className="text-sm">{label}</span>
    </div>
  );
};

const Dashboard = () => {
  // Raw data state
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  // Function to fetch dashboard data
  const fetchDashboardData = async () => {
    setRefreshing(true);
    try {
      // Query the metrics directly using raw SQL via backend
      const response = await axios.get(`${API_URL}/dashboard/raw-stats`);
      console.log('Dashboard data:', response.data);
      setRawData(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Unable to load some metrics. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
    
    // Refresh every 5 minutes
    const refreshInterval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Navigate to campaign details
  const navigateToCampaign = (campaignId) => {
    navigate(`/monitor-360/campaign/${campaignId}`);
  };

  // Navigate based on activity type
  const navigateToActivity = (activity) => {
    if (activity.type === 'template' && activity.id) {
      navigate(`/templates/${activity.id}`);
    } else if (activity.type === 'participants' && activity.campaignId) {
      navigate(`/monitor-360/campaign/${activity.campaignId}`);
    } else if (activity.type === 'report' && activity.campaignId) {
      navigate(`/results-360/campaign/${activity.campaignId}`);
    }
  };

  // Handle manual refresh
  const handleRefresh = () => {
    fetchDashboardData();
  };

  // Calculate last update time
  const getLastUpdateTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500 text-sm">
          Welcome to Pulse360, your AI-assisted 360-degree feedback platform.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-100 text-yellow-700 px-4 py-3 rounded-md mb-6 flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Dashboard Live Overview - More user-friendly message */}
      {!loading && !error && rawData && (
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Last updated:</span> {getLastUpdateTime()}
          </div>
          <button 
            onClick={handleRefresh} 
            className="flex items-center text-blue-600 text-sm hover:text-blue-800"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Updating...' : 'Refresh dashboard'}
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard 
          title="Active Participants" 
          rawData={{
            value: rawData?.participants?.activeCount || '0',
            subtitle: rawData?.participants ? 
              `Across ${rawData.participants.cycleCount} feedback cycles` : 
              'No data available'
          }}
          icon={Users}
          isLoading={loading}
          error={!rawData?.participants}
        />
        
        <MetricCard 
          title="Feedback Responses" 
          rawData={{
            value: rawData?.responses?.count || '0',
            subtitle: rawData?.responses ? 
              `${parseFloat(rawData.responses.completionRate).toFixed(0)}% completion rate` : 
              'No data available'
          }}
          icon={MessageSquare}
          isLoading={loading}
          error={!rawData?.responses}
        />
        
        <MetricCard 
          title="Active Templates" 
          rawData={{
            value: rawData?.templates?.activeCount || '0',
            subtitle: rawData?.templates ? 
              `${rawData.templates.pendingCount} pending approval` : 
              'No data available'
          }}
          icon={FileText}
          isLoading={loading}
          error={!rawData?.templates}
        />
        
        <MetricCard 
          title="Reports Generated" 
          rawData={{
            value: rawData?.reports?.count || '0',
            subtitle: 'Last 30 days'
          }}
          icon={BarChart2}
          isLoading={loading}
          error={!rawData?.reports}
        />
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow p-5 mb-6">
        <h2 className="text-lg font-semibold mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <h3 className="text-sm font-medium mb-2">ContextHub</h3>
            <StatusIndicator status="active" label="Operational" />
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">ControlHub</h3>
            <StatusIndicator status="active" label="Operational" />
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">FeedbackHub</h3>
            <StatusIndicator status="active" label="Operational" />
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">Flux AI Integration</h3>
            <StatusIndicator status="active" label="Operational" />
          </div>
        </div>
      </div>

      {/* Bottom Sections */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-7">
          <div className="bg-white rounded-lg shadow p-5 h-full">
            <h2 className="text-lg font-semibold mb-4">Upcoming Deadlines</h2>
            
            {loading ? (
              <div className="text-center py-2">
                <p className="text-gray-500">Loading deadlines...</p>
              </div>
            ) : !rawData?.deadlines || rawData.deadlines.length === 0 ? (
              <div className="text-center py-2">
                <p className="text-gray-500">No upcoming deadlines found in active campaigns</p>
              </div>
            ) : (
              rawData.deadlines.map((deadline) => (
                <div 
                  key={deadline.id} 
                  className="mb-4 last:mb-0 p-3 border border-transparent hover:border-blue-100 hover:bg-blue-50 rounded-md cursor-pointer transition-colors"
                  onClick={() => navigateToCampaign(deadline.id)}
                >
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-sm font-medium">{deadline.name}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium 
                      ${deadline.priority === 'high' ? 'bg-red-100 text-red-800' : 
                        deadline.priority === 'medium' ? 'bg-blue-100 text-blue-800' : 
                          'bg-green-100 text-green-800'} rounded-full`}>
                      {deadline.priority === 'high' ? 'High Priority' : 
                        deadline.priority === 'medium' ? 'Medium Priority' : 
                          'Upcoming'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">
                      {deadline.daysRemaining && deadline.daysRemaining > 0 ? 
                        `Ends in ${deadline.daysRemaining} day${deadline.daysRemaining !== 1 ? 's' : ''}` : 
                        'End date unknown'}
                    </p>
                    <ArrowRight className="h-4 w-4 text-blue-500" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="md:col-span-5">
          <div className="bg-white rounded-lg shadow p-5 h-full">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            
            {loading ? (
              <div className="text-center py-2">
                <p className="text-gray-500">Loading activities...</p>
              </div>
            ) : !rawData?.activities || rawData.activities.length === 0 ? (
              <div className="text-center py-2">
                <p className="text-gray-500">No recent activity found</p>
              </div>
            ) : (
              rawData.activities.map((activity, index) => (
                <div 
                  key={index} 
                  className="flex mb-4 last:mb-0 p-3 border border-transparent hover:border-blue-100 hover:bg-blue-50 rounded-md cursor-pointer transition-colors"
                  onClick={() => navigateToActivity(activity)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    activity.type === 'report' ? 'bg-blue-100 text-blue-600' :
                    activity.type === 'template' ? 'bg-green-100 text-green-600' :
                    'bg-purple-100 text-purple-600'
                  } mr-3 flex-shrink-0`}>
                    {activity.type === 'report' ? <BarChart2 size={16} /> :
                     activity.type === 'template' ? <FileText size={16} /> :
                     <Users size={16} />}
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-sm font-medium">{activity.title}</h3>
                    <p className="text-sm text-gray-500">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{activity.timeAgo}</p>
                  </div>
                  <div className="self-center">
                    <ArrowRight className="h-4 w-4 text-blue-500" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;