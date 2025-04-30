// frontend/src/components/communication/TemplateEditor.jsx

import React, { useState, useEffect } from 'react';
import { Save, X, Eye, Code, Wand, Clock } from 'lucide-react'; // Keep Clock icon
import api, { communicationTemplatesApi } from '../../services/api';

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

  const [brandingSettings, setBrandingSettings] = useState({
      companyName: 'Your Company',
      primaryColor: '#3B82F6',
      secondaryColor: '#2563EB'
  });

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

    try {
      const storedSettings = localStorage.getItem('brandingSettings');
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        setBrandingSettings(prev => ({
            ...prev,
            companyName: parsedSettings.companyName || prev.companyName,
            primaryColor: parsedSettings.primaryColor || prev.primaryColor,
            secondaryColor: parsedSettings.secondaryColor || prev.secondaryColor
        }));
      }
    } catch (err) {
      console.warn('Error reading branding settings from localStorage:', err);
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
    if (!validateForm()) return;
    try {
      setIsSaving(true);
      if (onSave) await onSave(formData);
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
      setErrorMessage('');
      try {
        const fluxStatusResponse = await api.get('/settings/flux/status');
        if (!fluxStatusResponse.data.isConfigured) {
          setErrorMessage('AI generation is not available: Flux AI API key is not configured. Please add your API key in Settings > Flux AI.');
          setIsSaving(false);
          return;
        }
      } catch (error) {
        console.warn('Could not check Flux AI configuration status:', error);
      }

      let companyVoiceSettings;
      try {
        const settingsResponse = await api.get('/settings/branding');
        companyVoiceSettings = {
          tone: settingsResponse.data.tone || 'professional',
          formality: settingsResponse.data.formality || 'formal',
          personality: settingsResponse.data.personality || 'helpful'
        };
      } catch (settingsError) {
        console.warn('Failed to fetch current branding settings for AI, using defaults:', settingsError);
        companyVoiceSettings = { tone: 'professional', formality: 'formal', personality: 'helpful' };
      }

      const response = await communicationTemplatesApi.generateAi({
        templateType: formData.templateType,
        recipientType: formData.recipientType,
        companyVoice: companyVoiceSettings,
        templateId: formData.id,
        forceAI: true
      });

      const generatedTemplate = response.data;
      setFormData(prev => ({
        ...prev,
        subject: generatedTemplate.subject,
        content: generatedTemplate.content
      }));

    } catch (error) {
      console.error('Error generating AI template:', error);
      const errorMsg = error.response?.data?.message || 'Failed to generate template with AI. Please try again.';
      setErrorMessage(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const getPreviewContentText = () => {
    let previewContent = formData.content;
    const exampleValues = {
      '{assessorName}': 'John Smith',
      '{targetName}': 'Jane Doe',
      '{campaignName}': 'Q2 Performance Review',
      '{deadline}': new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
      '{feedbackUrl}': '#',
      '{companyName}': brandingSettings.companyName
    };
    for (const [placeholder, value] of Object.entries(exampleValues)) {
      previewContent = previewContent.replace(new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), value);
    }
    previewContent = previewContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    return previewContent;
  };


  return (
    <div className="bg-white shadow sm:rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {template && template.id ? 'Edit Template' : 'Create New Template'}
          </h3>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              title={previewMode ? 'Switch to Edit Mode' : 'Switch to Preview Mode'}
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

        {/* Error Message Display */}
        {errorMessage && (
          <div className="rounded-md bg-red-50 p-4 mb-4 border border-red-200">
            <div className="flex">
              <div className="flex-shrink-0">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                 </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{errorMessage}</h3>
              </div>
            </div>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            {/* Template Name */}
            <div className="sm:col-span-3">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Template Name *</label>
              <div className="mt-1">
                <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" required />
              </div>
            </div>
            {/* Email Subject */}
            <div className="sm:col-span-3">
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Email Subject Line *</label>
              <div className="mt-1">
                <input type="text" name="subject" id="subject" value={formData.subject} onChange={handleInputChange} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" required />
              </div>
            </div>
            {/* Description */}
            <div className="sm:col-span-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
              <div className="mt-1">
                <input type="text" name="description" id="description" value={formData.description} onChange={handleInputChange} placeholder="Optional: Briefly describe what this template is for" className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" />
              </div>
            </div>
            {/* Template Type */}
            <div className="sm:col-span-3">
              <label htmlFor="templateType" className="block text-sm font-medium text-gray-700">Template Type *</label>
              <div className="mt-1">
                <select id="templateType" name="templateType" value={formData.templateType} onChange={handleInputChange} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" required>
                  <option value="invitation">Invitation</option>
                  <option value="reminder">Reminder</option>
                  <option value="thank_you">Thank You</option>
                  <option value="instruction">Instructions</option>
                </select>
              </div>
            </div>
            {/* Recipient Type */}
            <div className="sm:col-span-3">
              <label htmlFor="recipientType" className="block text-sm font-medium text-gray-700">Recipient Type *</label>
              <div className="mt-1">
                <select id="recipientType" name="recipientType" value={formData.recipientType} onChange={handleInputChange} className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md" required>
                  <option value="all">All Recipients</option>
                  <option value="self">Self</option>
                  <option value="manager">Manager</option>
                  <option value="peer">Peer</option>
                  <option value="direct_report">Direct Report</option>
                  <option value="external">External</option>
                </select>
              </div>
            </div>

             {/* Email Content Area (Textarea or Preview) */}
            <div className="sm:col-span-6">
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">{previewMode ? 'Preview' : 'Email Content *'}</label>
                {!previewMode && (
                  <button
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={isSaving}
                    className={`inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isSaving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'text-white bg-blue-600 hover:bg-blue-700'}`}
                    style={!isSaving ? { backgroundColor: brandingSettings.secondaryColor } : {}}
                  >
                    <Wand className="h-4 w-4 mr-1" />
                    {isSaving ? 'Generating...' : 'Generate with AI'}
                  </button>
                )}
              </div>
              <div className="mt-1">
                {previewMode ? (
                  // START: Updated Preview Section
                  <div className="email-preview-container">
                    <div className="email-preview-card">
                      {/* Header */}
                      <div
                        className="email-preview-header"
                        style={{ background: `linear-gradient(to right, ${brandingSettings.primaryColor}, ${brandingSettings.secondaryColor})` }}
                      >
                        <h2 className="text-xl font-semibold">
                           {/* Derive title from template type */}
                           {formData.templateType === 'invitation' && 'Feedback Invitation'}
                           {formData.templateType === 'reminder' && 'Feedback Reminder'}
                           {formData.templateType === 'thank_you' && 'Thank You'}
                           {formData.templateType === 'instruction' && 'Instructions'}
                           {!['invitation', 'reminder', 'thank_you', 'instruction'].includes(formData.templateType) && 'Email Preview'}
                        </h2>
                      </div>

                      {/* Body */}
                      <div className="email-preview-body">
                        {/* Render the processed AI content */}
                        {/* START: Removed prose class */}
                        <div
                          dangerouslySetInnerHTML={{ __html: getPreviewContentText() }}
                        />
                        {/* END: Removed prose class */}


                        {/* START: Removed placeholder button */}
                        {/* The button generated by AI will be styled via index.css */}
                        {/* END: Removed placeholder button */}


                        {/* Placeholder Deadline Notice */}
                        <div className="email-preview-deadline-box">
                          <Clock />
                          {/* Added space for better alignment if needed */}
                          <span style={{ marginLeft: '0.1rem' }}>
                             Please note that the deadline for submitting your feedback is [Example Deadline Date].
                          </span>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="email-preview-footer">
                        This is an automated message from {brandingSettings.companyName}'s feedback system.
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-500 text-center">
                       <p>This is a preview using example data and brand colors. Actual emails may vary.</p>
                    </div>
                  </div>
                  // END: Updated Preview Section
                ) : (
                  // Edit Mode: Textarea
                  <textarea
                    id="content"
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    rows={15}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md font-mono"
                    required
                    placeholder="Enter your email content here. Use placeholders like {targetName}, {assessorName}, {campaignName}, {deadline}, {feedbackUrl}, {companyName}."
                  />
                )}
              </div>
              {!previewMode && (
                  <p className="mt-2 text-xs text-gray-500">
                      Available placeholders: <code className="text-xs bg-gray-100 p-0.5 rounded">{'{targetName}'}</code>, <code className="text-xs bg-gray-100 p-0.5 rounded">{'{assessorName}'}</code>, <code className="text-xs bg-gray-100 p-0.5 rounded">{'{campaignName}'}</code>, <code className="text-xs bg-gray-100 p-0.5 rounded">{'{deadline}'}</code>, <code className="text-xs bg-gray-100 p-0.5 rounded">{'{feedbackUrl}'}</code>, <code className="text-xs bg-gray-100 p-0.5 rounded">{'{companyName}'}</code>.
                  </p>
              )}
            </div>

            {/* Is Default Checkbox */}
            <div className="sm:col-span-6">
              <div className="relative flex items-start">
                <div className="flex items-center h-5">
                  <input id="isDefault" name="isDefault" type="checkbox" checked={formData.isDefault} onChange={handleInputChange} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded" />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="isDefault" className="font-medium text-gray-700">Set as Default Template</label>
                  <p className="text-gray-500">This template will be used by default for '{formData.templateType}' emails to '{formData.recipientType}' recipients, unless overridden in a campaign.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="mt-8 pt-5 border-t border-gray-200">
             <div className="flex justify-end space-x-3">
                <button type="button" onClick={onCancel} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</button>
                <button type="submit" disabled={isSaving} className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`} style={!isSaving ? { backgroundColor: brandingSettings.primaryColor } : {}}>
                  {isSaving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
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
          </div>
        </form>
      </div>
    </div>
  );
};

export default TemplateEditor;