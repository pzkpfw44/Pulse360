// frontend/src/components/communication/TemplateEditor.jsx

import React, { useState, useEffect } from 'react';
import { Save, X, Eye, Code, Wand } from 'lucide-react';
import { communicationTemplatesApi } from '../../services/api';

const TemplateEditor = ({ template, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    templateType: 'invitation',
    recipientType: 'all',
    subject: '',
    content: '',
    isDefault: false
  });
  const [previewMode, setPreviewMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setFormData({
        id: template.id || '',
        name: template.name || '',
        description: template.description || '',
        templateType: template.templateType || 'invitation',
        recipientType: template.recipientType || 'all',
        subject: template.subject || '',
        content: template.content || '',
        isDefault: template.isDefault || false
      });
    }
  }, [template]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setErrorMessage('Template name is required');
      return false;
    }
    if (!formData.subject.trim()) {
      setErrorMessage('Subject line is required');
      return false;
    }
    if (!formData.content.trim()) {
      setErrorMessage('Template content is required');
      return false;
    }
    
    setErrorMessage('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSaving(true);
      
      if (onSave) {
        await onSave(formData);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      setErrorMessage('Failed to save template. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateAI = async () => {
    try {
      setIsSaving(true);
      
      // Check if API key is configured first
      try {
        const fluxStatusResponse = await api.get('/settings/flux/status');
        if (!fluxStatusResponse.data.isConfigured) {
          setErrorMessage('AI generation is not available: Flux AI API key is not configured. Please add your API key in Settings > Flux AI.');
          setSaving(false);
          return;
        }
      } catch (error) {
        console.warn('Could not check Flux AI configuration status:', error);
        // Continue anyway, the actual generation call will fail if there's an issue
      }
      
      // First fetch company branding settings
      let brandingSettings;
      try {
        const settingsResponse = await api.get('/settings/branding');
        brandingSettings = {
          tone: settingsResponse.data.tone || 'professional',
          formality: settingsResponse.data.formality || 'formal',
          personality: settingsResponse.data.personality || 'helpful'
        };
        console.log('Using branding settings:', brandingSettings);
      } catch (settingsError) {
        console.warn('Failed to fetch branding settings:', settingsError);
        brandingSettings = {
          tone: 'professional',
          formality: 'formal',
          personality: 'helpful'
        };
      }
      
      // Pass branding settings and forceAI flag to the API
      const response = await communicationTemplatesApi.generateAi({
        templateType: formData.templateType,
        recipientType: formData.recipientType,
        companyVoice: brandingSettings,
        templateId: formData.id,
        forceAI: true  // Add this to force AI even in dev mode
      });
      
      const generatedTemplate = response.data;
      
      setFormData(prev => ({
        ...prev,
        subject: generatedTemplate.subject,
        content: generatedTemplate.content
      }));
      
      setErrorMessage('');
    } catch (error) {
      console.error('Error generating AI template:', error);
      setErrorMessage('Failed to generate template with AI. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Replace placeholders with example values for preview
  const getPreviewContent = () => {
    let previewContent = formData.content;
    
    // Try to get company name from localStorage if available
    let companyName = 'Acme Corp'; // Default fallback
    try {
      const brandingSettings = localStorage.getItem('brandingSettings');
      if (brandingSettings) {
        const settings = JSON.parse(brandingSettings);
        if (settings && settings.companyName) {
          companyName = settings.companyName;
        }
      }
    } catch (err) {
      console.warn('Error getting company name from settings:', err);
    }
    
    const exampleValues = {
      '{assessorName}': 'John Smith',
      '{targetName}': 'Jane Doe',
      '{campaignName}': 'Q2 Leadership Review',
      '{deadline}': new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      '{feedbackUrl}': 'https://pulse360.example.com/feedback/xyz123',
      '{companyName}': companyName // Use the actual company name from settings
    };
    
    for (const [placeholder, value] of Object.entries(exampleValues)) {
      previewContent = previewContent.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return previewContent;
  };

  return (
    <div className="bg-white shadow sm:rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {template && template.id ? 'Edit Template' : 'Create New Template'}
          </h3>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {previewMode ? <Code className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {previewMode ? 'Edit Mode' : 'Preview'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-md bg-red-50 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <X className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{errorMessage}</h3>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Template Name *
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                Email Subject Line *
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="subject"
                  id="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                />
              </div>
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="description"
                  id="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="templateType" className="block text-sm font-medium text-gray-700">
                Template Type *
              </label>
              <div className="mt-1">
                <select
                  id="templateType"
                  name="templateType"
                  value={formData.templateType}
                  onChange={handleInputChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                >
                  <option value="invitation">Invitation</option>
                  <option value="reminder">Reminder</option>
                  <option value="thank_you">Thank You</option>
                  <option value="instruction">Instructions</option>
                </select>
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="recipientType" className="block text-sm font-medium text-gray-700">
                Recipient Type *
              </label>
              <div className="mt-1">
                <select
                  id="recipientType"
                  name="recipientType"
                  value={formData.recipientType}
                  onChange={handleInputChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                >
                  <option value="all">All Recipients</option>
                  <option value="self">Self</option>
                  <option value="manager">Manager</option>
                  <option value="peer">Peer</option>
                  <option value="direct_report">Direct Report</option>
                  <option value="external">External</option>
                </select>
              </div>
            </div>

            <div className="sm:col-span-6">
              <div className="flex justify-between items-center">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                  {previewMode ? 'Preview' : 'Email Content *'}
                </label>
                <button
                  type="button"
                  onClick={handleGenerateAI}
                  className="inline-flex items-center px-3 py-1.5 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Wand className="h-4 w-4 mr-1" />
                  Generate with AI
                </button>
              </div>
              <div className="mt-1">
                {previewMode ? (
                  <div 
                    className="border border-gray-300 rounded-md shadow-sm p-4 min-h-[300px] prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
                  />
                ) : (
                  <textarea
                    id="content"
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    rows={12}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md font-mono"
                    required
                  />
                )}
              </div>
            </div>

            <div className="sm:col-span-6">
              <div className="relative flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="isDefault"
                    name="isDefault"
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={handleInputChange}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="isDefault" className="font-medium text-gray-700">
                    Set as Default Template
                  </label>
                  <p className="text-gray-500">
                    This template will be used by default for {formData.templateType} emails to {formData.recipientType} recipients.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isSaving ? (
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
                  Save Template
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TemplateEditor;