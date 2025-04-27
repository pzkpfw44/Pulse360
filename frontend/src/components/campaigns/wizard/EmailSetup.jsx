// In frontend/src/components/campaigns/wizard/EmailSetup.jsx

import React, { useState, useEffect } from 'react';
import { Mail, FileText, Check, Edit, ArrowRight, AlertTriangle, Info } from 'lucide-react';
import api from '../../../services/api';

const EmailSetup = ({ data, onDataChange, onNext }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTemplateType, setSelectedTemplateType] = useState('invitation');
  const [selectedRecipientType, setSelectedRecipientType] = useState('self');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  // Initialize with structured data if available, otherwise empty object
  const [emailTemplates, setEmailTemplates] = useState(() => {
     const initial = data.emailTemplates || {};
     // Ensure initial structure
     if (!initial.invitation) initial.invitation = {};
     if (!initial.reminder) initial.reminder = {};
     if (!initial.thank_you) initial.thank_you = {};
     if (!initial.instruction) initial.instruction = {};
     return initial;
  });
  const [showFormatted, setShowFormatted] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [currentSubject, setCurrentSubject] = useState('');
  const [currentContent, setCurrentContent] = useState('');
  const [validationMessage, setValidationMessage] = useState('');


  useEffect(() => {
    fetchTemplates();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update parent component when emailTemplates state changes
  useEffect(() => {
    onDataChange({ emailTemplates });
    validateTemplates(); // Re-validate whenever templates change
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailTemplates, onDataChange]);


  // Update local state (selectedTemplate, subject, content) when selections change
  useEffect(() => {
    const template = getSelectedTemplate();
    if (template) {
      setSelectedTemplate(template);
      setCurrentSubject(template.subject || '');
      setCurrentContent(template.content || '');
      setEditMode(false); // Exit edit mode when selection changes
    } else {
      setSelectedTemplate(null);
      setCurrentSubject('');
      setCurrentContent('');
      setEditMode(false);
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateType, selectedRecipientType]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      // Load default templates
      const response = await api.get('/communication-templates/defaults');

      if (response.data && response.data.templates) {
        setTemplates(response.data.templates);

        // If we don't already have templates in our data, set defaults
        if (!data.emailTemplates || Object.keys(data.emailTemplates).length === 0 || Object.values(data.emailTemplates).every(type => Object.keys(type).length === 0)) {
          const newEmailTemplates = { invitation: {}, reminder: {}, thank_you: {}, instruction: {} };

          response.data.templates.forEach(template => {
            if (template.isDefault) {
              if (!newEmailTemplates[template.templateType]) {
                newEmailTemplates[template.templateType] = {};
              }
              newEmailTemplates[template.templateType][template.recipientType] = template;
            }
          });
          setEmailTemplates(newEmailTemplates);
        } else {
           // Ensure the structure exists even if loaded from data
            const currentTemplates = { ...data.emailTemplates };
             if (!currentTemplates.invitation) currentTemplates.invitation = {};
             if (!currentTemplates.reminder) currentTemplates.reminder = {};
             if (!currentTemplates.thank_you) currentTemplates.thank_you = {};
             if (!currentTemplates.instruction) currentTemplates.instruction = {};
             setEmailTemplates(currentTemplates);
        }
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load email templates. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateTypeChange = (type) => {
    if (editMode && selectedTemplate) {
      saveTemplateChanges(); // Attempt to save before switching
    }
    setSelectedTemplateType(type);
    // useEffect will handle updating selectedTemplate and resetting editMode
  };

  const handleRecipientTypeChange = (type) => {
     if (editMode && selectedTemplate) {
      saveTemplateChanges(); // Attempt to save before switching
    }
    setSelectedRecipientType(type);
     // useEffect will handle updating selectedTemplate and resetting editMode
  };

  const getSelectedTemplate = () => {
    // Use the current state directly
    return emailTemplates[selectedTemplateType]?.[selectedRecipientType] || null;
  };


  const loadTemplateForEditing = (templateToLoad) => {
    if (!templateToLoad) return;

     // Update the central emailTemplates state
     setEmailTemplates(prev => {
        const updated = { ...prev };
        if (!updated[selectedTemplateType]) {
            updated[selectedTemplateType] = {};
        }
        updated[selectedTemplateType][selectedRecipientType] = templateToLoad;
        return updated;
     });

    // Update local state for the editor view immediately
    setSelectedTemplate(templateToLoad);
    setCurrentSubject(templateToLoad.subject || '');
    setCurrentContent(templateToLoad.content || '');
    setEditMode(false); // Ensure we exit edit mode when loading a new template
  };


  const saveTemplateChanges = () => {
    if (!selectedTemplate) return;

    // Create the updated template object
     const updatedTemplateData = {
        ...selectedTemplate,
        subject: currentSubject,
        content: currentContent
    };

    // Update the central emailTemplates state
    setEmailTemplates(prev => {
        const updated = { ...prev };
        // Ensure the structure exists
        if (!updated[selectedTemplateType]) {
            updated[selectedTemplateType] = {};
        }
        updated[selectedTemplateType][selectedRecipientType] = updatedTemplateData;
        return updated;
    });


    setEditMode(false); // Exit edit mode after saving
    setSelectedTemplate(updatedTemplateData); // Update the selectedTemplate state as well
  };

  const formatPreview = (content) => {
    if (!content) return '';

    // Replace template variables with example values
    let formatted = content;

    formatted = formatted.replace(/\{targetName\}/g, 'Alex Smith');
    formatted = formatted.replace(/\{assessorName\}/g, 'Jamie Taylor');
    formatted = formatted.replace(/\{campaignName\}/g, 'Q2 Leadership Assessment');
    formatted = formatted.replace(/\{deadline\}/g, 'June 15, 2025');
    formatted = formatted.replace(/\{feedbackUrl\}/g, '<a href=\"#\" target=\"_blank\" style=\"color: #007bff;\">https://feedback.pulse360.com/f/abc123</a>');
    formatted = formatted.replace(/\{companyName\}/g, 'Acme Corporation');

    // Basic HTML rendering (replace newlines with <br>)
     formatted = formatted.replace(/\n/g, '<br />');

    return formatted;
  };

  const toggleShowFormatted = () => {
    setShowFormatted(!showFormatted);
  };

  // Check if all required templates are selected
  const validateTemplates = () => {
     setValidationMessage(''); // Clear previous message

    // Check if invitation templates exist and have at least one recipient type defined
    if (!emailTemplates.invitation || Object.keys(emailTemplates.invitation).length === 0) {
      setValidationMessage('At least one Invitation email template must be configured.');
      return false;
    }

    // Check if the selected invitation template has content
    const invitationTemplates = emailTemplates.invitation;
    let hasValidInvitation = false;
    for (const recipientType in invitationTemplates) {
        if (invitationTemplates[recipientType] && invitationTemplates[recipientType].content) {
            hasValidInvitation = true;
            break;
        }
    }

    if (!hasValidInvitation) {
       setValidationMessage('The selected Invitation email template must have content.');
       return false;
    }

    return true; // All checks passed
  };


  // Removed handleNextClick function as the button is removed.

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading email templates...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Email Templates</h2>
        <p className="text-gray-600">
          Customize the emails that will be sent to assessors during the campaign. Default templates are provided.
        </p>
      </div>

       {validationMessage && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
            <p>{validationMessage}</p>
            </div>
       )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p>{error}</p>
          <button
            className="text-red-700 underline mt-1"
            onClick={fetchTemplates}
          >
            Try Again
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Template Types */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">Email Types</h3>
          </div>

          <div className="p-4">
            <div className="space-y-2">
              {/* Invitation Button */}
              <button
                className={`w-full text-left px-3 py-2 rounded-md ${
                  selectedTemplateType === 'invitation'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => handleTemplateTypeChange('invitation')}
              >
                <div className="flex items-start">
                  <Mail className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Invitation <span className="text-red-500">*</span></div>
                    <div className="text-xs text-gray-500">Initial email sent to assessors</div>
                  </div>
                </div>
              </button>

                {/* Reminder Button */}
              <button
                className={`w-full text-left px-3 py-2 rounded-md ${
                  selectedTemplateType === 'reminder'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => handleTemplateTypeChange('reminder')}
              >
                 <div className="flex items-start">
                  <Mail className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Reminder</div>
                    <div className="text-xs text-gray-500">Follow-up for non-responders</div>
                  </div>
                 </div>
              </button>

               {/* Thank You Button */}
              <button
                className={`w-full text-left px-3 py-2 rounded-md ${
                  selectedTemplateType === 'thank_you'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => handleTemplateTypeChange('thank_you')}
              >
                 <div className="flex items-start">
                   <Mail className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Thank You</div>
                    <div className="text-xs text-gray-500">Sent after feedback completion</div>
                  </div>
                 </div>
              </button>

               {/* Instructions Button */}
              <button
                className={`w-full text-left px-3 py-2 rounded-md ${
                  selectedTemplateType === 'instruction'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => handleTemplateTypeChange('instruction')}
              >
                 <div className="flex items-start">
                  <FileText className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Instructions</div>
                    <div className="text-xs text-gray-500">Guidelines for completing feedback</div>
                  </div>
                </div>
              </button>
            </div>
             <p className="mt-4 text-xs text-gray-500"><span className="text-red-500">*</span> Required</p>
          </div>
        </div>

        {/* Middle Column - Recipient Types & Available Templates */}
        <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col">
          {/* Recipient Types */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">Recipient Type</h3>
          </div>
          <div className="p-4">
             <div className="space-y-2">
                {['self', 'manager', 'peer', 'direct_report', 'external'].map(type => (
                    <button
                        key={type}
                        className={`w-full text-left px-3 py-2 rounded-md flex justify-between items-center ${
                        selectedRecipientType === type
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => handleRecipientTypeChange(type)}
                    >
                        <span>{type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                        {/* Show checkmark if a template is selected for this type */}
                        {emailTemplates[selectedTemplateType]?.[type] && (
                           <Check className="h-4 w-4 text-green-500" />
                        )}
                    </button>
                ))}
            </div>
          </div>

          {/* Template Selection Section */}
          <div className="border-t border-gray-200 p-4 flex-grow overflow-y-auto">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Available Templates for Selection</h4>
             <p className="text-xs text-gray-500 mb-3">Select a template below to assign it to the currently selected Email Type and Recipient Type.</p>
            <div className="space-y-2">
              {templates
                .filter(t => t.templateType === selectedTemplateType && t.recipientType === selectedRecipientType)
                .map(template => (
                  <div
                    key={template.id}
                    className={`p-3 border rounded-md cursor-pointer ${
                      selectedTemplate?.id === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => loadTemplateForEditing(template)}
                  >
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-xs text-gray-500">{template.isDefault ? 'Default Template' : 'Custom Template'}</p>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <Check className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                  </div>
                ))}
                 {templates.filter(t => t.templateType === selectedTemplateType && t.recipientType === selectedRecipientType).length === 0 && (
                    <p className="text-sm text-gray-500 italic">No specific templates available for this type. You can edit the currently assigned template or create a new one in Communication Templates.</p>
                 )}
            </div>
             <a href="/communication-templates" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center text-sm text-blue-600 hover:text-blue-800">
               Manage Communication Templates <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </div>

        </div>

        {/* Right Column - Template Editor */}
        <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700">
                 {selectedTemplate ? `Editing: ${selectedTemplate.name}` : 'Template Editor'} ({selectedTemplateType.replace('_', ' ')} / {selectedRecipientType.replace('_', ' ')})
            </h3>
            <div className="flex items-center space-x-3">
              {editMode ? (
                <button
                  className="text-sm text-green-600 hover:text-green-800 flex items-center"
                  onClick={saveTemplateChanges}
                   disabled={!selectedTemplate}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Save Changes
                </button>
              ) : (
                <button
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  onClick={() => setEditMode(true)}
                  disabled={!selectedTemplate}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
              )}
              <button
                className="text-sm text-gray-600 hover:text-gray-800"
                onClick={toggleShowFormatted}
                 disabled={!selectedTemplate}
              >
                {showFormatted ? 'Raw' : 'Preview'}
              </button>
            </div>
          </div>

          <div className="p-4 flex-grow overflow-y-auto border-b border-gray-200">
            {selectedTemplate ? (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  {editMode ? (
                    <input
                      type="text"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={currentSubject}
                      onChange={(e) => setCurrentSubject(e.target.value)}
                    />
                  ) : (
                    <div className="mt-1 border border-transparent rounded-md px-3 py-2 text-sm bg-gray-50">
                      {currentSubject || '(No subject)'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                  {editMode ? (
                    <textarea
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
                      rows="15"
                      value={currentContent}
                      onChange={(e) => setCurrentContent(e.target.value)}
                       placeholder="Enter email content here. Use variables from the list below."
                    />
                  ) : (
                    <div className="mt-1 border border-gray-200 rounded-md p-3 bg-gray-50 min-h-[300px] max-h-[450px] overflow-y-auto">
                      {showFormatted ? (
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: formatPreview(currentContent || '') || '<p class="italic text-gray-500">(No content)</p>'
                          }}
                        />
                      ) : (
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                          {currentContent || '(No content)'}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 flex flex-col items-center justify-center h-full">
                <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No template configured</p>
                <p className="text-sm text-gray-400 mt-2 text-center">
                  Select an email type and recipient type, then choose an available template or edit the current selection.
                </p>
              </div>
            )}
          </div>

          <div className="p-4 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Available Variables:</h4>
            <div className="text-xs text-gray-600 grid grid-cols-2 gap-x-4 gap-y-1">
              <p><code>{'{targetName}'}</code></p>
              <p><code>{'{assessorName}'}</code></p>
              <p><code>{'{campaignName}'}</code></p>
              <p><code>{'{deadline}'}</code></p>
              <p><code>{'{feedbackUrl}'}</code></p>
              <p><code>{'{companyName}'}</code></p>
            </div>
          </div>
        </div>
      </div>

      {/* The redundant button block that was here has been removed */}

    </div>
  );
};

export default EmailSetup;