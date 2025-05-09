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
  Zap,
  Trash2
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
  const [lastEnteredKey, setLastEnteredKey] = useState('');

  // New storage management state variables
  const [storageInfo, setStorageInfo] = useState(null);
  const [loadingStorage, setLoadingStorage] = useState(false);
  const [deletingFile, setDeletingFile] = useState(null);
  const [cleaningUpFiles, setCleaningUpFiles] = useState(false);
  const [storageUsagePercent, setStorageUsagePercent] = useState(0);

  const [aiSettings, setAiSettings] = useState({
    analysisDepth: 'medium',
    enableBiasDetection: true,
    enableContentFiltering: true,
    maxTokensPerRequest: 2000,
    feedbackAnalysis: true
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const settingsResponse = await api.get('/settings');
        if (settingsResponse.data) {
          const settings = settingsResponse.data;
          setApiKey(settings.fluxApiKey || '');
          setSelectedModel(settings.fluxAiModel || '');
          if (settings.aiSettings) {
            setAiSettings({
              analysisDepth: settings.aiSettings.analysisDepth || 'medium',
              enableBiasDetection: settings.aiSettings.enableBiasDetection !== false,
              enableContentFiltering: settings.aiSettings.enableContentFiltering !== false,
              maxTokensPerRequest: settings.aiSettings.maxTokensPerRequest || 2000,
              feedbackAnalysis: settings.aiSettings.feedbackAnalysis !== false
            });
          }
        }

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

        // Fetch both API balance and storage info
        await fetchApiBalance();
        await handleRefreshStorage();
        
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
    setRefreshingBalance(true);
    try {
      const balanceResponse = await api.get('/settings/flux/balance');
      setApiCredit(balanceResponse.data?.api_credit ?? null);
    } catch (err) {
      console.warn('Could not fetch API balance:', err);
      setApiCredit(null);
    } finally {
      setRefreshingBalance(false);
    }
  };
  
  // Storage management functions
  const handleRefreshStorage = async () => {
    setLoadingStorage(true);
    try {
      const response = await api.get('/settings/flux/storage');
      setStorageInfo(response.data);
      
      // Calculate percentage
      if (response.data && response.data.totalStorage) {
        const percent = Math.round((response.data.usedStorage / response.data.totalStorage) * 100);
        setStorageUsagePercent(percent);
      }
    } catch (err) {
      console.error('Error fetching storage info:', err);
      setError('Failed to load storage information');
    } finally {
      setLoadingStorage(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    setDeletingFile(fileId);
    try {
      await api.delete(`/settings/flux/files/${fileId}`);
      // Refresh storage info
      handleRefreshStorage();
      setSuccess('File deleted successfully');
    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Failed to delete file');
    } finally {
      setDeletingFile(null);
    }
  };

  const handleCleanupAllFiles = async () => {
    if (!window.confirm('Are you sure you want to delete all files from Flux AI storage? This cannot be undone.')) {
      return;
    }
    
    setCleaningUpFiles(true);
    try {
      await api.post('/settings/flux/cleanup');
      await handleRefreshStorage();
      setSuccess('All files have been deleted');
    } catch (err) {
      console.error('Error cleaning up files:', err);
      setError('Failed to clean up files');
    } finally {
      setCleaningUpFiles(false);
    }
  };

  // Format bytes to human-readable format
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const handleSaveSettings = async () => {
    setSaveLoading(true);
    setSuccess(null);
    setError(null);
    try {
      const data = {
        fluxApiKey: apiKey === '••••••••' ? undefined : apiKey,
        fluxAiModel: selectedModel,
        aiSettings: { ...aiSettings }
      };

      const response = await api.put('/settings', data);
      if (response.status === 200) {
        setSuccess('Settings saved successfully');
        if (apiKey !== '••••••••') {
          setLastEnteredKey(apiKey);
          setApiKey('••••••••');
        }
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(`Failed to save settings. ${err.response?.data?.message || 'Please try again later.'}`);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleClearApiKey = () => {
    setApiKey('');
    setLastEnteredKey('');
  };

  const handleToggleShowApiKey = () => {
    setShowApiKey(!showApiKey);
  };

  const handleApiKeyChange = (e) => {
    const newValue = e.target.value;
    setApiKey(newValue);
    if (newValue !== '••••••••') {
      setLastEnteredKey(newValue);
    }
  };

  const handleAiSettingChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAiSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked :
              type === 'number' ? parseInt(value, 10) || 0 :
              value
    }));
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
          Flux AI Configuration
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure connection and analysis settings for the Flux AI platform.
        </p>
      </div>

      {/* Alert Messages */}
      {success && (
        <div role="alert" className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-center">
          <Check className="h-5 w-5 mr-2 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}
      {error && (
        <div role="alert" className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Settings Form Body */}
      <fieldset disabled={saveLoading} className="p-6 space-y-8">

        {/* API Connection Section */}
        <section>
          <h3 className="text-md font-semibold mb-3 text-gray-800">API Connection</h3>
          {/* Removed bg-gray-50 */}
          <div className="p-6 rounded-md border border-gray-200 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* API Key Input */}
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                  Flux AI API Key
                </label>
                <div className="relative rounded-md shadow-sm">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    id="apiKey"
                    name="apiKey"
                    value={apiKey === '••••••••' && showApiKey && lastEnteredKey ? lastEnteredKey : apiKey}
                    onChange={handleApiKeyChange}
                    className="block w-full pr-10 focus:ring-blue-500 focus:border-blue-500 rounded-md border-gray-300 text-gray-900 placeholder-gray-400 disabled:bg-gray-100"
                    placeholder="Enter your API key"
                    aria-describedby="apiKey-description"
                  />
                  <button
                    type="button"
                    onClick={handleToggleShowApiKey}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 z-10 cursor-pointer disabled:cursor-not-allowed"
                    title={showApiKey ? "Hide API key" : "Show API key"}
                  >
                    {showApiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {/* Helper text */}
                <p id="apiKey-description" className="text-xs text-gray-500 mt-1">
                    Keep this secure.
                    {apiKey === '••••••••' && !lastEnteredKey && <span className="italic ml-1">(Hidden)</span>}
                </p>
                {/* Clear Key link on new line, right aligned */}
                {apiKey && (
                    <div className="flex justify-end mt-1">
                         <button
                           type="button"
                           onClick={handleClearApiKey}
                           className="inline-flex items-center text-xs font-medium text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                         >
                           <Trash2 className="h-3 w-3 mr-1" />
                           Clear Key
                         </button>
                    </div>
                 )}
              </div>

              {/* AI Model Selector */}
              <div>
                <label htmlFor="aiModel" className="block text-sm font-medium text-gray-700 mb-1">
                  AI Model
                </label>
                <select
                  id="aiModel"
                  name="aiModel"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="block w-full focus:ring-blue-500 focus:border-blue-500 rounded-md border-gray-300 text-gray-900 disabled:bg-gray-100"
                >
                  <option value="">Select AI model</option>
                  {availableModels.map((model) => (
                    <option key={model.model_name} value={model.model_name}>
                      {model.nickname} ({model.model_name})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">Select the AI model for analysis.</p>
              </div>
            </div>
          </div>
        </section>

        {/* AI Analysis Settings Section */}
        <section>
          <h3 className="text-md font-semibold mb-3 text-gray-800">AI Analysis Settings</h3>
           {/* Removed bg-gray-50 */}
          <div className="p-6 rounded-md border border-gray-200 space-y-6">
            {/* Inputs first */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="analysisDepth" className="block text-sm font-medium text-gray-700 mb-1" title="Determines how thoroughly AI analyzes feedback. Deeper analysis provides more detail but takes longer and may cost more.">
                  Analysis Depth
                </label>
                <select
                  id="analysisDepth"
                  name="analysisDepth"
                  value={aiSettings.analysisDepth}
                  onChange={handleAiSettingChange}
                  className="block w-full focus:ring-blue-500 focus:border-blue-500 rounded-md border-gray-300 text-gray-900 disabled:bg-gray-100"
                >
                  <option value="light">Light (Faster, Less Detailed)</option>
                  <option value="medium">Medium (Balanced)</option>
                  <option value="deep">Deep (Slower, More Detailed)</option>
                </select>
                 <p className="mt-1 text-xs text-gray-500 invisible md:visible">Hover label for details.</p>
              </div>

              <div>
                <label htmlFor="maxTokensPerRequest" className="block text-sm font-medium text-gray-700 mb-1" title="Sets the maximum computation limit (tokens) per AI request. Higher values allow for processing more text at once but increase cost per request.">
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
                  className="block w-full focus:ring-blue-500 focus:border-blue-500 rounded-md border-gray-300 disabled:bg-gray-100"
                />
                 <p className="mt-1 text-xs text-gray-500 invisible md:visible">Hover label for details.</p>
              </div>
            </div>

             {/* Checkboxes immediately below inputs */}
             <div className="mt-4">
                 <label className="block text-sm font-medium text-gray-700 mb-3">
                     Content Safety & Analysis Features
                 </label>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
                     <div className="flex items-center">
                         <input
                         type="checkbox"
                         id="enableBiasDetection"
                         name="enableBiasDetection"
                         checked={aiSettings.enableBiasDetection}
                         onChange={handleAiSettingChange}
                         className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                         />
                         <label htmlFor="enableBiasDetection" className="ml-2 block text-sm text-gray-700">
                         Bias Detection
                         </label>
                     </div>
                     {/* ... other checkboxes ... */}
                      <div className="flex items-center">
                         <input
                         type="checkbox"
                         id="enableContentFiltering"
                         name="enableContentFiltering"
                         checked={aiSettings.enableContentFiltering}
                         onChange={handleAiSettingChange}
                         className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                         />
                         <label htmlFor="enableContentFiltering" className="ml-2 block text-sm text-gray-700">
                         Content Filtering
                         </label>
                     </div>

                     <div className="flex items-center">
                         <input
                         type="checkbox"
                         id="feedbackAnalysis"
                         name="feedbackAnalysis"
                         checked={aiSettings.feedbackAnalysis}
                         onChange={handleAiSettingChange}
                         className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                         />
                         <label htmlFor="feedbackAnalysis" className="ml-2 block text-sm text-gray-700">
                         Feedback Analysis
                         </label>
                     </div>
                 </div>
             </div>
          </div>
        </section>

        {/* Account Status Section - No Box */}
        <section>
          <h3 className="text-md font-semibold mb-3 text-gray-800">Account Status</h3>
          <div className="flex items-baseline justify-between gap-4">
              <p className="text-xl font-semibold text-gray-800">
                {apiCredit !== null ? (
                  <>
                    {apiCredit}
                    <span className="text-sm font-normal text-gray-500 ml-1">credits</span>
                  </>
                  ) : (
                  <span className="text-gray-500 text-base">Not available</span>
                  )
                }
              </p>
              <button
                type="button"
                onClick={fetchApiBalance}
                disabled={refreshingBalance || saveLoading}
                className={`inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md whitespace-nowrap ${
                  refreshingBalance ? 'text-gray-400 cursor-wait' : 'text-gray-700 hover:bg-gray-100' // Adjusted hover for white background
                } bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {refreshingBalance ? (
                  <span className="inline-block w-3 h-3 mr-1 border-2 border-gray-500 border-t-gray-200 rounded-full animate-spin"></span>
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Refresh
              </button>
            </div>
        </section>

        {/* Storage Management Section - NEW SECTION */}
        <section>
          <h3 className="text-md font-semibold mb-3 text-gray-800">Storage Management</h3>
          <div className="p-6 rounded-md border border-gray-200">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Storage Usage</span>
                <button
                  type="button"
                  onClick={handleRefreshStorage}
                  disabled={loadingStorage || saveLoading}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </button>
              </div>
              
              {/* Storage Progress Bar */}
              <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden">
                {storageInfo ? (
                  <div 
                    className={`h-full ${storageUsagePercent > 90 ? 'bg-red-500' : storageUsagePercent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${storageUsagePercent}%` }}
                  ></div>
                ) : (
                  <div className="h-full bg-gray-300 animate-pulse" style={{ width: '100%' }}></div>
                )}
              </div>
              
              {/* Storage Stats */}
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>
                  {storageInfo ? (
                    `${formatBytes(storageInfo.usedStorage)} used of ${formatBytes(storageInfo.totalStorage)}`
                  ) : (
                    'Storage information not available'
                  )}
                </span>
                <span>
                  {storageInfo && (
                    `${formatBytes(storageInfo.availableStorage)} available`
                  )}
                </span>
              </div>
            </div>
            
            {/* File List */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Stored Files</h4>
              {loadingStorage ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : storageInfo && storageInfo.files && storageInfo.files.length > 0 ? (
                <div className="overflow-x-auto border rounded-md">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                        <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {storageInfo.files.map((file) => (
                        <tr key={file.id}>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{file.filename || 'Unknown'}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatBytes(file.bytes)}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            {new Date(file.created_at * 1000).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              disabled={deletingFile === file.id}
                              className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                              title="Delete file"
                            >
                              {deletingFile === file.id ? (
                                <span className="inline-block w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></span>
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-md">
                  <p className="text-gray-500">No files found in storage</p>
                </div>
              )}
              
              {/* Clean Up All Button */}
              {storageInfo && storageInfo.files && storageInfo.files.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleCleanupAllFiles}
                    disabled={cleaningUpFiles || storageInfo.files.length === 0}
                    className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {cleaningUpFiles ? (
                      <>
                        <span className="inline-block w-3 h-3 mr-1 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></span>
                        Cleaning...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clean Up All Files
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Why We Chose Flux AI Section */}
        <section className="pt-6 border-t border-gray-200">
          <h3 className="text-md font-semibold text-gray-700 mb-3">Why We Chose Flux AI</h3>
          {/* This section retains its specific background color */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <Zap className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-indigo-700 leading-relaxed">
                  Pulse360 runs on Flux AI to deliver lightning-fast, private, and resilient feedback processing—powered by a fully decentralized, enterprise-grade infrastructure with no single point of failure. We use AI the way it should be: transparent, secure, and built to serve you—where privacy is not a promise for some customers, but a principle embedded by design for all.
                </p>
              </div>
            </div>
          </div>
        </section>

      </fieldset> {/* End of fieldset */}

      {/* Action Buttons Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saveLoading || loading}
            className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
              saveLoading ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {saveLoading ? (
              <>
                <span className="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
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
  );
};

export default FluxAiSettings;