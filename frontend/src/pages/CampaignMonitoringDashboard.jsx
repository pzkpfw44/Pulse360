// frontend/src/pages/CampaignMonitoringDashboard.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2, Clock, CheckCircle2, AlertTriangle,
  Search, Filter, Plus, RefreshCw, ArrowRight, Eye, Delete,
} from 'lucide-react';
import api from '../services/api';

const CampaignMonitoringDashboard = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false); // State for delete dialog
  const [campaignToDelete, setCampaignToDelete] = useState(null); // State for campaign to delete

  // Fetch all campaigns
  const fetchCampaigns = async () => {
    try {
      setRefreshing(true);
      const response = await api.get('/campaigns');

      // Process campaigns to ensure completion rates are accurate
      const processedCampaigns = (response.data.campaigns || []).map(campaign => {
        // If campaign has participants, ensure completion rate is correctly calculated
        if (campaign.participants && campaign.participants.length > 0) {
          const totalParticipants = campaign.participants.length;
          const completedParticipants = campaign.participants.filter(p => p.status === 'completed').length;

          // Calculate actual completion rate
          const calculatedRate = totalParticipants > 0
            ? Math.round((completedParticipants / totalParticipants) * 100)
            : 0;

          // Update the completion rate if it's different
          if (calculatedRate !== campaign.completionRate) {
            console.log(`Fixing completion rate for ${campaign.name}: ${campaign.completionRate}% → ${calculatedRate}%`);
            campaign.completionRate = calculatedRate;
          }
        }

        return campaign;
      });

      setCampaigns(processedCampaigns);
      setError(null);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Failed to load campaigns. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Filter and search campaigns
  const filteredCampaigns = campaigns
    .filter(campaign => {
      // Filter by status
      if (filterStatus && campaign.status !== filterStatus) return false;

      // Search by name or target employee
      const targetName = campaign.targetEmployee
        ? `${campaign.targetEmployee.firstName} ${campaign.targetEmployee.lastName}`.toLowerCase()
        : '';

      return (
        !searchTerm ||
        campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        targetName.includes(searchTerm.toLowerCase())
      );
    })
    .sort((a, b) => {
      // Sort by status priority then by date
      const statusPriority = {
        'active': 1,
        'draft': 2,
        'paused': 3,
        'completed': 4,
        'canceled': 5
      };

      if (statusPriority[a.status] !== statusPriority[b.status]) {
        return statusPriority[a.status] - statusPriority[b.status];
      }

      // Then sort by date (newest first)
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

  // Calculate campaign metrics
  const getMetrics = () => {
    const metrics = {
      total: campaigns.length,
      active: campaigns.filter(c => c.status === 'active').length,
      draft: campaigns.filter(c => c.status === 'draft').length,
      completed: campaigns.filter(c => c.status === 'completed').length,
      needsAttention: campaigns.filter(c => {
        if (c.status !== 'active') return false;

        // Calculate days until deadline
        const endDate = new Date(c.endDate);
        const now = new Date();
        const daysUntilDeadline = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

        // Only include campaigns that are:
        // 1. Within 4 days of deadline
        // 2. AND have low completion rate (less than 70%)
        return daysUntilDeadline <= 4 && daysUntilDeadline >= 0 && c.completionRate < 70;
      }).length
    };

    return metrics;
  };

  const metrics = getMetrics();

  // Get status badge for campaign
  const getStatusBadge = (status) => {
    const statusConfig = {
      'draft': { color: 'bg-gray-100 text-gray-800', icon: <Clock className="h-3 w-3" />, label: 'Draft' },
      'active': { color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Active' },
      'paused': { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" />, label: 'Paused' },
      'completed': { color: 'bg-blue-100 text-blue-800', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Completed' },
      'canceled': { color: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-3 w-3" />, label: 'Canceled' }
    };

    const config = statusConfig[status] || statusConfig.draft;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  // Calculate days remaining or status
  const getTimeStatus = (campaign) => {
    if (campaign.status !== 'active') {
      return null;
    }
    
    const endDate = new Date(campaign.endDate);
    const now = new Date();
    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining < 0) {
      return { value: 'Overdue', class: 'text-white bg-red-600 px-2 py-0.5 rounded font-medium' };
    } else if (daysRemaining === 0) {
      return { value: 'Due today', class: 'text-white bg-orange-500 px-2 py-0.5 rounded font-medium' };
    } else if (daysRemaining === 1) {
      return { value: `1 day left`, class: 'text-yellow-800 bg-yellow-200 px-2 py-0.5 rounded font-medium' };
    } else if (daysRemaining <= 3) {
      return { value: `${daysRemaining} days left`, class: 'text-yellow-800 bg-yellow-100 px-2 py-0.5 rounded' };
    } else if (daysRemaining <= 7) {
      return { value: `${daysRemaining} days left`, class: 'text-yellow-700' };
    } else {
      return { value: `${daysRemaining} days left`, class: 'text-green-600' };
    }
  };

  // View campaign details
  const viewCampaign = (id) => {
    navigate(`/monitor-360/campaign/${id}`);
  };

  // Handle delete click - Sets the campaign to be deleted and opens the dialog
  const handleDeleteClick = (campaign) => {
    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  };

  // Handle delete confirmation - Calls the API to delete the campaign
  const handleDeleteConfirm = async () => {
    if (!campaignToDelete) return;

    try {
      await api.delete(`/campaigns/${campaignToDelete.id}`);
      // Refresh the campaigns list after successful deletion
      fetchCampaigns();
      setDeleteDialogOpen(false); // Close the dialog
      setCampaignToDelete(null); // Reset the campaign to delete
    } catch (err) {
      console.error('Error deleting campaign:', err);
      setError('Failed to delete campaign. Please try again.');
      // Optionally keep the dialog open or provide feedback within the dialog
    }
  };

  // Render loading state
  if (loading && !refreshing) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading campaigns...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Campaign Monitoring</h1>
          <p className="text-sm text-gray-500">
            Monitor and manage your 360-degree feedback campaigns
          </p>
        </div>

        <button
          onClick={() => navigate('/start-360')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* ... (Metrics Cards content remains the same) ... */}
         <div className="bg-white rounded-lg shadow p-5">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Campaigns</p>
              <p className="mt-1 text-2xl font-bold">{metrics.active}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Draft Campaigns</p>
              <p className="mt-1 text-2xl font-bold">{metrics.draft}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="mt-1 text-2xl font-bold">{metrics.completed}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <BarChart2 size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">Needs Attention</p>
              <p className="mt-1 text-2xl font-bold">{metrics.needsAttention}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-5 flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="w-full md:w-48">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-gray-400" />
              </div>
              <select
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
          </div>

          <button
            onClick={fetchCampaigns}
            className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p>{error}</p>
          <button
            className="text-red-700 underline mt-1"
            onClick={fetchCampaigns}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Campaign List */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <BarChart2 size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Campaigns Found</h3>
          <p className="text-gray-500 mb-4">
            {campaigns.length === 0
              ? "You haven't created any campaigns yet."
              : "No campaigns match your current search or filter."}
          </p>
          {campaigns.length === 0 && (
            <button
              onClick={() => navigate('/start-360')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target Employee
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timeline
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completion
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCampaigns.map((campaign) => {
                  const timeStatus = getTimeStatus(campaign);

                  return (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {campaign.status === 'active' && campaign.completionRate < 50 && (
                            <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                            <div className="text-sm text-gray-500">
                              {campaign.template ? campaign.template.name : 'No template'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {campaign.targetEmployee ? (
                          <div className="text-sm text-gray-900">
                            {campaign.targetEmployee.firstName} {campaign.targetEmployee.lastName}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Not assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(campaign.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                        </div>
                        {timeStatus && (
                          <div className={`text-xs ${timeStatus.class}`}>
                            {timeStatus.value}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {campaign.status === 'active' ? (
                          <div>
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-900 mr-2">
                                {campaign.completionRate}%
                              </span>
                              <div className="w-24 bg-gray-200 rounded-full h-2.5">
                                <div
                                  className={`h-2.5 rounded-full ${
                                    campaign.completionRate >= 80
                                      ? 'bg-green-600'
                                      : campaign.completionRate >= 50
                                      ? 'bg-blue-600'
                                      : 'bg-yellow-500'
                                  }`}
                                  style={{ width: `${campaign.completionRate}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">
                            {campaign.status === 'completed' ? '100%' : '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center justify-end space-x-3">
                        <button
                          onClick={() => viewCampaign(campaign.id)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </button>

                        {campaign.status === 'completed' && (
                          <button
                            onClick={() => navigate(`/results-360/campaign/${campaign.id}`)}
                            className="text-green-600 hover:text-green-900 flex items-center"
                          >
                            <BarChart2 className="h-4 w-4 mr-1" />
                            Results
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteClick(campaign)}
                          className="text-red-600 hover:text-red-900 ml-2" 
                          title="Delete Campaign"
                        >
                          <Delete className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* --- INSERTED DELETE CONFIRMATION DIALOG CODE --- */}
      {deleteDialogOpen && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setDeleteDialogOpen(false)}></div>
          {/* Dialog Box */}
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
              {/* Dialog Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Delete Campaign</h3>
              </div>
              {/* Dialog Body */}
              <div className="px-6 py-4">
                <p className="text-gray-700">
                  Are you sure you want to delete "{campaignToDelete?.name}"? This action cannot be undone.
                </p>
              </div>
              {/* Dialog Footer */}
              <div className="px-6 py-3 bg-gray-50 flex justify-end space-x-3">
                {/* Cancel Button */}
                <button
                  onClick={() => setDeleteDialogOpen(false)} // Closes the dialog
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium text-gray-700"
                >
                  Cancel
                </button>
                {/* Delete Button */}
                <button
                  onClick={handleDeleteConfirm} // Calls the delete confirmation handler
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      {/* --- END OF INSERTED CODE --- */}
    </div>
  );
};

export default CampaignMonitoringDashboard;