import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [apiCredit, setApiCredit] = useState(null);
  
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
        }
        
        // Get available models (in production, this would come from the Flux API)
        try {
          const modelsResponse = await api.get('/settings/flux/models');
          if (modelsResponse.data && modelsResponse.data.data) {
            setAvailableModels(modelsResponse.data.data);
          } else {
            // Fallback for development - predefined list
            setAvailableModels([
              { nickname: "Llama 3.1", model_name: "Llama 3.1" },
              { nickname: "DeepSeek", model_name: "DeepSeek" },
              { nickname: "Mistral", model_name: "Mistral" }
            ]);
          }
        } catch (modelError) {
          console.warn('Could not fetch models, using hardcoded list:', modelError);
          // Fallback for when API isn't connected
          setAvailableModels([
            { nickname: "Llama 3.1", model_name: "Llama 3.1" },
            { nickname: "DeepSeek", model_name: "DeepSeek" },
            { nickname: "Mistral", model_name: "Mistral" }
          ]);
        }
        
        // Get API credit balance
        try {
          const balanceResponse = await api.get('/settings/flux/balance');
          if (balanceResponse.data && balanceResponse.data.api_credit) {
            setApiCredit(balanceResponse.data.api_credit);
          }
        } catch (balanceError) {
          console.warn('Could not fetch API balance:', balanceError);
        }
        
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

  const handleSaveSettings = async () => {
    try {
      setSaveLoading(true);
      setSuccess(null);
      setError(null);
      
      const response = await api.put('/settings', {
        fluxApiKey: apiKey,
        fluxAiModel: selectedModel
      });
      
      if (response.status === 200) {
        setSuccess('Settings saved successfully');
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

  const handleRefreshBalance = async () => {
    try {
      const balanceResponse = await api.get('/settings/flux/balance');
      if (balanceResponse.data && balanceResponse.data.api_credit) {
        setApiCredit(balanceResponse.data.api_credit);
        setSuccess('Balance refreshed successfully');
      }
    } catch (err) {
      console.error('Error refreshing balance:', err);
      setError('Failed to refresh balance. Please try again later.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500">
          Configure your Pulse360 application settings
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative" role="alert">
          <p>{success}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-1">Flux AI Integration</h2>
        <p className="text-sm text-gray-500 mb-4">
          Configure your connection to the Flux AI platform for AI-assisted 360-degree feedback.
        </p>

        <div className="space-y-6">
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
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
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

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Account Status</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 border border-gray-200 rounded-md">
            <h3 className="text-sm font-medium mb-2">API Credit Balance</h3>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-semibold">
                {apiCredit !== null ? apiCredit : 'Not available'}
              </p>
              <button
                type="button"
                onClick={handleRefreshBalance}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;