// frontend/src/components/campaigns/wizard/EmailSetup.jsx

import React, { useState, useEffect } from 'react';
import { Mail, Sparkles, Check, Clipboard, AlertTriangle, RefreshCw, Settings, FileText, ThumbsUp, Clock, Eye, Code } from 'lucide-react';
import api from '../../../services/api';
import { communicationTemplatesApi } from '../../../services/api';

const EmailSetup = ({ data, onDataChange, onNext }) => {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [error, setError] = useState(null);
  const [emailTemplates, setEmailTemplates] = useState(data.emailTemplates || {
    invitation: {
      general: '',
      self: ''
    },
    instruction: {
      general: '',
      self: ''
    },
    reminder: {
      general: ''
    },
    thank_you: {
      general: ''
    }
  });
  const [activeTab, setActiveTab] = useState('invitation');
  const [activeSubTab, setActiveSubTab] = useState('general');
  const [targetEmployee, setTargetEmployee] = useState(null);
  const [copySuccess, setCopySuccess] = useState('');
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [showFormattedPreview, setShowFormattedPreview] = useState(true);

  // Email template types
  const templateTypes = [
    { id: 'invitation', label: 'Invitation', description: 'Initial email sent to assessors', icon: Mail },
    { id: 'instruction', label: 'Instructions', description: 'Guidelines for completing feedback', icon: FileText },
    { id: 'reminder', label: 'Reminder', description: 'Follow-up for assessors who haven\'t completed', icon: Clock },
    { id: 'thank_you', label: 'Thank You', description: 'Sent after feedback completion', icon: ThumbsUp }
  ];

  // Sub-types only for invitation and instruction emails
  const subTypes = [
    { id: 'general', label: 'General', description: 'For managers, peers, and direct reports' },
    { id: 'self', label: 'Self-Assessment', description: "For the target employee's self-assessment" }
  ];

  useEffect(() => {
    if (data.targetEmployeeId) {
      fetchTargetEmployee(data.targetEmployeeId);
    }
    
    // If we don't have templates yet, generate them
    if (!data.emailTemplates || Object.keys(data.emailTemplates).length === 0) {
      generateTemplates();
    } else {
      setLoading(false);
    }

    // Load available templates
    fetchAvailableTemplates();
  }, [data.targetEmployeeId]);

  const fetchTargetEmployee = async (employeeId) => {
    try {
      const response = await api.get(`/employees/${employeeId}`);
      setTargetEmployee(response.data);
    } catch (err) {
      console.error('Error fetching target employee:', err);
      setError('Failed to load target employee details');
    }
  };

  const fetchAvailableTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await communicationTemplatesApi.getDefaults();
      setAvailableTemplates(response.data.templates || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const generateTemplates = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      const response = await api.post('/campaigns/generate-email-templates', {
        targetEmployeeId: data.targetEmployeeId,
        templateId: data.templateId,
        campaignName: data.name
      });
      
      if (response.data && response.data.templates) {
        setEmailTemplates(response.data.templates);
        onDataChange({ emailTemplates: response.data.templates });
      }
    } catch (err) {
      console.error('Error generating email templates:', err);
      setError('Failed to generate email templates');
      
      // Set default templates as fallback
      const defaultTemplates = {
        invitation: {
          general: `
            <p>Hello {assessorName},</p>
            <p>You've been invited to provide feedback for {targetName} as part of the "${data.name}" feedback campaign.</p>
            <p>Your thoughtful insights are valuable for their professional development.</p>
            <p>Please complete your feedback by {deadline}.</p>
            <p><a href="{feedbackUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Provide Feedback</a></p>
            <p>Thank you for your participation!</p>
          `,
          self: `
            <p>Hello {assessorName},</p>
            <p>As part of the "${data.name}" feedback campaign, you're invited to complete a self-assessment.</p>
            <p>Your self-reflection is an important part of the 360-degree feedback process.</p>
            <p>Please complete your assessment by {deadline}.</p>
            <p><a href="{feedbackUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Complete Self-Assessment</a></p>
            <p>Thank you!</p>
          `
        },
        instruction: {
          general: `
            <p>Hello {assessorName},</p>
            <p>Here are some guidelines for providing effective feedback for {targetName}:</p>
            <ul>
              <li>Be specific and provide examples</li>
              <li>Focus on behaviors, not personality</li>
              <li>Balance positive feedback with areas for development</li>
              <li>Be constructive and actionable</li>
            </ul>
            <p>If you haven't completed your feedback yet, please do so by {deadline}:</p>
            <p><a href="{feedbackUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Provide Feedback</a></p>
          `,
          self: `
            <p>Hello {assessorName},</p>
            <p>Here are some guidelines for completing your self-assessment:</p>
            <ul>
              <li>Be honest and reflective about your own performance</li>
              <li>Provide specific examples to support your assessment</li>
              <li>Consider both your strengths and areas for development</li>
              <li>Take your time to provide thoughtful responses</li>
            </ul>
            <p>Your self-assessment provides valuable context and will be considered alongside feedback from others.</p>
            <p>Please complete your assessment by {deadline}:</p>
            <p><a href="{feedbackUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Complete Self-Assessment</a></p>
          `
        },
        reminder: {
          general: `
            <p>Hello {assessorName},</p>
            <p>This is a friendly reminder that your feedback for {targetName} is due by {deadline}.</p>
            <p>Your input is valuable, and we encourage you to share your perspective.</p>
            <p><a href="{feedbackUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Provide Feedback</a></p>
            <p>Thank you for your participation!</p>
          `
        },
        thank_you: {
          general: `
            <p>Hello {assessorName},</p>
            <p>Thank you for completing your feedback for {targetName}.</p>
            <p>Your insights will help support their professional development.</p>
            <p>We appreciate your time and contribution!</p>
          `
        }
      };
      
      setEmailTemplates(defaultTemplates);
      onDataChange({ emailTemplates: defaultTemplates });
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const handleTemplateChange = (e) => {
    const newTemplates = { ...emailTemplates };
    
    if (activeTab === 'invitation' || activeTab === 'instruction') {
      if (!newTemplates[activeTab]) newTemplates[activeTab] = {};
      newTemplates[activeTab][activeSubTab] = e.target.value;
    } else {
      if (!newTemplates[activeTab]) newTemplates[activeTab] = {};
      newTemplates[activeTab].general = e.target.value;
    }
    
    setEmailTemplates(newTemplates);
    onDataChange({ emailTemplates: newTemplates });
  };

  const handleCopyTemplate = () => {
    const textToCopy = (activeTab === 'invitation' || activeTab === 'instruction') 
      ? emailTemplates[activeTab]?.[activeSubTab] || ''
      : emailTemplates[activeTab]?.general || '';
    
    navigator.clipboard.writeText(textToCopy).then(
      () => {
        setCopySuccess('Copied!');
        setTimeout(() => setCopySuccess(''), 2000);
      },
      () => {
        setCopySuccess('Failed to copy');
      }
    );
  };

  const handleNextClick = () => {
    onNext({ emailTemplates });
  };

  // Use a saved template
  const handleUseTemplate = (templateId) => {
    try {
      const template = availableTemplates.find(t => t.id === templateId);
      if (!template) return;
      
      const newTemplates = { ...emailTemplates };
      
      if (activeTab === 'invitation' || activeTab === 'instruction') {
        if (!newTemplates[activeTab]) newTemplates[activeTab] = {};
        // For invitation/instruction, check recipient type to determine which sub-template to update
        if (activeSubTab === 'self' && template.recipientType === 'self') {
          newTemplates[activeTab][activeSubTab] = template.content;
        } else if (activeSubTab === 'general' && template.recipientType !== 'self') {
          newTemplates[activeTab][activeSubTab] = template.content;
        } else {
          // Skip if template doesn't match subTab
          return;
        }
      } else {
        if (!newTemplates[activeTab]) newTemplates[activeTab] = {};
        // For other types, just update the general content
        newTemplates[activeTab].general = template.content;
      }
      
      setEmailTemplates(newTemplates);
      onDataChange({ emailTemplates: newTemplates });
    } catch (err) {
      console.error('Error applying template:', err);
    }
  };

  // Get current template content based on active tabs
  const getCurrentTemplate = () => {
    if (activeTab === 'invitation' || activeTab === 'instruction') {
      return emailTemplates[activeTab]?.[activeSubTab] || '';
    }
    return emailTemplates[activeTab]?.general || '';
  };

  // Preview the email with placeholders replaced
  const getPreviewContent = () => {
    let content = getCurrentTemplate();
    
    if (!content) return '<p>No template content available</p>';
    
    // Replace all placeholders with example values
    const replacements = {
      '[Assessor Name]': 'John Doe',
      '[Target Name]': targetEmployee ? `${targetEmployee.firstName} ${targetEmployee.lastName}` : 'Jane Smith',
      '[Deadline]': new Date(data.endDate).toLocaleDateString(),
      '[Feedback URL]': 'https://example.com/feedback',
      '[Your Name]': targetEmployee ? `${targetEmployee.firstName} ${targetEmployee.lastName}` : 'Jane Smith',
      // Support both bracket and curly brace formats
      '{assessorName}': 'John Doe',
      '{targetName}': targetEmployee ? `${targetEmployee.firstName} ${targetEmployee.lastName}` : 'Jane Smith',
      '{deadline}': new Date(data.endDate).toLocaleDateString(),
      '{feedbackUrl}': 'https://example.com/feedback',
      '{yourName}': targetEmployee ? `${targetEmployee.firstName} ${targetEmployee.lastName}` : 'Jane Smith',
      '{companyName}': 'Your Company'
    };
    
    Object.entries(replacements).forEach(([placeholder, value]) => {
      content = content.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return content;
  };

  // Filter templates for current active tab/subtab
  const getFilteredTemplates = () => {
    if (!Array.isArray(availableTemplates) || availableTemplates.length === 0) return [];
    
    return availableTemplates.filter(template => {
      if (!template) return false;
      // First filter by template type (invitation, reminder, etc)
      if (template.templateType !== activeTab) return false;
      
      // For invitation/instruction templates, also filter by recipient type based on subtab
      if (activeTab === 'invitation' || activeTab === 'instruction') {
        if (activeSubTab === 'self' && template.recipientType !== 'self') return false;
        if (activeSubTab === 'general' && template.recipientType === 'self') return false;
      }
      
      return true;
    }).sort((a, b) => {
      // Sort by default (default templates first)
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      // Then sort by name
      return a.name.localeCompare(b.name);
    });
  };

  // Determine if subtabs should be shown based on active tab
  const shouldShowSubTabs = () => {
    return activeTab === 'invitation' || activeTab === 'instruction';
  };

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
        <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex justify-end mb-4 space-x-3">
        <button
          onClick={generateTemplates}
          disabled={generating}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {generating ? (
            <>
              <RefreshCw className="animate-spin h-4 w-4 mr-2" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Regenerate Templates
            </>
          )}
        </button>

        <a
          href="/communication-templates"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Settings className="h-4 w-4 mr-2" />
          Manage Templates
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left sidebar - Template types */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700">Email Types</h3>
            </div>
            <nav className="flex flex-col">
              {templateTypes.map(type => (
                <button
                  key={type.id}
                  className={`flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                    activeTab === type.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() => {
                    setActiveTab(type.id);
                    setActiveSubTab('general');
                  }}
                >
                  <type.icon className={`h-5 w-5 mr-3 ${
                    activeTab === type.id ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                  <div>
                    <p className={`font-medium ${
                      activeTab === type.id ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                      {type.label}
                    </p>
                    <p className="text-xs text-gray-500">{type.description}</p>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Sub-tabs for Invitation/Instruction types */}
          {shouldShowSubTabs() && (
            <div className="mt-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-700">Recipient Type</h3>
              </div>
              <nav className="flex flex-col">
                {subTypes.map(subType => (
                  <button
                    key={subType.id}
                    className={`flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      activeSubTab === subType.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => setActiveSubTab(subType.id)}
                  >
                    <div>
                      <p className={`font-medium ${
                        activeSubTab === subType.id ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        {subType.label}
                      </p>
                      <p className="text-xs text-gray-500">{subType.description}</p>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          )}
          
          {/* Available Templates Section */}
          <div className="mt-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700">Available Templates</h3>
            </div>
            <div className="p-4">
              {loadingTemplates ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-xs text-gray-500">Loading templates...</p>
                </div>
              ) : getFilteredTemplates().length > 0 ? (
                <div className="space-y-2">
                  {getFilteredTemplates().map(template => (
                    <div 
                      key={template.id}
                      className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleUseTemplate(template.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{template.name}</p>
                          <p className="text-xs text-gray-500 truncate">{template.subject}</p>
                          <p className="text-xs mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              template.recipientType === 'self' ? 'bg-purple-100 text-purple-800' :
                              template.recipientType === 'manager' ? 'bg-blue-100 text-blue-800' :
                              template.recipientType === 'peer' ? 'bg-green-100 text-green-800' :
                              template.recipientType === 'direct_report' ? 'bg-amber-100 text-amber-800' :
                              template.recipientType === 'external' ? 'bg-gray-100 text-gray-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {template.recipientType === 'all' ? 'All Recipients' : 
                               template.recipientType.charAt(0).toUpperCase() + template.recipientType.slice(1).replace('_', ' ')}
                            </span>
                          </p>
                        </div>
                        {template.isDefault && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-2">
                  No templates available for this type
                </p>
              )}
              
              <div className="mt-4 text-xs text-gray-500">
                <p>You can customize email templates in the Communication Templates section.</p>
                <a 
                  href="/communication-templates" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 inline-flex items-center mt-1"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Manage Templates
                </a>
              </div>
            </div>
          </div>
          
          {/* Placeholders Help */}
          <div className="mt-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700">Available Placeholders</h3>
            </div>
            <div className="p-4">
              <ul className="text-sm text-gray-600 space-y-2">
                <li><code className="bg-gray-100 px-1 py-0.5 rounded">{'{assessorName}'}</code> - Name of the person providing feedback</li>
                <li><code className="bg-gray-100 px-1 py-0.5 rounded">{'{targetName}'}</code> - Name of the person receiving feedback</li>
                <li><code className="bg-gray-100 px-1 py-0.5 rounded">{'{deadline}'}</code> - Due date for feedback</li>
                <li><code className="bg-gray-100 px-1 py-0.5 rounded">{'{feedbackUrl}'}</code> - Link to feedback form</li>
                <li><code className="bg-gray-100 px-1 py-0.5 rounded">{'{companyName}'}</code> - Your company name</li>
              </ul>
              <p className="mt-2 text-xs text-gray-500">Both {'{placeholder}'} and [Placeholder] formats are supported.</p>
            </div>
          </div>
        </div>

        {/* Right area - Template editor and preview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-700">Template Editor</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopyTemplate}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-gray-700 bg-gray-100 hover:bg-gray-200"
                >
                  <Clipboard className="h-3 w-3 mr-1" />
                  {copySuccess || 'Copy'}
                </button>
              </div>
            </div>
            <div className="p-4">
              <textarea
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                value={getCurrentTemplate()}
                onChange={handleTemplateChange}
                placeholder="Enter email template here..."
              />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-700">Preview</h3>
              <button
                onClick={() => setShowFormattedPreview(!showFormattedPreview)}
                className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
              >
                {showFormattedPreview ? (
                  <>
                    <Code className="h-3 w-3 mr-1" />
                    Show HTML
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Show Formatted
                  </>
                )}
              </button>
            </div>
            <div className="p-4">
              {showFormattedPreview ? (
                <div className="border border-gray-200 rounded-md p-4 bg-white min-h-[300px] max-h-[400px] overflow-auto">
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: getPreviewContent() }} />
                </div>
              ) : (
                <pre className="bg-gray-50 p-4 border border-gray-200 rounded-md overflow-auto text-xs text-gray-800 max-h-[400px]">
                  {getPreviewContent()}
                </pre>
              )}
              <div className="mt-2 text-xs text-gray-500">
                <p>This preview shows how the email will appear with example values.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={handleNextClick}
          className="px-4 py-2 text-white rounded-md bg-blue-600 hover:bg-blue-700"
        >
          Next: Review & Launch
        </button>
      </div>
    </div>
  );
};

export default EmailSetup;
