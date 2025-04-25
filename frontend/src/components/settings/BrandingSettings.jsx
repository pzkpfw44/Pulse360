// frontend/src/components/settings/BrandingSettings.jsx

import React, { useState, useEffect } from 'react';
import { Save, AlertTriangle, RefreshCw, Image } from 'lucide-react';
import api from '../../services/api';

const BrandingSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    keyValues: '',
    tone: 'professional',
    formality: 'formal',
    personality: 'helpful',
    primaryColor: '#3B82F6',
    secondaryColor: '#2563EB'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    // Apply colors to preview elements
    document.documentElement.style.setProperty('--primary-color', formData.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', formData.secondaryColor);
  }, [formData.primaryColor, formData.secondaryColor]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/settings/branding');
      
      const newSettings = {
        companyName: response.data.companyName || '',
        industry: response.data.industry || '',
        keyValues: response.data.keyValues || '',
        tone: response.data.tone || 'professional',
        formality: response.data.formality || 'formal',
        personality: response.data.personality || 'helpful',
        primaryColor: response.data.primaryColor || '#3B82F6',
        secondaryColor: response.data.secondaryColor || '#2563EB'
      };
      
      setFormData(newSettings);
      
      // Save settings to localStorage when loaded
      localStorage.setItem('brandingSettings', JSON.stringify(newSettings));
      
      setError(null);
    } catch (err) {
      console.error('Error fetching branding settings:', err);
      setError('Failed to load branding settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRevertColors = () => {
    setFormData(prev => ({
      ...prev,
      primaryColor: '#3B82F6',
      secondaryColor: '#2563EB'
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      await api.put('/settings/branding', formData);
      
      // Save settings to localStorage when updated
      localStorage.setItem('brandingSettings', JSON.stringify(formData));
      
      setSuccess(true);
      setError(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error saving branding settings:', err);
      setError('Failed to save branding settings. Please try again.');
      setSuccess(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading branding settings...</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Company Branding & Voice
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Configure how your brand identity is reflected in AI-generated communications
        </p>
      </div>

      {error && (
        <div className="mx-6 my-4 bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mx-6 my-4 bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <RefreshCw className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">Settings saved successfully</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Company Identity</h4>
          
          <div className="grid grid-cols-6 gap-6">
            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                Company Name
              </label>
              <input
                type="text"
                name="companyName"
                id="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              />
            </div>

            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
                Industry
              </label>
              <input
                type="text"
                name="industry"
                id="industry"
                value={formData.industry}
                onChange={handleInputChange}
                placeholder="Technology, Healthcare, Finance, etc."
                className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              />
            </div>

            <div className="col-span-6">
              <label htmlFor="keyValues" className="block text-sm font-medium text-gray-700">
                Key Values & Principles
              </label>
              <textarea
                name="keyValues"
                id="keyValues"
                rows="3"
                value={formData.keyValues}
                onChange={handleInputChange}
                placeholder="Describe your company's core values and principles (e.g., innovation, integrity, customer focus)"
                className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              ></textarea>
            </div>
          </div>

          {/* Company Colors */}
          <h4 className="text-md font-medium text-gray-900 mt-8 mb-4">Company Colors</h4>
          
          <div className="grid grid-cols-6 gap-6">
            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700">
                Primary Color
              </label>
              <div className="mt-1 flex items-center">
                <input
                  type="color"
                  name="primaryColor"
                  id="primaryColor"
                  value={formData.primaryColor}
                  onChange={handleInputChange}
                  className="h-10 w-10 border border-gray-300 rounded-md shadow-sm cursor-pointer"
                />
                <input
                  type="text"
                  name="primaryColor"
                  value={formData.primaryColor}
                  onChange={handleInputChange}
                  className="ml-2 flex-1 focus:ring-blue-500 focus:border-blue-500 block shadow-sm sm:text-sm border-gray-300 rounded-md"
                  placeholder="#3B82F6"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Main color for headers, buttons and accents
              </p>
            </div>

            <div className="col-span-6 sm:col-span-3">
              <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700">
                Secondary Color (optional)
              </label>
              <div className="mt-1 flex items-center">
                <input
                  type="color"
                  name="secondaryColor"
                  id="secondaryColor"
                  value={formData.secondaryColor}
                  onChange={handleInputChange}
                  className="h-10 w-10 border border-gray-300 rounded-md shadow-sm cursor-pointer"
                />
                <input
                  type="text"
                  name="secondaryColor"
                  value={formData.secondaryColor}
                  onChange={handleInputChange}
                  className="ml-2 flex-1 focus:ring-blue-500 focus:border-blue-500 block shadow-sm sm:text-sm border-gray-300 rounded-md"
                  placeholder="#2563EB"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Secondary color for gradients and highlights
              </p>
            </div>

            {/* Revert to Default Button */}
            <div className="col-span-6">
              <button
                type="button"
                onClick={handleRevertColors}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Revert to Default Colors
              </button>
            </div>

            {/* Color Preview Section */}
            <div className="col-span-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color Preview
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-md shadow-sm border border-gray-200">
                  <h5 className="text-sm font-medium mb-2">UI Elements</h5>
                  <div className="space-y-2">
                    <button
                      type="button"
                      style={{ backgroundColor: formData.primaryColor }}
                      className="px-3 py-2 rounded text-white text-sm font-medium"
                    >
                      Primary Button
                    </button>
                    <div 
                      className="h-8 rounded" 
                      style={{ background: `linear-gradient(to right, ${formData.primaryColor}, ${formData.secondaryColor})` }}
                    ></div>
                    <div className="flex items-center">
                      <div 
                        className="h-6 w-6 rounded-full mr-2" 
                        style={{ backgroundColor: formData.primaryColor }}
                      ></div>
                      <span className="text-sm" style={{ color: formData.primaryColor }}>
                        Text with primary color
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 rounded-md shadow-sm border border-gray-200">
                  <h5 className="text-sm font-medium mb-2">Sidebar Preview</h5>
                  <div 
                    className="rounded-lg h-28 p-3 text-white"
                    style={{ background: `linear-gradient(to bottom, ${formData.primaryColor}, ${formData.secondaryColor})` }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold" style={{ color: formData.primaryColor }}>
                        P
                      </div>
                      <span className="text-md font-bold">{formData.companyName || 'Pulse360'}</span>
                    </div>
                    <div className="flex gap-2 items-center text-sm">
                      <div className="w-4 h-4 rounded-sm bg-white/20"></div>
                      <span>Dashboard</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h4 className="text-md font-medium text-gray-900 mt-8 mb-4">Communication Style</h4>
          
          <div className="grid grid-cols-6 gap-6">
            <div className="col-span-6 sm:col-span-2">
              <label htmlFor="tone" className="block text-sm font-medium text-gray-700">
                Tone
              </label>
              <select
                id="tone"
                name="tone"
                value={formData.tone}
                onChange={handleInputChange}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
                <option value="enthusiastic">Enthusiastic</option>
                <option value="authoritative">Authoritative</option>
              </select>
            </div>

            <div className="col-span-6 sm:col-span-2">
              <label htmlFor="formality" className="block text-sm font-medium text-gray-700">
                Formality Level
              </label>
              <select
                id="formality"
                name="formality"
                value={formData.formality}
                onChange={handleInputChange}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="formal">Formal</option>
                <option value="semiformal">Semi-formal</option>
                <option value="informal">Informal</option>
              </select>
            </div>

            <div className="col-span-6 sm:col-span-2">
              <label htmlFor="personality" className="block text-sm font-medium text-gray-700">
                Personality
              </label>
              <select
                id="personality"
                name="personality"
                value={formData.personality}
                onChange={handleInputChange}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="helpful">Helpful</option>
                <option value="innovative">Innovative</option>
                <option value="collaborative">Collaborative</option>
                <option value="direct">Direct</option>
                <option value="empathetic">Empathetic</option>
              </select>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-700 mb-2">Preview: How AI Will Sound</h4>
            <p className="text-sm text-blue-600">
              {/* Tone variations */}
              {formData.tone === 'professional' && "We value your input and appreciate your participation. "}
              {formData.tone === 'friendly' && "We really appreciate your input and participation! "}
              {formData.tone === 'casual' && "Thanks for your input! "}
              {formData.tone === 'enthusiastic' && "We're thrilled to receive your input! "}
              {formData.tone === 'authoritative' && "Your input is valuable. "}
              
              {/* Formality variations */}
              {formData.formality === 'formal' && "We are here to assist if you have any questions."}
              {formData.formality === 'semiformal' && "We're here to help if you have any questions."}
              {formData.formality === 'informal' && "Let us know if you need any help!"}
              
              {/* Personality additions */}
              {formData.personality === 'empathetic' && " We understand providing feedback takes time and effort."}
              {formData.personality === 'innovative' && " We're constantly improving this process for you."}
              {formData.personality === 'collaborative' && " Together, we can create meaningful feedback."}
              {formData.personality === 'direct' && " Clear communication makes this process effective."}
              {formData.personality === 'helpful' && " We're here to support you throughout this process."}
            </p>
          </div>
        </div>

        <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            style={{ backgroundColor: formData.primaryColor }}
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BrandingSettings;