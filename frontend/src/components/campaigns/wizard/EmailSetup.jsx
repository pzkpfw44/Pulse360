// In frontend/src/components/campaigns/wizard/EmailSetup.jsx

import React, { useState, useEffect } from 'react';
import { Mail, FileText, Check, Edit, ArrowRight } from 'lucide-react';
import api from '../../../services/api';

const EmailSetup = ({ data, onDataChange, onNext }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTemplateType, setSelectedTemplateType] = useState('invitation');
  const [selectedRecipientType, setSelectedRecipientType] = useState('self');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [emailTemplates, setEmailTemplates] = useState(data.emailTemplates || {});
  const [showFormatted, setShowFormatted] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [currentSubject, setCurrentSubject] = useState('');
  const [currentContent, setCurrentContent] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Save selected templates to parent component
  useEffect(() => {
    onDataChange({ emailTemplates });
  }, [emailTemplates]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      // Load default templates
      const response = await api.get('/communication-templates/defaults');
      
      if (response.data && response.data.templates) {
        setTemplates(response.data.templates);
        
        // If we don't already have templates in our data, set defaults
        if (!data.emailTemplates || Object.keys(data.emailTemplates).length === 0) {
          const newEmailTemplates = {};
          
          // Find default templates for each type & recipient
          response.data.templates.forEach(template => {
            if (template.isDefault) {
              if (!newEmailTemplates[template.templateType]) {
                newEmailTemplates[template.templateType] = {};
              }
              newEmailTemplates[template.templateType][template.recipientType] = template;
            }
          });
          
          setEmailTemplates(newEmailTemplates);
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
    // If in edit mode, save changes before switching
    if (editMode && selectedTemplate) {
      saveTemplateChanges();
    }
    
    setSelectedTemplateType(type);
    setEditMode(false); // Exit edit mode when changing template type
  };

  const handleRecipientTypeChange = (type) => {
    // If in edit mode, save changes before switching
    if (editMode && selectedTemplate) {
      saveTemplateChanges();
    }
    
    setSelectedRecipientType(type);
    setEditMode(false); // Exit edit mode when changing recipient type
  };

  const getSelectedTemplate = () => {
    if (emailTemplates[selectedTemplateType] && 
        emailTemplates[selectedTemplateType][selectedRecipientType]) {
      return emailTemplates[selectedTemplateType][selectedRecipientType];
    }
    
    // Find template in all templates
    return templates.find(t => 
      t.templateType === selectedTemplateType && 
      t.recipientType === selectedRecipientType
    );
  };

  const loadTemplateForEditing = (template) => {
    if (!template) return;
    
    setSelectedTemplate(template);
    setCurrentSubject(template.subject || '');
    setCurrentContent(template.content || '');
    
    // Save the template selection immediately to emailTemplates state
    const updatedTemplates = {...emailTemplates};
    
    if (!updatedTemplates[selectedTemplateType]) {
      updatedTemplates[selectedTemplateType] = {};
    }
    
    updatedTemplates[selectedTemplateType][selectedRecipientType] = template;
    setEmailTemplates(updatedTemplates);
  };

  const saveTemplateChanges = () => {
    if (!selectedTemplate) return;
    
    // Update the template in our state
    const updatedTemplates = {...emailTemplates};
    
    if (!updatedTemplates[selectedTemplateType]) {
      updatedTemplates[selectedTemplateType] = {};
    }
    
    updatedTemplates[selectedTemplateType][selectedRecipientType] = {
      ...selectedTemplate,
      subject: currentSubject,
      content: currentContent
    };
    
    setEmailTemplates(updatedTemplates);
    setEditMode(false);
  };

  const formatPreview = (content) => {
    if (!content) return '';
    
    // Replace template variables with example values
    let formatted = content;
    
    formatted = formatted.replace(/\{targetName\}/g, 'Alex Smith');
    formatted = formatted.replace(/\{assessorName\}/g, 'Jamie Taylor');
    formatted = formatted.replace(/\{campaignName\}/g, 'Q2 Leadership Assessment');
    formatted = formatted.replace(/\{deadline\}/g, 'June 15, 2025');
    formatted = formatted.replace(/\{feedbackUrl\}/g, 'https://feedback.pulse360.com/f/abc123');
    formatted = formatted.replace(/\{companyName\}/g, 'Acme Corporation');
    
    return formatted;
  };

  const toggleShowFormatted = () => {
    setShowFormatted(!showFormatted);
  };

  // Check if all required templates are selected
  const validateTemplates = () => {
    // Check if we have at least one invitation template for any recipient type
    if (!emailTemplates['invitation'] || 
        Object.keys(emailTemplates['invitation']).length === 0) {
      return false;
    }
    
    // Ensure the templates data is properly structured
    for (const type in emailTemplates) {
      for (const recipient in emailTemplates[type]) {
        // Ensure each template has an id and content
        if (!emailTemplates[type][recipient].id || 
            !emailTemplates[type][recipient].content) {
          return false;
        }
      }
    }
    
    return true;
  };

  const prepareTemplatesForSubmission = () => {
    // Create a clean copy with the structure the backend expects
    const cleanTemplates = {};
    
    // Ensure all required email types exist
    const requiredTypes = ['invitation', 'reminder', 'thank_you', 'instruction'];
    
    requiredTypes.forEach(type => {
      if (emailTemplates[type]) {
        cleanTemplates[type] = {};
        
        // For each recipient type in this email type
        Object.keys(emailTemplates[type]).forEach(recipient => {
          // Make sure we have a complete template object
          if (emailTemplates[type][recipient] && 
              emailTemplates[type][recipient].id) {
            cleanTemplates[type][recipient] = emailTemplates[type][recipient];
          }
        });
      }
    });
    
    return cleanTemplates;
  };

  const handleNextClick = () => {
    // If in edit mode, save changes first
    if (editMode) {
      saveTemplateChanges();
    }
    
    // Ensure we have all required templates
    if (!validateTemplates()) {
      alert('Please select at least one invitation template before proceeding.');
      return;
    }
    
    // Prepare templates in the expected format
    const preparedTemplates = prepareTemplatesForSubmission();
    
    // Log what we're sending to the parent
    console.log('Sending to parent component:', { emailTemplates: preparedTemplates });
    
    // Pass the prepared templates to the parent
    onNext({ emailTemplates: preparedTemplates });
  };

  // Update the currently selected template
  useEffect(() => {
    const template = getSelectedTemplate();
    if (template) {
      setSelectedTemplate(template);
      setCurrentSubject(template.subject || '');
      setCurrentContent(template.content || '');
    } else {
      setSelectedTemplate(null);
      setCurrentSubject('');
      setCurrentContent('');
    }
  }, [selectedTemplateType, selectedRecipientType]);

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
          Customize the emails that will be sent to assessors during the campaign.
        </p>
      </div>

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
              <button
                className={`w-full text-left px-3 py-2 rounded-md ${
                  selectedTemplateType === 'invitation' 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => handleTemplateTypeChange('invitation')}
              >
                <div className="flex items-start">
                  <Mail className="h-5 w-5 mr-2 mt-0.5" />
                  <div>
                    <div className="font-medium">Invitation</div>
                    <div className="text-xs text-gray-500">Initial email sent to assessors</div>
                  </div>
                </div>
              </button>
              
              <button
                className={`w-full text-left px-3 py-2 rounded-md ${
                  selectedTemplateType === 'reminder' 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => handleTemplateTypeChange('reminder')}
              >
                <div className="flex items-start">
                  <Mail className="h-5 w-5 mr-2 mt-0.5" />
                  <div>
                    <div className="font-medium">Reminder</div>
                    <div className="text-xs text-gray-500">Follow-up for assessors who haven't completed</div>
                  </div>
                </div>
              </button>
              
              <button
                className={`w-full text-left px-3 py-2 rounded-md ${
                  selectedTemplateType === 'thank_you' 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => handleTemplateTypeChange('thank_you')}
              >
                <div className="flex items-start">
                  <Mail className="h-5 w-5 mr-2 mt-0.5" />
                  <div>
                    <div className="font-medium">Thank You</div>
                    <div className="text-xs text-gray-500">Sent after feedback completion</div>
                  </div>
                </div>
              </button>
              
              <button
                className={`w-full text-left px-3 py-2 rounded-md ${
                  selectedTemplateType === 'instruction' 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => handleTemplateTypeChange('instruction')}
              >
                <div className="flex items-start">
                  <FileText className="h-5 w-5 mr-2 mt-0.5" />
                  <div>
                    <div className="font-medium">Instructions</div>
                    <div className="text-xs text-gray-500">Guidelines for completing feedback</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
        
        {/* Middle Column - Recipient Types */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">Recipient Type</h3>
          </div>
          
          <div className="p-4">
            <div className="space-y-2">
              <button
                className={`w-full text-left px-3 py-2 rounded-md ${
                  selectedRecipientType === 'self' 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => handleRecipientTypeChange('self')}
              >
                <div className="flex items-start">
                  <div>
                    <div className="font-medium">Self</div>
                    <div className="text-xs text-gray-500">For the target employee's self-assessment</div>
                  </div>
                </div>
              </button>
              
              <button
                className={`w-full text-left px-3 py-2 rounded-md ${
                  selectedRecipientType === 'manager' 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => handleRecipientTypeChange('manager')}
              >
                <div className="flex items-start">
                  <div>
                    <div className="font-medium">Manager</div>
                    <div className="text-xs text-gray-500">For the target employee's managers</div>
                  </div>
                </div>
              </button>
              
              <button
                className={`w-full text-left px-3 py-2 rounded-md ${
                  selectedRecipientType === 'peer' 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => handleRecipientTypeChange('peer')}
              >
                <div className="flex items-start">
                  <div>
                    <div className="font-medium">Peer</div>
                    <div className="text-xs text-gray-500">For the target employee's colleagues</div>
                  </div>
                </div>
              </button>
              
              <button
                className={`w-full text-left px-3 py-2 rounded-md ${
                  selectedRecipientType === 'direct_report' 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => handleRecipientTypeChange('direct_report')}
              >
                <div className="flex items-start">
                  <div>
                    <div className="font-medium">Direct Report</div>
                    <div className="text-xs text-gray-500">For people reporting to the target employee</div>
                  </div>
                </div>
              </button>
              
              <button
                className={`w-full text-left px-3 py-2 rounded-md ${
                  selectedRecipientType === 'external' 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => handleRecipientTypeChange('external')}
              >
                <div className="flex items-start">
                  <div>
                    <div className="font-medium">External</div>
                    <div className="text-xs text-gray-500">For stakeholders outside the organization</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Template Selection Section */}
          <div className="border-t border-gray-200 p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Available Templates</h4>
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
            </div>
          </div>
          
          {/* Template Selection Status */}
          <div className="border-t border-gray-200 p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Template Selection Status</h4>
            <div className="text-xs space-y-2">
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full mr-2 ${emailTemplates['invitation'] && Object.keys(emailTemplates['invitation']).length > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Invitation Templates {emailTemplates['invitation'] && Object.keys(emailTemplates['invitation']).length > 0 ? '✓' : '(Required)'}</span>
              </div>
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full mr-2 ${emailTemplates['reminder'] && Object.keys(emailTemplates['reminder']).length > 0 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span>Reminder Templates {emailTemplates['reminder'] && Object.keys(emailTemplates['reminder']).length > 0 ? '✓' : '(Optional)'}</span>
              </div>
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full mr-2 ${emailTemplates['thank_you'] && Object.keys(emailTemplates['thank_you']).length > 0 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span>Thank You Templates {emailTemplates['thank_you'] && Object.keys(emailTemplates['thank_you']).length > 0 ? '✓' : '(Optional)'}</span>
              </div>
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full mr-2 ${emailTemplates['instruction'] && Object.keys(emailTemplates['instruction']).length > 0 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span>Instruction Templates {emailTemplates['instruction'] && Object.keys(emailTemplates['instruction']).length > 0 ? '✓' : '(Optional)'}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column - Template Editor */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700">Template Editor</h3>
            <div className="flex items-center space-x-3">
              {editMode ? (
                <button 
                  className="text-sm text-green-600 hover:text-green-800 flex items-center"
                  onClick={saveTemplateChanges}
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
                  Edit Template
                </button>
              )}
              <button 
                className="text-sm text-gray-600 hover:text-gray-800"
                onClick={toggleShowFormatted}
              >
                {showFormatted ? 'Show Raw' : 'Show Formatted'}
              </button>
            </div>
          </div>
          
          <div className="p-4 max-h-96 overflow-y-auto border-b border-gray-200">
            {selectedTemplate ? (
              <div>
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700">Subject</label>
                  {editMode ? (
                    <input
                      type="text"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={currentSubject}
                      onChange={(e) => setCurrentSubject(e.target.value)}
                    />
                  ) : (
                    <div className="mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50">
                      {selectedTemplate.subject || 'No subject provided'}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Content</label>
                  {editMode ? (
                    <textarea
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
                      rows="10"
                      value={currentContent}
                      onChange={(e) => setCurrentContent(e.target.value)}
                    />
                  ) : (
                    <div className="mt-1 border border-gray-300 rounded-md p-3 bg-gray-50 max-h-64 overflow-y-auto">
                      {showFormatted ? (
                        <div 
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ 
                            __html: formatPreview(selectedTemplate.content || '')
                          }}
                        />
                      ) : (
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                          {selectedTemplate.content || 'No content provided'}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No template selected</p>
                <p className="text-sm text-gray-400 mt-2">
                  Select a template from the list to view and edit
                </p>
              </div>
            )}
          </div>
          
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Available Variables:</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>{'{targetName}'} - Name of the person receiving feedback</p>
              <p>{'{assessorName}'} - Name of the person providing feedback</p>
              <p>{'{campaignName}'} - Name of the feedback campaign</p>
              <p>{'{deadline}'} - Due date for feedback</p>
              <p>{'{feedbackUrl}'} - Link to feedback form</p>
              <p>{'{companyName}'} - Your company name</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={handleNextClick}
          className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center"
        >
          Next: Review & Launch
          <ArrowRight className="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default EmailSetup;