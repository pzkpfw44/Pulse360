// frontend/src/components/campaigns/wizard/ReviewLaunch.jsx

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  User, 
  Calendar, 
  Mail, 
  FileText,
  Users, 
  ChevronDown, 
  ChevronUp,
  Edit,
  Brain
} from 'lucide-react';
import api from '../../../services/api';
import { validateCampaignTemplates, prepareCampaignForSubmission } from '../../utils/CampaignUtils';

const ReviewLaunch = ({ data, onLaunch, onDataChange }) => {
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState(null);
  const [targetEmployee, setTargetEmployee] = useState(null);
  const [openSections, setOpenSections] = useState({
    basic: true,
    participants: true,
    schedule: true,
    emails: false,
    aiSettings: true // New section for AI settings
  });
  const [validationErrors, setValidationErrors] = useState([]);
  const [launchConfirmation, setLaunchConfirmation] = useState(false);

  // Fetch additional data for review
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch template details
        if (data.templateId) {
          const templateResponse = await api.get(`/templates/${data.templateId}`);
          setTemplate(templateResponse.data);
        }

        // Fetch target employee details
        if (data.targetEmployeeId) {
          const employeeResponse = await api.get(`/employees/${data.targetEmployeeId}`);
          setTargetEmployee(employeeResponse.data);
        }
      } catch (error) {
        console.error('Error fetching data for review:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [data.templateId, data.targetEmployeeId]);

  // Validate campaign data
  useEffect(() => {
    const errors = [];

    // Check for required fields
    if (!data.name) {
      errors.push('Campaign name is required');
    }

    if (!data.templateId) {
      errors.push('Feedback template is required');
    }

    if (!data.targetEmployeeId) {
      errors.push('Target employee is required');
    }

    // Check for participants
    const participants = data.participants || [];
    const relationshipTypes = participants.map(p => p.relationshipType);

    if (!relationshipTypes.includes('self')) {
      errors.push('Self-assessment participant is required');
    }

    if (!relationshipTypes.includes('manager')) {
      errors.push('At least one manager participant is required');
    }

    const peerCount = relationshipTypes.filter(type => type === 'peer').length;
    if (peerCount < 3) {
      errors.push('At least three peer participants are required');
    }

    // Check for dates
    if (!data.startDate) {
      errors.push('Start date is required');
    }

    if (!data.endDate) {
      errors.push('End date is required');
    }

    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);

      if (start > end) {
        errors.push('End date must be after start date');
      }
    }

    // Email templates
    if (!data.emailTemplates || !data.emailTemplates.invitation || !data.emailTemplates.invitation.general) {
      errors.push('Invitation email template is required');
    }

    setValidationErrors(errors);
  }, [data]);

  // Toggle section visibility
  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  // Count participants by relationship type
  const participantCountsByType = () => {
    const counts = {};
    (data.participants || []).forEach(p => {
      counts[p.relationshipType] = (counts[p.relationshipType] || 0) + 1;
    });
    return counts;
  };

  // Get participants by relationship type
  const getParticipantsByType = (type) => {
    return (data.participants || []).filter(p => p.relationshipType === type);
  };

  // Handle AI support toggle
  const handleAiSupportChange = (useFullAiSupport) => {
    if (onDataChange) {
      onDataChange({ useFullAiSupport });
    }
  };

  // Handle launch button click
  const handleLaunch = () => {
    // Prepare the campaign data
    const preparedCampaign = prepareCampaignForSubmission(data);
    
    // Validate templates before launching
    const validation = validateCampaignTemplates(preparedCampaign);
    if (!validation.success) {
      // Show error to user
      setError(validation.message);
      return;
    }
    
    // If validation passes, launch the campaign
    onLaunch(preparedCampaign);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Review and Launch</h2>
        <p className="text-gray-600">
          Review your campaign details before launching. Once launched, invitations will be sent to all assessors.
        </p>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-medium">Please fix the following issues:</h3>
              <ul className="mt-2 text-sm text-red-700 list-disc pl-5 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Basic Information Section */}
      <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
        <div 
          className="bg-gray-50 px-4 py-3 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('basic')}
        >
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="font-medium text-gray-900">Basic Information</h3>
          </div>
          {openSections.basic ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
        
        {openSections.basic && (
          <div className="p-4 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Campaign Name</p>
                <p className="mt-1 text-gray-900">{data.name || 'Not set'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p className="mt-1 text-gray-900">{data.description || 'Not provided'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Feedback Template</p>
                <p className="mt-1 text-gray-900">{template?.name || 'Loading...'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Target Employee</p>
                <p className="mt-1 text-gray-900">
                  {targetEmployee ? `${targetEmployee.firstName} ${targetEmployee.lastName}` : 'Loading...'}
                </p>
                <p className="text-xs text-gray-500">
                  {targetEmployee?.jobTitle || 'No job title'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Participants Section */}
      <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
        <div 
          className="bg-gray-50 px-4 py-3 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('participants')}
        >
          <div className="flex items-center">
            <Users className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="font-medium text-gray-900">Participants</h3>
            <span className="ml-2 text-gray-500 text-sm">
              ({(data.participants || []).length} total)
            </span>
          </div>
          {openSections.participants ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
        
        {openSections.participants && (
          <div className="p-4 bg-white">
            <div className="space-y-6">
              {/* Self */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Self Assessment</h4>
                {getParticipantsByType('self').length > 0 ? (
                  <div>
                    {getParticipantsByType('self').map(participant => (
                      <div key={participant.id} className="flex items-center mb-2">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-900">{participant.employeeName}</p>
                          <p className="text-xs text-gray-500">{participant.employeeEmail}</p>
                        </div>
                        {participant.aiSuggested && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            AI Suggested
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-red-600 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Self assessment participant required
                  </div>
                )}
              </div>
              
              {/* Manager */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Manager <span className="text-gray-500 text-xs">({getParticipantsByType('manager').length})</span>
                </h4>
                {getParticipantsByType('manager').length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {getParticipantsByType('manager').map(participant => (
                      <div key={participant.id} className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-900">{participant.employeeName}</p>
                          <p className="text-xs text-gray-500">{participant.employeeEmail}</p>
                        </div>
                        {participant.aiSuggested && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            AI
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-red-600 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    At least one manager required
                  </div>
                )}
              </div>
              
              {/* Peers */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Peers <span className="text-gray-500 text-xs">({getParticipantsByType('peer').length})</span>
                </h4>
                {getParticipantsByType('peer').length >= 3 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {getParticipantsByType('peer').map(participant => (
                      <div key={participant.id} className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-900">{participant.employeeName}</p>
                          <p className="text-xs text-gray-500">{participant.employeeEmail}</p>
                        </div>
                        {participant.aiSuggested && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            AI
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-red-600 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    At least three peers required
                  </div>
                )}
              </div>
              
              {/* Direct Reports */}
              {getParticipantsByType('direct_report').length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Direct Reports <span className="text-gray-500 text-xs">({getParticipantsByType('direct_report').length})</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {getParticipantsByType('direct_report').map(participant => (
                      <div key={participant.id} className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-900">{participant.employeeName}</p>
                          <p className="text-xs text-gray-500">{participant.employeeEmail}</p>
                        </div>
                        {participant.aiSuggested && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            AI
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* External */}
              {getParticipantsByType('external').length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    External <span className="text-gray-500 text-xs">({getParticipantsByType('external').length})</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {getParticipantsByType('external').map(participant => (
                      <div key={participant.id} className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-900">{participant.employeeName}</p>
                          <p className="text-xs text-gray-500">{participant.employeeEmail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Schedule Section */}
      <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
        <div 
          className="bg-gray-50 px-4 py-3 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('schedule')}
        >
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="font-medium text-gray-900">Schedule</h3>
          </div>
          {openSections.schedule ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
        
        {openSections.schedule && (
          <div className="p-4 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Start Date</p>
                <p className="mt-1 text-gray-900">{formatDate(data.startDate)}</p>
                <p className="text-xs text-gray-500">Invitations will be sent on this date</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">End Date</p>
                <p className="mt-1 text-gray-900">{formatDate(data.endDate)}</p>
                <p className="text-xs text-gray-500">Final deadline for all assessments</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Duration</p>
                <p className="mt-1 text-gray-900">
                  {data.startDate && data.endDate ? (
                    `${Math.ceil(Math.abs(new Date(data.endDate) - new Date(data.startDate)) / (1000 * 60 * 60 * 24))} days`
                  ) : 'Not set'}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Reminder Frequency</p>
                <p className="mt-1 text-gray-900">
                  {data.reminderFrequency === 0 ? 'No automatic reminders' : `Every ${data.reminderFrequency} days`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Support Settings Section - NEW */}
      <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
        <div 
          className="bg-gray-50 px-4 py-3 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('aiSettings')}
        >
          <div className="flex items-center">
            <Brain className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="font-medium text-gray-900">AI Support Settings</h3>
          </div>
          {openSections.aiSettings ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
        
        {openSections.aiSettings && (
          <div className="p-4 bg-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">AI Feedback Support</p>
                <p className="text-sm text-gray-600 mb-4">
                  Configure how Flux AI assists assessors during feedback collection
                </p>
                
                <div className={`mt-2 p-3 rounded-md ${data.useFullAiSupport !== false ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-gray-200'}`}>
                  {data.useFullAiSupport !== false ? (
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-0.5">
                        <Brain className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-blue-800">Full AI Support Enabled</h4>
                        <p className="mt-1 text-sm text-blue-700">
                          Assessors will receive real-time AI feedback on their responses to help improve quality.
                          This includes suggestions for more specific examples and balanced feedback.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-0.5">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-gray-800">Using Fallback Mode</h4>
                        <p className="mt-1 text-sm text-gray-600">
                          Assessors will receive basic validation but no AI-assisted feedback or suggestions.
                          This mode uses less system resources but provides a more basic experience.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="relative inline-block w-12 align-middle select-none mt-1">
                <input
                  type="checkbox"
                  name="aiSupport"
                  id="aiSupport"
                  checked={data.useFullAiSupport !== false}
                  onChange={(e) => handleAiSupportChange(e.target.checked)}
                  className="absolute block w-6 h-6 rounded-full bg-white border-4 border-gray-300 appearance-none cursor-pointer checked:right-0 checked:border-blue-600 top-0 bottom-0"
                />
                <label
                  htmlFor="aiSupport"
                  className={`block overflow-hidden h-6 rounded-full cursor-pointer ${
                    data.useFullAiSupport !== false ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                ></label>
              </div>
            </div>
            
            <div className="mt-3 flex items-start">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-gray-400" />
              </div>
              <p className="ml-2 text-xs text-gray-500">
                This setting affects all assessors in this campaign and cannot be changed after the campaign is launched.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Email Templates Section */}
      <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
        <div 
          className="bg-gray-50 px-4 py-3 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('emails')}
        >
          <div className="flex items-center">
            <Mail className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="font-medium text-gray-900">Email Templates</h3>
          </div>
          {openSections.emails ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </div>
        
        {openSections.emails && (
          <div className="p-4 bg-white">
            <div className="space-y-4">
              {/* Invitation Email */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Invitation Email</h4>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                  <div className="prose prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{ 
                      __html: data.emailTemplates?.invitation?.general || '<p>No template configured</p>' 
                    }} />
                  </div>
                </div>
              </div>
              
              {/* Self-Assessment Email */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Self-Assessment Email</h4>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                  <div className="prose prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{ 
                      __html: data.emailTemplates?.invitation?.self || '<p>No template configured</p>' 
                    }} />
                  </div>
                </div>
              </div>
              
              {/* Reminder Email */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Reminder Email</h4>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                  <div className="prose prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{ 
                      __html: data.emailTemplates?.reminder?.general || '<p>No template configured</p>' 
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Launch Confirmation */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-blue-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Ready to launch?</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                By launching this campaign, invitations will be sent to all participants on the start date ({formatDate(data.startDate)}). 
                You'll be able to monitor progress and send manual reminders.
              </p>
            </div>
            <div className="mt-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="launch-confirmation"
                    name="launch-confirmation"
                    type="checkbox"
                    checked={launchConfirmation}
                    onChange={() => setLaunchConfirmation(!launchConfirmation)}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="launch-confirmation" className="font-medium text-blue-700">
                    I confirm that this campaign is ready to launch
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={handleLaunch}
          disabled={validationErrors.length > 0 || !launchConfirmation}
          className={`px-4 py-2 text-white rounded-md ${
            validationErrors.length === 0 && launchConfirmation
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Launch Campaign
        </button>
      </div>
    </div>
  );
};

export default ReviewLaunch;