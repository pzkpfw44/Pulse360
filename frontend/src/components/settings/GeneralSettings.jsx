// frontend/src/components/settings/GeneralSettings.jsx

import React, { useState, useEffect } from 'react';
import { Save, Settings, Check, AlertTriangle, Bell } from 'lucide-react';
import api from '../../services/api';

const GeneralSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  
  const [settings, setSettings] = useState({
    companyName: '',
    primaryLanguage: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    timezone: 'UTC',
    defaultPaginationSize: 20,
    // Notification settings
    notificationRefreshEnabled: true,
    notificationRefreshInterval: 120 // in seconds
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real app, this would fetch from the API
      // For now, we'll simulate a successful response
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Load the notification settings from localStorage
      const notificationSettings = getNotificationSettings();
      
      setSettings({
        companyName: 'Your Company Name',
        primaryLanguage: 'en',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        timezone: 'UTC',
        defaultPaginationSize: 20,
        // Add notification settings from localStorage
        notificationRefreshEnabled: notificationSettings.refreshEnabled,
        notificationRefreshInterval: notificationSettings.refreshInterval / 1000 // convert ms to seconds
      });
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get notification settings from localStorage
  const getNotificationSettings = () => {
    try {
      const settingsString = localStorage.getItem('notificationSettings');
      if (settingsString) {
        return JSON.parse(settingsString);
      }
    } catch (err) {
      console.error('Error parsing notification settings:', err);
    }
    
    // Default settings
    return {
      refreshEnabled: true,
      refreshInterval: 120000 // 2 minutes by default
    };
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseInt(value, 10) : value
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // In a real app, this would save to the API
      // For now, we'll simulate a successful save
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Save notification settings to localStorage with consistent structure
      const notificationSettings = {
        refreshEnabled: settings.notificationRefreshEnabled,
        refreshInterval: settings.notificationRefreshInterval * 1000 // convert seconds to ms
      };
      
      // Store settings in localStorage
      localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
      
      // Custom event to ensure all components know settings changed
      const event = new CustomEvent('notificationSettingsChanged', { 
        detail: notificationSettings 
      });
      window.dispatchEvent(event);
      
      // Also trigger standard storage event for compatibility
      window.dispatchEvent(new Event('storage'));
      
      setSuccess('Settings saved successfully');
      
      // Force reset any existing notification timers - we'll add an event listener in NotificationBell
      clearAllNotificationTimers();
      
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Helper to communicate with NotificationBell
  const clearAllNotificationTimers = () => {
    // Create and dispatch a custom event to tell notification bell to reset its timer
    const resetEvent = new CustomEvent('resetNotificationTimer', {
      detail: { timestamp: Date.now() }
    });
    window.dispatchEvent(resetEvent);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-2 text-gray-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 flex items-center">
          <Settings className="h-5 w-5 mr-2 text-blue-500" />
          General Settings
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure basic application settings
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

      {/* Settings Form */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              value={settings.companyName}
              onChange={handleChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="primaryLanguage" className="block text-sm font-medium text-gray-700 mb-1">
              Primary Language
            </label>
            <select
              id="primaryLanguage"
              name="primaryLanguage"
              value={settings.primaryLanguage}
              onChange={handleChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="dateFormat" className="block text-sm font-medium text-gray-700 mb-1">
              Date Format
            </label>
            <select
              id="dateFormat"
              name="dateFormat"
              value={settings.dateFormat}
              onChange={handleChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="timeFormat" className="block text-sm font-medium text-gray-700 mb-1">
              Time Format
            </label>
            <select
              id="timeFormat"
              name="timeFormat"
              value={settings.timeFormat}
              onChange={handleChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="12h">12-hour (AM/PM)</option>
              <option value="24h">24-hour</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
              Timezone
            </label>
            <select
              id="timezone"
              name="timezone"
              value={settings.timezone}
              onChange={handleChange}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="defaultPaginationSize" className="block text-sm font-medium text-gray-700 mb-1">
              Default Items Per Page
            </label>
            <input
              type="number"
              id="defaultPaginationSize"
              name="defaultPaginationSize"
              value={settings.defaultPaginationSize}
              onChange={handleChange}
              min="5"
              max="100"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
        
        {/* Notification Settings */}
        <div className="mt-8 border-t pt-6">
          <h3 className="text-md font-medium text-gray-900 flex items-center mb-4">
            <Bell className="h-4 w-4 mr-2 text-blue-500" />
            Notification Settings
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="notificationRefreshEnabled"
                  name="notificationRefreshEnabled"
                  checked={settings.notificationRefreshEnabled}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="notificationRefreshEnabled" className="ml-2 block text-sm text-gray-700">
                  Enable automatic notification refresh
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                When enabled, notifications will be automatically refreshed at the specified interval
              </p>
            </div>
            
            <div>
              <label htmlFor="notificationRefreshInterval" className="block text-sm font-medium text-gray-700 mb-1">
                Refresh Interval (seconds)
              </label>
              <input
                type="number"
                id="notificationRefreshInterval"
                name="notificationRefreshInterval"
                value={settings.notificationRefreshInterval}
                onChange={handleChange}
                min="10"
                max="3600"
                disabled={!settings.notificationRefreshEnabled}
                className={`w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  !settings.notificationRefreshEnabled ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">
                {settings.notificationRefreshInterval >= 60 
                  ? `${Math.floor(settings.notificationRefreshInterval / 60)} minute(s) and ${settings.notificationRefreshInterval % 60} second(s)`
                  : `${settings.notificationRefreshInterval} seconds`}
              </p>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 flex items-center ${
              saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            } text-white rounded-md save-settings`}
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

export default GeneralSettings;