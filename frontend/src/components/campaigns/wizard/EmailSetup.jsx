// frontend/src/components/campaigns/wizard/EmailSetup.jsx

import React, { useState, useEffect } from 'react';
import { Mail, Sparkles, Check, Clipboard, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '../../../services/api';

const EmailSetup = ({ data, onDataChange, onNext }) => {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [emailTemplates, setEmailTemplates] = useState(data.emailTemplates || {
    invitation: {
      general: '',
      self: ''
    },
    reminder: {
      general: ''
    },
    thankYou: {
      general: ''
    }
  });
  const [activeTab, setActiveTab] = useState('invitation');
  const [activeSubTab, setActiveSubTab] = useState('general');
  const [targetEmployee, setTargetEmployee] = useState(null);
  const [copySuccess, setCopySuccess] = useState('');

  // Email template types
  const templateTypes = [
    { id: 'invitation', label: 'Invitation', description: 'Initial email sent to assessors' },
    { id: 'reminder', label: 'Reminder', description: 'Follow-up for assessors who haven\'t completed' },
    { id: 'thankYou', label: 'Thank You', description: 'Sent after feedback completion' }
  ];

  // Sub-types only for invitation emails
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
            <p>Hello [Assessor Name],</p>
            <p>You've been invited to provide feedback for [Target Name] as part of the "${data.name}" feedback campaign.</p>
            <p>Your thoughtful insights are valuable for their professional development.</p>
            <p>Please complete your feedback by [Deadline].</p>
            <p><a href="[Feedback URL]">Click here to provide feedback</a></p>
            <p>Thank you for your participation!</p>
          `,
          self: `
            <p>Hello [Your Name],</p>
            <p>As part of the "${data.name}" feedback campaign, you're invited to complete a self-assessment.</p>
            <p>Your self-reflection is an important part of the 360-degree feedback process.</p>
            <p>Please complete your assessment by [Deadline].</p>
            <p><a href="[Feedback URL]">Click here to complete your self-assessment</a></p>
            <p>Thank you!</p>
          `
        },
        reminder: {
          general: `
            <p>Hello [Assessor Name],</p>
            <p>This is a friendly reminder that your feedback for [Target Name] is due by [Deadline].</p>
            <p>Your input is valuable, and we encourage you to share your perspective.</p>
            <p><a href="[Feedback URL]">Click here to provide feedback</a></p>
            <p>Thank you for your participation!</p>
          `
        },
        thankYou: {
          general: `
            <p>Hello [Assessor Name],</p>
            <p>Thank you for completing your feedback for [Target Name].</p>
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
    
    if (activeTab === 'invitation') {
      newTemplates[activeTab][activeSubTab] = e.target.value;
    } else {
      newTemplates[activeTab].general = e.target.value;
    }
    
    setEmailTemplates(newTemplates);
    onDataChange({ emailTemplates: newTemplates });
  };

  const handleCopyTemplate = () => {
    const textToCopy = activeTab === 'invitation' 
      ? emailTemplates[activeTab][activeSubTab]
      : emailTemplates[activeTab].general;
    
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

  // Get current template content based on active tabs
  const getCurrentTemplate = () => {
    if (activeTab === 'invitation') {
      return emailTemplates[activeTab][activeSubTab] || '';
    }
    return emailTemplates[activeTab].general || '';
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
      '[Your Name]': targetEmployee ? `${targetEmployee.firstName} ${targetEmployee.lastName}` : 'Jane Smith'
    };
    
    Object.entries(replacements).forEach(([placeholder, value]) => {
      content = content.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return content;
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

      <div className="flex justify-end mb-4">
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
                  <Mail className={`h-5 w-5 mr-3 ${
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

          {/* Sub-tabs for Invitation type */}
          {activeTab === 'invitation' && (
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
          
          {/* Placeholders Help */}
          <div className="mt-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700">Available Placeholders</h3>
            </div>
            <div className="p-4">
              <ul className="text-sm text-gray-600 space-y-2">
                <li><code className="bg-gray-100 px-1 py-0.5 rounded">[Assessor Name]</code> - Name of the person providing feedback</li>
                <li><code className="bg-gray-100 px-1 py-0.5 rounded">[Target Name]</code> - Name of the person receiving feedback</li>
                <li><code className="bg-gray-100 px-1 py-0.5 rounded">[Deadline]</code> - Due date for feedback</li>
                <li><code className="bg-gray-100 px-1 py-0.5 rounded">[Feedback URL]</code> - Link to feedback form</li>
                <li><code className="bg-gray-100 px-1 py-0.5 rounded">[Your Name]</code> - Used in self-assessment emails</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right area - Template editor and preview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-700">Template Editor</h3>
              <div className="flex items-center">
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
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={getCurrentTemplate()}
                onChange={handleTemplateChange}
                placeholder="Enter email template here..."
              />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700">Preview</h3>
            </div>
            <div className="p-4 prose prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ __html: getPreviewContent() }} />
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