// frontend/src/components/campaigns/CampaignList.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Edit, 
  Eye, 
  Clock, 
  Check, 
  AlertTriangle, 
  Delete,
  Play,
  Plus
} from 'lucide-react';
import api from '../../services/api';

const CampaignList = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await api.get('/campaigns');
      
      if (response.data && response.data.campaigns) {
        setCampaigns(response.data.campaigns);
      } else {
        setCampaigns([]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Failed to load campaigns. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCampaign = (id) => {
    navigate(`/campaign/edit/${id}`);
  };

  const handleViewCampaign = (id) => {
    navigate(`/campaign/view/${id}`);
  };

  const handleDeleteClick = (campaign) => {
    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!campaignToDelete) return;

    try {
      await api.delete(`/campaigns/${campaignToDelete.id}`);
      setCampaigns(campaigns.filter(c => c.id !== campaignToDelete.id));
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
    } catch (err) {
      console.error('Error deleting campaign:', err);
      setError('Failed to delete campaign. Please try again later.');
    }
  };

  const handleLaunchCampaign = async (id) => {
    try {
      await api.post(`/campaigns/${id}/launch`);
      fetchCampaigns(); // Refresh the list
    } catch (err) {
      console.error('Error launching campaign:', err);
      setError('Failed to launch campaign. Please ensure all required fields are filled.');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: <FileText className="h-3 w-3" />, label: 'Draft' },
      active: { color: 'bg-green-100 text-green-800', icon: <Play className="h-3 w-3" />, label: 'Active' },
      paused: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" />, label: 'Paused' },
      completed: { color: 'bg-blue-100 text-blue-800', icon: <Check className="h-3 w-3" />, label: 'Completed' },
      canceled: { color: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-3 w-3" />, label: 'Canceled' },
    };

    const config = statusConfig[status] || statusConfig.draft;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading campaigns...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Monitor 360 Feedback</h1>
          <p className="text-sm text-gray-500">
            Manage and track your 360-degree feedback campaigns
          </p>
        </div>
        
        <button
          onClick={() => navigate('/start-360')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Campaign
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <p>{error}</p>
          <button 
            className="text-red-700 underline ml-2"
            onClick={fetchCampaigns}
          >
            Retry
          </button>
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Campaigns Found
          </h3>
          <p className="text-gray-500 mb-4">
            Create a new 360-degree feedback campaign to get started.
          </p>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            onClick={() => navigate('/start-360')}
          >
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Employee</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Template</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timeline</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                      <div className="text-xs text-gray-500">{new Date(campaign.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {campaign.targetEmployee ? 
                          `${campaign.targetEmployee.firstName} ${campaign.targetEmployee.lastName}` 
                          : 'Not selected'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {campaign.targetEmployee ? campaign.targetEmployee.jobTitle || '' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {campaign.template ? campaign.template.name : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(campaign.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-500">
                        {campaign.startDate ? 
                          `${new Date(campaign.startDate).toLocaleDateString()} - ${new Date(campaign.endDate).toLocaleDateString()}`
                          : 'Not scheduled'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full" 
                          style={{ width: `${campaign.completionRate || 0}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {campaign.completionRate || 0}% complete
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {campaign.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleEditCampaign(campaign.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit Campaign"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleLaunchCampaign(campaign.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Launch Campaign"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {campaign.status !== 'draft' && (
                          <button
                            onClick={() => handleViewCampaign(campaign.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Campaign"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        {(campaign.status === 'draft' || campaign.status === 'canceled') && (
                          <button
                            onClick={() => handleDeleteClick(campaign)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Campaign"
                          >
                            <Delete className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setDeleteDialogOpen(false)}></div>
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Delete Campaign</h3>
              </div>
              <div className="px-6 py-4">
                <p className="text-gray-700">
                  Are you sure you want to delete "{campaignToDelete?.name}"? This action cannot be undone.
                </p>
              </div>
              <div className="px-6 py-3 bg-gray-50 flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteDialogOpen(false)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CampaignList;