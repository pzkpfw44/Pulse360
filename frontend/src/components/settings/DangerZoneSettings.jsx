// frontend/src/components/settings/DangerZoneSettings.jsx

import React, { useState } from 'react';
import { AlertTriangle, Shield, AlertCircle } from 'lucide-react';
import { settingsApi } from '../../services/api';

const DangerZoneSettings = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionResult, setActionResult] = useState(null);

  const handleOpenModal = (action) => {
    setCurrentAction(action);
    setIsModalOpen(true);
    setActionResult(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentAction(null);
  };

  const handleConfirmAction = async () => {
    try {
      setIsLoading(true);
      let result;

      if (currentAction === 'disableAi') {
        result = await settingsApi.dangerZone.disableAiForAllCampaigns();
        setActionResult({
          success: true,
          message: `Successfully disabled AI for ${result.data.affectedCampaigns} campaigns`
        });
      }
      
      // Add more actions here in the future if needed
      
    } catch (error) {
      console.error('Error performing dangerous action:', error);
      setActionResult({
        success: false,
        message: error.response?.data?.message || 'An error occurred while performing this action'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-5 border-b border-gray-200 bg-red-50">
        <div className="flex items-center">
          <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
          <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
        </div>
        <p className="text-sm text-red-600 mt-1">
          These actions are potentially destructive and cannot be reversed. Proceed with caution.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Disable AI Support */}
        <div className="border border-red-200 rounded-md p-4 bg-red-50">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-red-800">Disable AI Support for All Campaigns</h3>
              <p className="mt-1 text-sm text-red-600">
                This will disable full AI support for all campaigns, including active ones. 
                Campaigns will fall back to basic validation. This action cannot be undone.
              </p>
            </div>
            <button 
              onClick={() => handleOpenModal('disableAi')}
              className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700"
            >
              Disable All
            </button>
          </div>
        </div>
      </div>
      
      {/* Confirmation Modal */}
      {isModalOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={handleCloseModal}
          ></div>
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Confirm Action</h3>
              </div>
              
              <div className="px-6 py-4">
                {actionResult ? (
                  <div className={`p-3 rounded-md ${actionResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {actionResult.message}
                  </div>
                ) : (
                  <>
                    {currentAction === 'disableAi' && (
                      <div>
                        <p className="text-gray-700 mb-4">
                          Are you sure you want to disable full AI support for all campaigns?
                        </p>
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <AlertTriangle className="h-5 w-5 text-yellow-400" />
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-yellow-700">
                                This action will be applied to all campaigns, including active ones. This cannot be undone for existing campaigns.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <div className="px-6 py-3 bg-gray-50 flex justify-end space-x-3">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium text-gray-700"
                >
                  {actionResult ? 'Close' : 'Cancel'}
                </button>
                
                {!actionResult && (
                  <button
                    onClick={handleConfirmAction}
                    disabled={isLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      'Confirm'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DangerZoneSettings;