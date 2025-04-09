// frontend/src/components/settings/DangerZoneSettings.jsx

import React, { useState } from 'react';
import { AlertTriangle, Shield, Brain, RefreshCw } from 'lucide-react';
import { settingsApi } from '../../services/api';

const DangerZoneSettings = () => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [confirmText, setConfirmText] = useState('');

  const handleToggleConfirmation = () => {
    setShowConfirmation(!showConfirmation);
    setError(null);
    setSuccess(false);
    setConfirmText('');
  };

  const handleDisableAiForAllCampaigns = async () => {
    if (confirmText !== 'DISABLE AI') {
      setError('Please type "DISABLE AI" to confirm');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await settingsApi.dangerZone.disableAiForAllCampaigns();
      
      setSuccess(true);
      setShowConfirmation(false);
      setConfirmText('');
      
      // Show affected campaigns count
      if (response.data && response.data.affectedCampaigns) {
        console.log(`Successfully updated ${response.data.affectedCampaigns} campaigns`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 bg-red-50">
        <div className="flex items-center">
          <Shield className="h-6 w-6 text-red-600 mr-2" />
          <h2 className="text-xl font-medium text-gray-900">Danger Zone</h2>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          These actions are destructive and cannot be easily reversed. Use with caution.
        </p>
      </div>

      <div className="p-6">
        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
            <p className="font-medium">Operation successful</p>
            <p className="text-sm">All campaigns have been updated to use the fallback AI model.</p>
          </div>
        )}

        {/* Disable AI for All Campaigns */}
        <div className="border border-red-200 rounded-md bg-white mb-6">
          <div className="p-4 flex items-start justify-between">
            <div>
              <h3 className="text-base font-medium text-gray-900 flex items-center">
                <Brain className="h-5 w-5 mr-2 text-red-600" />
                Disable Flux AI for All Campaigns
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Switch all campaigns (including active ones) to use the fallback AI model instead of Flux AI.
                This affects all assessments, including forms that have already been sent.
              </p>
            </div>
            <button 
              onClick={handleToggleConfirmation}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none"
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 inline animate-spin" />
                  Processing...
                </>
              ) : "Disable AI"}
            </button>
          </div>
          
          {/* Confirmation Modal */}
          {showConfirmation && (
            <div className="p-4 border-t border-red-200 bg-red-50">
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Warning: This action cannot be undone</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      This will immediately switch all campaigns to use the fallback AI model instead of Flux AI.
                      This includes:
                    </p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>All active campaigns</li>
                      <li>Assessment forms that have already been sent</li>
                      <li>New assessments being filled out right now</li>
                    </ul>
                    <p className="mt-2">
                      The fallback model provides basic validation but lacks the advanced feedback capabilities of Flux AI.
                    </p>
                  </div>
                </div>
              </div>
              
              {error && (
                <div className="mb-4 bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                  <p className="text-sm">{error}</p>
                </div>
              )}
              
              <div className="mb-4">
                <label htmlFor="confirm-text" className="block text-sm font-medium text-red-700">
                  Type "DISABLE AI" to confirm
                </label>
                <input
                  type="text"
                  id="confirm-text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="mt-1 block w-full border border-red-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  placeholder="DISABLE AI"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleToggleConfirmation}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDisableAiForAllCampaigns}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1 inline animate-spin" />
                      Processing...
                    </>
                  ) : "I understand, disable AI"}
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="text-xs text-gray-500 flex items-center">
          <AlertTriangle className="h-3 w-3 mr-1" />
          These actions should only be used in exceptional circumstances.
        </div>
      </div>
    </div>
  );
};

export default DangerZoneSettings;