// frontend/src/components/settings/EmailSettings.jsx

import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Mail, 
  Server, 
  Key, 
  User, 
  Send, 
  AlertTriangle, 
  Check, 
  Info, 
  HelpCircle 
} from 'lucide-react';
import api from '../../services/api';

const EmailSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // SMTP Configuration
  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: '587',
    secure: false,
    requireAuth: true,
    username: '',
    password: '',
    fromEmail: '',
    fromName: 'Pulse360 Feedback',
    replyTo: ''
  });

  // Additional email settings
  const [emailSettings, setEmailSettings] = useState({
    sendReminders: true,
    reminderFrequency: 3, // days
    maxReminders: 3,
    devMode: false
  });

  useEffect(() => {
    loadEmailSettings();
  }, []);

  const loadEmailSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/settings/email');
      
      if (response.data) {
        // Set SMTP configuration
        setSmtpConfig({
          host: response.data.smtp?.host || '',
          port: response.data.smtp?.port || '587',
          secure: response.data.smtp?.secure || false,
          requireAuth: response.data.smtp?.requireAuth !== false, // default to true
          username: response.data.smtp?.username || '',
          password: response.data.smtp?.password ? '••••••••' : '', // Mask password
          fromEmail: response.data.smtp?.fromEmail || '',
          fromName: response.data.smtp?.fromName || 'Pulse360 Feedback',
          replyTo: response.data.smtp?.replyTo || ''
        });
        
        // Set additional email settings
        setEmailSettings({
          sendReminders: response.data.sendReminders !== false, // default to true
          reminderFrequency: response.data.reminderFrequency || 3,
          maxReminders: response.data.maxReminders || 3,
          devMode: response.data.devMode || false
        });
      }
    } catch (err) {
      console.error('Error loading email settings:', err);
      setError('Failed to load email settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSmtpChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSmtpConfig({
      ...smtpConfig,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleEmailSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEmailSettings({
      ...emailSettings,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseInt(value, 10) : value
    });
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // Prepare the data for saving
      const saveData = {
        smtp: {
          ...smtpConfig,
          // Don't update password if it's masked
          password: smtpConfig.password === '••••••••' ? undefined : smtpConfig.password
        },
        sendReminders: emailSettings.sendReminders,
        reminderFrequency: emailSettings.reminderFrequency,
        maxReminders: emailSettings.maxReminders,
        devMode: emailSettings.devMode
      };
      
      await api.put('/settings/email', saveData);
      
      setSuccess('Email settings saved successfully');
      
      // Refresh settings
      loadEmailSettings();
    } catch (err) {
      console.error('Error saving email settings:', err);
      setError('Failed to save email settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      setError(null);
      
      // Prepare the data for testing
      const testData = {
        smtp: {
          ...smtpConfig,
          // Don't send password if it's masked
          password: smtpConfig.password === '••••••••' ? undefined : smtpConfig.password
        }
      };
      
      const response = await api.post('/settings/email/test', testData);
      
      setTestResult({
        success: true,
        message: response.data.message || 'Email connection test successful!'
      });
    } catch (err) {
      console.error('Error testing email connection:', err);
      setTestResult({
        success: false,
        message: err.response?.data?.message || 'Email connection test failed. Please check your settings.'
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-2 text-gray-600">Loading email settings...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 flex items-center">
          <Mail className="h-5 w-5 mr-2 text-blue-500" />
          Email Configuration
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure SMTP settings for sending emails to participants
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
      
      {testResult && (
        <div className={`mx-6 mt-4 p-4 ${
          testResult.success ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        } border rounded-md flex items-center`}>
          {testResult.success ? (
            <Check className="h-5 w-5 mr-2 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
          )}
          <p>{testResult.message}</p>
        </div>
      )}

      <div className="p-6">
        {/* SMTP Server Settings */}
        <div className="mb-6">
          <h3 className="text-md font-medium mb-4 flex items-center">
            <Server className="h-5 w-5 mr-2 text-gray-500" />
            SMTP Server Settings
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="host" className="block text-sm font-medium text-gray-700 mb-1">
                SMTP Host <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="host"
                name="host"
                value={smtpConfig.host}
                onChange={handleSmtpChange}
                placeholder="e.g., smtp.gmail.com"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Hostname or IP address of your SMTP server</p>
            </div>
            
            <div>
              <label htmlFor="port" className="block text-sm font-medium text-gray-700 mb-1">
                Port <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="port"
                name="port"
                value={smtpConfig.port}
                onChange={handleSmtpChange}
                placeholder="e.g., 587"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Common ports: 25, 465 (SSL), 587 (TLS)</p>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="secure"
                name="secure"
                checked={smtpConfig.secure}
                onChange={handleSmtpChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="secure" className="ml-2 block text-sm text-gray-700">
                Use Secure Connection (SSL/TLS)
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="requireAuth"
                name="requireAuth"
                checked={smtpConfig.requireAuth}
                onChange={handleSmtpChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="requireAuth" className="ml-2 block text-sm text-gray-700">
                Require Authentication
              </label>
            </div>
          </div>
        </div>
        
        {/* Authentication Settings (shown if requireAuth is true) */}
        {smtpConfig.requireAuth && (
          <div className="mb-6">
            <h3 className="text-md font-medium mb-4 flex items-center">
              <Key className="h-5 w-5 mr-2 text-gray-500" />
              Authentication
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={smtpConfig.username}
                  onChange={handleSmtpChange}
                  placeholder="e.g., user@example.com"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={smtpConfig.password}
                    onChange={handleSmtpChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  For Gmail, you may need to use an app password. <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Learn more</a>
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Sender Information */}
        <div className="mb-6">
          <h3 className="text-md font-medium mb-4 flex items-center">
            <User className="h-5 w-5 mr-2 text-gray-500" />
            Sender Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fromEmail" className="block text-sm font-medium text-gray-700 mb-1">
                From Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="fromEmail"
                name="fromEmail"
                value={smtpConfig.fromEmail}
                onChange={handleSmtpChange}
                placeholder="e.g., feedback@yourcompany.com"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="fromName" className="block text-sm font-medium text-gray-700 mb-1">
                From Name
              </label>
              <input
                type="text"
                id="fromName"
                name="fromName"
                value={smtpConfig.fromName}
                onChange={handleSmtpChange}
                placeholder="e.g., Pulse360 Feedback"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="replyTo" className="block text-sm font-medium text-gray-700 mb-1">
                Reply-To Email
              </label>
              <input
                type="email"
                id="replyTo"
                name="replyTo"
                value={smtpConfig.replyTo}
                onChange={handleSmtpChange}
                placeholder="e.g., hr@yourcompany.com"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">Optional email address for recipients to reply to</p>
            </div>
          </div>
        </div>
        
        {/* Reminder Settings */}
        <div className="mb-6">
          <h3 className="text-md font-medium mb-4 flex items-center">
            <Send className="h-5 w-5 mr-2 text-gray-500" />
            Email Reminder Settings
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="sendReminders"
                name="sendReminders"
                checked={emailSettings.sendReminders}
                onChange={handleEmailSettingsChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="sendReminders" className="ml-2 block text-sm text-gray-700">
                Send Automated Reminders
              </label>
            </div>
            
            {emailSettings.sendReminders && (
              <>
                <div>
                  <label htmlFor="reminderFrequency" className="block text-sm font-medium text-gray-700 mb-1">
                    Reminder Frequency (days)
                  </label>
                  <input
                    type="number"
                    id="reminderFrequency"
                    name="reminderFrequency"
                    value={emailSettings.reminderFrequency}
                    onChange={handleEmailSettingsChange}
                    min="1"
                    max="30"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="maxReminders" className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Reminders
                  </label>
                  <input
                    type="number"
                    id="maxReminders"
                    name="maxReminders"
                    value={emailSettings.maxReminders}
                    onChange={handleEmailSettingsChange}
                    min="0"
                    max="10"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">Set to 0 for unlimited reminders</p>
                </div>
              </>
            )}
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="devMode"
                name="devMode"
                checked={emailSettings.devMode}
                onChange={handleEmailSettingsChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="devMode" className="ml-2 block text-sm text-gray-700">
                Development Mode
              </label>
              <HelpCircle className="ml-1 h-4 w-4 text-gray-400 cursor-help" title="In development mode, emails are logged but not actually sent" />
            </div>
          </div>
        </div>
        
        {/* Information Box */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex">
            <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-700">Email Templates</h4>
              <p className="text-sm text-blue-600">
                You can customize email templates for invitations, reminders, and thank-you messages in the ContextHub section.
              </p>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing || !smtpConfig.host || !smtpConfig.port || (smtpConfig.requireAuth && (!smtpConfig.username || !smtpConfig.password))}
            className={`px-4 py-2 border border-gray-300 rounded-md ${
              testing || !smtpConfig.host || !smtpConfig.port || (smtpConfig.requireAuth && (!smtpConfig.username || !smtpConfig.password))
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {testing ? (
              <>
                <span className="inline-block w-4 h-4 mr-2 border-2 border-gray-500 border-t-gray-200 rounded-full animate-spin"></span>
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </button>
          
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving || !smtpConfig.host || !smtpConfig.port || (smtpConfig.requireAuth && (!smtpConfig.username || !smtpConfig.password))}
            className={`px-4 py-2 flex items-center ${
              saving || !smtpConfig.host || !smtpConfig.port || (smtpConfig.requireAuth && (!smtpConfig.username || !smtpConfig.password))
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white rounded-md`}
          >
            {saving ? (
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

export default EmailSettings;