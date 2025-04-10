import React, { useState } from 'react';
import { Palette, Save, RefreshCw } from 'lucide-react';
import api from '../../services/api';

const BrandingSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [brandingSettings, setBrandingSettings] = useState({
    companyName: '',
    tone: 'professional',
    formality: 'formal',
    personality: 'helpful',
    industry: '',
    keyValues: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBrandingSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // This would normally save to your API
      // For now, just simulate a save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation:
      // await api.put('/settings/branding', brandingSettings);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving branding settings:', err);
      setError('Failed to save branding settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-5 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center">
          <Palette className="h-6 w-6 text-blue-500 mr-2" />
          <h2 className="text-lg font-semibold">Company Branding & Voice</h2>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Configure how your brand identity is reflected in AI-generated communications
        </p>
      </div>

      <div className="p-6 space-y-6">
        {saveSuccess && (
          <div className="p-4 mb-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
            Settings saved successfully!
          </div>
        )}
        
        {error && (
          <div className="p-4 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Company Identity</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                value={brandingSettings.companyName}
                onChange={handleInputChange}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Acme Corporation"
              />
            </div>
            
            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
                Industry
              </label>
              <input
                type="text"
                id="industry"
                name="industry"
                value={brandingSettings.industry}
                onChange={handleInputChange}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Technology, Healthcare, Finance, etc."
              />
            </div>
          </div>
          
          <div className="mb-6">
            <label htmlFor="keyValues" className="block text-sm font-medium text-gray-700 mb-1">
              Key Values & Principles
            </label>
            <textarea
              id="keyValues"
              name="keyValues"
              value={brandingSettings.keyValues}
              onChange={handleInputChange}
              rows={3}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Describe your company's core values and principles (e.g., innovation, integrity, customer focus)"
            />
          </div>
        </div>
        
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">Communication Style</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-1">
                Tone
              </label>
              <select
                id="tone"
                name="tone"
                value={brandingSettings.tone}
                onChange={handleInputChange}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
                <option value="enthusiastic">Enthusiastic</option>
                <option value="authoritative">Authoritative</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="formality" className="block text-sm font-medium text-gray-700 mb-1">
                Formality Level
              </label>
              <select
                id="formality"
                name="formality"
                value={brandingSettings.formality}
                onChange={handleInputChange}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              >
                <option value="formal">Formal</option>
                <option value="semiformal">Semi-formal</option>
                <option value="informal">Informal</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="personality" className="block text-sm font-medium text-gray-700 mb-1">
                Personality
              </label>
              <select
                id="personality"
                name="personality"
                value={brandingSettings.personality}
                onChange={handleInputChange}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              >
                <option value="helpful">Helpful</option>
                <option value="innovative">Innovative</option>
                <option value="collaborative">Collaborative</option>
                <option value="direct">Direct</option>
                <option value="empathetic">Empathetic</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="p-5 bg-blue-50 border border-blue-100 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Preview: How AI Will Sound</h3>
          <p className="text-sm text-blue-700 italic mb-4">
            {getPreviewText(brandingSettings)}
          </p>
        </div>
          
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin h-4 w-4 mr-2" />
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

// Helper function to generate a preview based on selected settings
function getPreviewText(settings) {
  const { tone, formality, personality } = settings;
  
  const toneTexts = {
    professional: "We value your input and appreciate your participation.",
    friendly: "We're excited to hear your thoughts and really appreciate you taking part!",
    casual: "Hey there! We'd love to get your input on this.",
    enthusiastic: "We're thrilled to have your valuable insights and participation!",
    authoritative: "Your prompt participation is expected and will be greatly valued."
  };
  
  const formalityAdjustments = {
    formal: text => text.replace(/we're/gi, "we are").replace(/you're/gi, "you are").replace(/don't/gi, "do not").replace(/can't/gi, "cannot"),
    semiformal: text => text,
    informal: text => text.replace("We value", "We really value").replace("appreciate", "appreciate so much")
  };
  
  const personalityAdditions = {
    helpful: " We're here to assist if you have any questions.",
    innovative: " This feedback will help drive our forward-thinking approach.",
    collaborative: " Together, we can create meaningful insights through this process.",
    direct: " Your honest feedback is essential for our improvement.",
    empathetic: " We understand your time is valuable and appreciate your contribution."
  };
  
  let text = toneTexts[tone] || toneTexts.professional;
  text = formalityAdjustments[formality](text);
  text += personalityAdditions[personality] || "";
  
  return text;
}

export default BrandingSettings;