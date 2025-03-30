// frontend/src/components/settings/FluxAiSettings.jsx

import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Database, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Info
} from 'lucide-react';
import api from '../../services/api';

const FluxAiSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [apiCredit, setApiCredit] = useState(null);
  const [refreshingBalance, setRefreshingBalance] = useState(false);
  
  // Additional AI settings
  const [aiSettings, setAiSettings] = useState({
    analysisDepth: 'medium',
    enableBiasDetection: true,
    enableContentFiltering: true,
    maxTokensPerRequest: 2000,
    feedbackAnalysis: true
  });
  
  // Fetch current settings and available models
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        
        // Get current settings
        const settingsResponse = await api.get('/settings');
        if (settingsResponse.data) {
          const settings = settingsResponse.data;
          // Mask the API key by default
          setApiKey(settings.fluxApiKey || '');
          setSelectedModel(settings.fluxAiModel || '');
          
          // Set AI settings if available
          if (settings.ai) {
            setAiSettings({
              analysisDepth: settings.ai.analysisDepth || 'medium',
              enableBiasDetection: settings.ai.enableBiasDetection !== false,
              enableContentFiltering: settings.ai.enableContentFiltering !== false,
              maxTokensPerRequest: settings.ai.maxTokensPerRequest || 2000,
              feedbackAnalysis: settings.ai.feedbackAnalysis !== false
            });
          }
        }
        
        // Get available models
        try {
          const modelsResponse = await api.get('/settings/flux/models');
          if (modelsResponse.data && modelsResponse.data.data) {
            setAvailableModels(modelsResponse.data.data);
          }
        } catch (modelError) {
          console.warn('Could not fetch models, using hardcoded list:', modelError);
          setAvailableModels([
            { nickname: "Llama 3.1", model_name: "Llama 3.1" },
            { nickname: "DeepSeek", model_name: "DeepSeek" },
            { nickname: "Mistral", model_name: "Mistral" }
          ]);
        }
        
        // Get API credit balance
        await fetchApiBalance();
        
        setError(null);
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError('Failed to load settings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const fetchApiBalance = async () => {
    try {
      setRefreshingBalance(true);
      const balanceResponse = await api.get('/settings/flux/balance');
      if (balanceResponse.data && balanceResponse.data.api_credit) {
        setApiCredit(balanceResponse.data.api_credit);
      }
    } catch (err) {
      console.warn('Could not fetch API balance:', err);
    } finally {
      setRefreshingBalance(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaveLoading(true);
      setSuccess(null);
      setError(null);
      
      // Prepare the data to send
      const data = {
        fluxApiKey: apiKey === '••••••••' ? undefined : apiKey,
        fluxAiModel: selectedModel,
        ai: aiSettings
      };
      
      const response = await api.put('/settings', data);
      
      if (response.status === 200) {
        setSuccess('Settings saved successfully');
        
        // If the API key was changed, mask it again
        if (apiKey !== '••••••••') {
          setApiKey('••••••••');
        }
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again later.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleClearApiKey = () => {
    setApiKey('');
  };

  const handleToggleShowApiKey = () => {
    setShowApiKey(!showApiKey);
  };

  const handleAiSettingChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAiSettings({
      ...aiSettings,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseInt(value, 10) : value
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-2 text-gray-600">Loading AI settings...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 flex items-center">
          <Database className="h-5 w-5 mr-2 text-blue-500" />
          Flux AI Integration
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure your connection to the Flux AI platform for AI-assisted 360-degree feedback
        </p>
      </div>

      {/* Alert Messages */}
      {success && (
        <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-center">
          <Check className="h-5 w-5 mr-2 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}
      
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* API Connection Settings */}
      <div className="p-6">
        <h3 className="text-md font-medium mb-4">API Connection</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
              Flux AI API Key
            </label>
            <div className="relative rounded-md shadow-sm">
              <input
                type={showApiKey ? 'text' : 'password'}
                id="apiKey"
                name="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="block w-full pr-10 focus:ring-blue-500 focus:border-blue-500 rounded-md border-gray-300 text-gray-900 placeholder-gray-400"
                placeholder="Enter your API key"
              />
              <button
                type="button"
                onClick={handleToggleShowApiKey}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
              >
                {showApiKey ? 
                  <EyeOff className="h-5 w-5" /> : 
                  <Eye className="h-5 w-5" />
                }
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">Your Flux AI API key. Keep this secure.</p>
          </div>

          <div>
            <label htmlFor="aiModel" className="block text-sm font-medium text-gray-700 mb-1">
              AI Model
            </label>
            <select
              id="aiModel"
              name="aiModel"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="block w-full focus:ring-blue-500 focus:border-blue-500 rounded-md border-gray-300 text-gray-900"
            >
              <option value="">Select AI model</option>
              {availableModels.map((model) => (
                <option key={model.model_name} value={model.model_name}>
                  {model.nickname}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* AI Analysis Settings */}
        <h3 className="text-md font-medium mb-4">AI Analysis Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="analysisDepth" className="block text-sm font-medium text-gray-700 mb-1">
              Analysis Depth
            </label>
            <select
              id="analysisDepth"
              name="analysisDepth"
              value={aiSettings.analysisDepth}
              onChange={handleAiSettingChange}
              className="block w-full focus:ring-blue-500 focus:border-blue-500 rounded-md border-gray-300 text-gray-900"
            >
              <option value="light">Light (Faster, Less Detailed)</option>
              <option value="medium">Medium (Balanced)</option>
              <option value="deep">Deep (Slower, More Detailed)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">Determines how thoroughly AI analyzes feedback</p>
          </div>
          
          <div>
            <label htmlFor="maxTokensPerRequest" className="block text-sm font-medium text-gray-700 mb-1">
              Max Tokens Per Request
            </label>
            <input
              type="number"
              id="maxTokensPerRequest"
              name="maxTokensPerRequest"
              value={aiSettings.maxTokensPerRequest}
              onChange={handleAiSettingChange}
              min="500"
              max="8000"
              step="100"
              className="block w-full focus:ring-blue-500 focus:border-blue-500 rounded-md border-gray-300"
            />
            <p className="mt-1 text-xs text-gray-500">Maximum tokens to use per API request (affects cost)</p>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableBiasDetection"
              name="enableBiasDetection"
              checked={aiSettings.enableBiasDetection}
              onChange={handleAiSettingChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="enableBiasDetection" className="ml-2 block text-sm text-gray-700">
              Enable Bias Detection
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableContentFiltering"
              name="enableContentFiltering"
              checked={aiSettings.enableContentFiltering}
              onChange={handleAiSettingChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="enableContentFiltering" className="ml-2 block text-sm text-gray-700">
              Enable Content Filtering
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="feedbackAnalysis"
              name="feedbackAnalysis"
              checked={aiSettings.feedbackAnalysis}
              onChange={handleAiSettingChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="feedbackAnalysis" className="ml-2 block text-sm text-gray-700">
              Enable AI Feedback Analysis
            </label>
          </div>
        </div>
        
        {/* Account Status */}
        <h3 className="text-md font-medium mb-4">Account Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="p-4 border border-gray-200 rounded-md">
            <h3 className="text-sm font-medium mb-2">API Credit Balance</h3>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-semibold">
                {apiCredit !== null ? apiCredit : 'Not available'}
              </p>
              <button
                type="button"
                onClick={fetchApiBalance}
                disabled={refreshingBalance}
                className={`inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md ${
                  refreshingBalance ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'
                } bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                {refreshingBalance ? (
                  <span className="inline-block w-3 h-3 mr-1 border-2 border-gray-500 border-t-gray-200 rounded-full animate-spin"></span>
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Refresh
              </button>
            </div>
          </div>
        </div>
        
        {/* Info box */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex">
            <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-700">About Flux AI Integration</h4>
              <p className="text-sm text-blue-600">
                Flux AI powers the automated analysis of 360-degree feedback, helping identify patterns and generate insights. Your API usage is billed based on the number of tokens processed.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <button
            type="button"
            onClick={handleClearApiKey}
            className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Clear API Key
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saveLoading}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
              saveLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            {saveLoading ? (
              <>
                <span className="inline-block w-4 h-4 mr-2 border-2 border-white border-t-blue-600 rounded-full animate-spin"></span>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FluxAiSettings;