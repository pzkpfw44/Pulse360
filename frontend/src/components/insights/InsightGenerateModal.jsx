// frontend/src/components/insights/InsightGenerateModal.jsx

import React, { useState } from 'react';
import { X, Lightbulb, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const InsightGenerateModal = ({ isOpen, onClose, onSuccess, campaigns, reportTypes }) => {
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedReportType, setSelectedReportType] = useState(reportTypes[0]?.id || '');
  const [customTitle, setCustomTitle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  if (!isOpen) return null;
  
  // Reset form on close
  const handleClose = () => {
    setSelectedCampaign('');
    setSelectedReportType(reportTypes[0]?.id || '');
    setCustomTitle('');
    setError(null);
    onClose();
  };
  
  const handleGenerate = async () => {
    if (!selectedCampaign || !selectedReportType) {
      setError('Please select both a campaign and report type');
      return;
    }
    
    try {
      setGenerating(true);
      setError(null);
      
      // Generate the insight
      await api.post('/insights/generate', {
        campaignId: selectedCampaign,
        insightType: selectedReportType,
        title: customTitle || undefined // Use default if not provided
      });
      
      onSuccess();
    } catch (err) {
      console.error('Error generating insight:', err);
      setError(err.response?.data?.message || 'Failed to generate insight. Please try again.');
    } finally {
      setGenerating(false);
    }
  };
  
  const getReportTypeLabel = (typeId) => {
    const reportType = reportTypes.find(r => r.id === typeId);
    return reportType ? reportType.title : 'Unknown Report Type';
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="p-5 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            <Lightbulb className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium">Generate New Insight</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-5">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <p>{error}</p>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Report Type
            </label>
            {reportTypes.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {reportTypes.map((reportType) => (
                  <div
                    key={reportType.id}
                    className={`border rounded-lg p-3 cursor-pointer ${
                      selectedReportType === reportType.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                    onClick={() => setSelectedReportType(reportType.id)}
                  >
                    <div className="flex items-start">
                      <input
                        type="radio"
                        checked={selectedReportType === reportType.id}
                        onChange={() => setSelectedReportType(reportType.id)}
                        className="h-4 w-4 mt-1 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div className="ml-3">
                        <h4 className="font-medium">{reportType.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {reportType.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No report types available</p>
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="campaign" className="block text-sm font-medium text-gray-700 mb-1">
              Select Campaign
            </label>
            {campaigns.length > 0 ? (
              <select
                id="campaign"
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">-- Select a campaign --</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name} - {campaign.targetEmployee?.firstName} {campaign.targetEmployee?.lastName} 
                    ({campaign.completionRate}% complete)
                  </option>
                ))}
              </select>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-3 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm">
                  No campaigns with feedback data available. Complete a 360 feedback campaign first.
                </p>
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Custom Title (Optional)
            </label>
            <input
              type="text"
              id="title"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={`${getReportTypeLabel(selectedReportType)} (Default)`}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-600 mb-4">
            <p>
              <span className="font-medium">Note:</span> Generating insights may take a minute. 
              The AI will analyze all feedback data to create a comprehensive development report.
            </p>
          </div>
        </div>
        
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !selectedCampaign || !selectedReportType}
            className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
              generating || !selectedCampaign || !selectedReportType
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {generating ? 'Generating...' : 'Generate Insight'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsightGenerateModal;