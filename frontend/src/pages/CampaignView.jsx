// frontend/src/pages/CampaignView.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../services/api';

const CampaignView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/campaigns/${id}`);
        setCampaign(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching campaign:', err);
        setError('Failed to load campaign. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCampaign();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading campaign details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <p>{error}</p>
        </div>
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          onClick={() => navigate('/monitor-360')}
        >
          Back to Campaigns
        </button>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-4" role="alert">
          <p>Campaign not found</p>
        </div>
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          onClick={() => navigate('/monitor-360')}
        >
          Back to Campaigns
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center">
        <button
          onClick={() => navigate('/monitor-360')}
          className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          <p className="text-sm text-gray-500">
            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)} Campaign
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium">Campaign Details</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Target Employee</h3>
              <p className="text-base">
                {campaign.targetEmployee ? 
                  `${campaign.targetEmployee.firstName} ${campaign.targetEmployee.lastName}` : 
                  'Not selected'}
              </p>
              {campaign.targetEmployee?.jobTitle && (
                <p className="text-sm text-gray-500">{campaign.targetEmployee.jobTitle}</p>
              )}
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Template Used</h3>
              <p className="text-base">
                {campaign.template ? campaign.template.name : 'Not selected'}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Timeline</h3>
              <p className="text-base">
                {campaign.startDate ? 
                  `${new Date(campaign.startDate).toLocaleDateString()} - ${new Date(campaign.endDate).toLocaleDateString()}` : 
                  'Not scheduled'}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Completion Rate</h3>
              <div className="flex items-center">
                <div className="w-48 bg-gray-200 rounded-full h-2.5 mr-2">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${campaign.completionRate || 0}%` }}
                  ></div>
                </div>
                <span>{campaign.completionRate || 0}%</span>
              </div>
            </div>
          </div>
          
          {campaign.description && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
              <p className="text-base">{campaign.description}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium">Participants</h2>
        </div>
        <div className="p-6">
          {campaign.participants && campaign.participants.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relationship</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invited</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {campaign.participants.map((participant) => (
                    <tr key={participant.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {participant.employee ? 
                          `${participant.employee.firstName} ${participant.employee.lastName}` : 
                          'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {participant.relationshipType.replace('_', ' ').charAt(0).toUpperCase() + 
                          participant.relationshipType.replace('_', ' ').slice(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${participant.status === 'completed' ? 'bg-green-100 text-green-800' : 
                            participant.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            participant.status === 'invited' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'}`}>
                          {participant.status.replace('_', ' ').charAt(0).toUpperCase() + 
                            participant.status.replace('_', ' ').slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {participant.lastInvitedAt ? 
                          new Date(participant.lastInvitedAt).toLocaleDateString() : 
                          'Not yet'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {participant.completedAt ? 
                          new Date(participant.completedAt).toLocaleDateString() : 
                          'Not yet'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No participants added yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignView;