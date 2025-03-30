// frontend/src/pages/CampaignCreate.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import CampaignWizard from '../components/campaigns/CampaignWizard';
import api from '../services/api';

const CampaignCreate = () => {
  const { id } = useParams(); // For editing existing campaigns
  const navigate = useNavigate();
  const [loading, setLoading] = useState(id ? true : false);
  const [campaign, setCampaign] = useState(null);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch campaign data if in edit mode
  useEffect(() => {
    if (id) {
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

      fetchCampaign();
    }
  }, [id]);

  // Save campaign as draft
  const handleSaveDraft = async (campaignData) => {
    try {
      setSaveSuccess(false);
      setError(null);
      
      let response;
      
      if (id) {
        // Update existing campaign
        response = await api.put(`/campaigns/${id}`, {
          ...campaignData,
          status: 'draft'
        });
      } else {
        // Create new campaign
        response = await api.post('/campaigns', {
          ...campaignData,
          status: 'draft'
        });
      }
      
      setCampaign(response.data);
      setSaveSuccess(true);
      
      // Redirect to edit mode if we were in create mode
      if (!id) {
        navigate(`/campaign/edit/${response.data.id}`, { replace: true });
      }
      
      return response.data;
    } catch (err) {
      console.error('Error saving campaign draft:', err);
      setError('Failed to save campaign. Please try again.');
      return null;
    }
  };

  // Launch campaign
  const handleLaunch = async (campaignData) => {
    try {
      setSaveSuccess(false);
      setError(null);
      
      // First save the campaign data
      const savedCampaign = await handleSaveDraft(campaignData);
      
      if (!savedCampaign) {
        throw new Error('Failed to save campaign before launching');
      }
      
      // Then launch the campaign
      const response = await api.post(`/campaigns/${savedCampaign.id}/launch`);
      
      // Navigate to campaign monitoring page
      navigate('/monitor-360');
      
      return response.data;
    } catch (err) {
      console.error('Error launching campaign:', err);
      setError('Failed to launch campaign. Please ensure all required fields are filled and try again.');
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading campaign...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">
              {id ? 'Edit Campaign' : 'Create New Campaign'}
            </h1>
            <p className="text-sm text-gray-500">
              {id
                ? 'Update your 360 feedback campaign'
                : 'Set up a new 360 feedback campaign'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <p>{error}</p>
        </div>
      )}

      {saveSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
          <p>Campaign saved successfully</p>
        </div>
      )}

      <CampaignWizard
        initialData={campaign}
        onSaveDraft={handleSaveDraft}
        onLaunch={handleLaunch}
      />
    </div>
  );
};

export default CampaignCreate;