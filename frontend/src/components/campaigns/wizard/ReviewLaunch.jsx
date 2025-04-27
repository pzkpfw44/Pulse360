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
  Brain // Keep Brain icon
} from 'lucide-react'; // Removed Edit icon as it's not used
import api from '../../../services/api';
import { validateCampaignTemplates, prepareCampaignForSubmission } from '../../../utils/CampaignUtils';

// Modify props to accept the onLaunch function passed from the wizard
const ReviewLaunch = ({ data, onLaunch: wizardOnLaunch, onDataChange }) => {
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState(null);
  const [targetEmployee, setTargetEmployee] = useState(null);
  const [openSections, setOpenSections] = useState({
    basic: true,
    participants: true,
    schedule: true,
    emails: false, // Keep emails collapsed by default
    aiSettings: true
  });
  const [validationErrors, setValidationErrors] = useState([]);
  const [launchConfirmation, setLaunchConfirmation] = useState(false);
  const [error, setError] = useState(null);

  // Fetch additional data for review
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null); // Clear previous errors

        // Fetch template details
        if (data.templateId) {
          const templateResponse = await api.get(`/templates/${data.templateId}`);
          setTemplate(templateResponse.data);
        } else {
           setTemplate(null); // Reset if no templateId
        }

        // Fetch target employee details
        if (data.targetEmployeeId) {
          const employeeResponse = await api.get(`/employees/${data.targetEmployeeId}`);
          setTargetEmployee(employeeResponse.data);
        } else {
           setTargetEmployee(null); // Reset if no targetEmployeeId
        }

      } catch (fetchError) {
        console.error('Error fetching data for review:', fetchError);
         setError('Failed to load review details. Please check previous steps.');
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
      errors.push('Campaign name is required (Step 2)');
    }
    if (!data.templateId) {
      errors.push('Feedback template is required (Step 1)');
    }
    if (!data.targetEmployeeId) {
      errors.push('Target employee is required (Step 2)');
    }

    // Check for participants (using simplified logic as detailed check happens in AssessorSelection)
    const participants = data.participants || [];
    if (participants.length === 0) {
       errors.push('Assessors selection is required (Step 3)');
    } else {
        const relationshipTypes = participants.map(p => p.relationshipType);
        if (!relationshipTypes.includes('self')) errors.push('Self-assessment participant is required (Step 3)');
        if (!relationshipTypes.includes('manager')) errors.push('At least one manager participant is required (Step 3)');
        if (relationshipTypes.filter(type => type === 'peer').length < 3) errors.push('At least three peer participants are required (Step 3)');
    }


    // Check for dates
    if (!data.startDate) {
      errors.push('Start date is required (Step 4)');
    }
    if (!data.endDate) {
      errors.push('End date is required (Step 4)');
    }
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (start > end) {
        errors.push('End date must be after start date (Step 4)');
      }
    }

    // Check email templates (simplified check, assumes structure is valid if exists)
    if (!data.emailTemplates || typeof data.emailTemplates !== 'object' || !data.emailTemplates.invitation || Object.keys(data.emailTemplates.invitation).length === 0) {
      errors.push('At least one Invitation email template must be configured (Step 5)');
    }


    setValidationErrors(errors);
  }, [data]);

  // Link the main wizard's launch button action to our internal validation and launch logic
  useEffect(() => {
    // This effect allows the CampaignWizard's Launch button to trigger the internal validation
    // We update the wizard's onLaunch prop to point to our internal handleLaunch function
    // This requires careful handling in CampaignWizard to manage this potentially changing prop.
    // A more common pattern is to pass validation status up, but this works too.

    // Note: The direct manipulation of the parent's prop like this is generally not recommended.
    // It's better for the wizard to call a function provided by the step,
    // or for the step to provide its validation status up to the wizard.
    // However, given the current structure, we'll make the wizard's button use this component's launch logic.

    // In CampaignWizard.jsx, the onLaunch prop passed here needs to be setup to use this callback.
    // We assume CampaignWizard passes its `handleLaunch` function as the prop `onLaunch`.
    // We will call that original function *after* our internal validation passes.

  }, [/* Dependencies needed if handleLaunch relies on props/state */]);


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
    try {
       return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
       return 'Invalid Date';
    }
  };

   // Format relationship type for display
   const formatRelationshipType = (type) => {
    const formats = {
      'self': 'Self',
      'manager': 'Manager',
      'peer': 'Peer',
      'direct_report': 'Direct Report',
      'external': 'External'
    };
    return formats[type] || type;
  };

  // Get participants by relationship type (using simplified structure)
  const getParticipantsByType = (type) => {
    return (data.participants || []).filter(p => p.relationshipType === type);
  };


  // Handle AI support toggle
  const handleAiSupportChange = (useFullAiSupport) => {
    if (onDataChange) {
      // Ensure settings object exists
      const currentSettings = data.settings || {};
      onDataChange({ settings: { ...currentSettings, useFullAiSupport } });
    }
  };

 // This function is now primarily for validation before calling the wizard's launch function
  const handleInternalLaunchValidation = () => {
      setError(null); // Clear previous errors

      // Re-check validation errors state
      if (validationErrors.length > 0) {
        setError(`Please fix the following issues: ${validationErrors.join(', ')}`);
        window.scrollTo(0, 0); // Scroll to top to show errors
        return false; // Indicate validation failed
      }

      if (!launchConfirmation) {
         setError('Please confirm you are ready to launch.');
         return false; // Indicate validation failed
      }

       // Validate templates structure right before launch
      const preparedCampaign = prepareCampaignForSubmission(data);
      const templateValidation = validateCampaignTemplates(preparedCampaign);
      if (!templateValidation.success) {
          setError(`Email Template Error: ${templateValidation.message}`);
          toggleSection('emails'); // Open email section
          window.scrollTo(0, 0);
          return false; // Indicate validation failed
      }

      return true; // Indicate validation passed
  };

  // Helper to display participant details
  const renderParticipant = (participant) => {
    // Access nested employee details
    const employee = participant.employee || {};
    const name = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || participant.employeeName || 'Unknown Name';
    const email = employee.email || participant.employeeEmail || 'No email';
    const aiSuggested = participant.aiSuggested || false; // Assuming this field exists

    return (
      <div key={participant.employeeId || email} className="flex items-center mb-1 last:mb-0">
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2 flex-shrink-0">
          <User className="h-4 w-4" />
        </div>
        <div className="flex-grow min-w-0">
           <p className="text-sm text-gray-900 truncate" title={name}>{name}</p>
           <p className="text-xs text-gray-500 truncate" title={email}>{email}</p>
        </div>
        {aiSuggested && (
          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full flex-shrink-0">
            AI
          </span>
        )}
      </div>
    );
  };

   // Helper to display email template content safely
  const renderEmailContent = (content) => {
    if (!content) return '<p class="italic text-gray-500">(No template configured)</p>';
    // Basic sanitization (replace potential script tags) - consider a more robust library if needed
    const sanitized = content.replace(/<script.*?>.*?<\/script>/gi, '');
    return `<div class="prose prose-sm max-w-none">${sanitized}</div>`;
  };


  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Review and Launch</h2>
        <p className="text-gray-600">
          Review your campaign details before launching. Once launched, invitations will be sent according to the schedule.
        </p>
      </div>

       {/* General Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}


      {/* Validation Errors Summary */}
      {validationErrors.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-yellow-800 font-medium">Please review the following:</h3>
              <ul className="mt-2 text-sm text-yellow-700 list-disc pl-5 space-y-1">
                {validationErrors.map((err, index) => (
                  <li key={index}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}


      {/* Basic Information Section */}
      <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
        <div
          className="bg-gray-50 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100"
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
            {loading ? <p>Loading details...</p> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Campaign Name</p>
                  <p className="mt-1 text-gray-900">{data.name || <span className="text-red-600 italic">Not set</span>}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Description</p>
                  <p className="mt-1 text-gray-900">{data.description || <span className="text-gray-500 italic">Not provided</span>}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Feedback Template</p>
                  <p className="mt-1 text-gray-900">{template?.name || <span className="text-red-600 italic">Not set</span>}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Target Employee</p>
                  <p className="mt-1 text-gray-900">
                    {targetEmployee ? `${targetEmployee.firstName} ${targetEmployee.lastName}` : <span className="text-red-600 italic">Not set</span>}
                  </p>
                   {targetEmployee?.jobTitle && <p className="text-xs text-gray-500">{targetEmployee.jobTitle}</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>


      {/* Participants Section */}
      <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
        <div
          className="bg-gray-50 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100"
          onClick={() => toggleSection('participants')}
        >
          <div className="flex items-center">
            <Users className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="font-medium text-gray-900">Participants</h3>
            <span className="ml-2 text-gray-500 text-sm">
              ({(data.participants || []).length} total)
            </span>
          </div>
          {openSections.participants ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
        </div>

        {openSections.participants && (
          <div className="p-4 bg-white max-h-96 overflow-y-auto">
             {loading ? <p>Loading participants...</p> : (data.participants && data.participants.length > 0 ? (
                 <div className="space-y-4">
                    {['self', 'manager', 'peer', 'direct_report', 'external'].map(type => {
                        const participantsOfType = getParticipantsByType(type);
                        if (participantsOfType.length === 0 && type !== 'self' && type !== 'manager' && type !== 'peer') return null; // Only show sections with participants or required types

                        return (
                            <div key={type}>
                                <h4 className="text-sm font-medium text-gray-900 mb-2 capitalize flex justify-between">
                                    <span>{formatRelationshipType(type)}</span>
                                    <span className="text-gray-500 text-xs font-normal">({participantsOfType.length})</span>
                                </h4>
                                {participantsOfType.length > 0 ? (
                                    <div className="space-y-1">
                                        {participantsOfType.map(renderParticipant)}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">None selected</p>
                                )}
                                {/* Add requirement messages */}
                                {type === 'self' && participantsOfType.length === 0 && <p className="text-xs text-red-500 mt-1">Self-assessment required.</p>}
                                {type === 'manager' && participantsOfType.length === 0 && <p className="text-xs text-red-500 mt-1">Min. 1 manager required.</p>}
                                {type === 'peer' && participantsOfType.length < 3 && <p className="text-xs text-red-500 mt-1">Min. 3 peers required.</p>}
                            </div>
                        );
                    })}
                 </div>
             ) : (
                <p className="text-gray-500 italic">No participants selected.</p>
             ))}
          </div>
        )}
      </div>


      {/* Schedule Section */}
      <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
        <div
           className="bg-gray-50 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100"
          onClick={() => toggleSection('schedule')}
        >
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="font-medium text-gray-900">Schedule</h3>
          </div>
           {openSections.schedule ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
        </div>

        {openSections.schedule && (
          <div className="p-4 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Start Date</p>
                  <p className="mt-1 text-gray-900">{formatDate(data.startDate) || <span className="text-red-600 italic">Not set</span>}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">End Date</p>
                  <p className="mt-1 text-gray-900">{formatDate(data.endDate) || <span className="text-red-600 italic">Not set</span>}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Duration</p>
                  <p className="mt-1 text-gray-900">
                    {data.startDate && data.endDate ? (
                      `${Math.ceil(Math.abs(new Date(data.endDate) - new Date(data.startDate)) / (1000 * 60 * 60 * 24)) + 1} days`
                    ) : <span className="text-gray-500 italic">Not set</span>}
                  </p>
                </div>
                 <div>
                  <p className="text-sm font-medium text-gray-500">Reminder Frequency</p>
                   <p className="mt-1 text-gray-900">
                     {data.settings?.reminderFrequency === 0 ? 'No automatic reminders' :
                      data.settings?.reminderFrequency ? `Every ${data.settings.reminderFrequency} days` :
                      <span className="text-gray-500 italic">Default (7 days)</span>}
                  </p>
                </div>
              </div>
          </div>
        )}
      </div>

      {/* AI Support Settings Section */}
      <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
        <div
           className="bg-gray-50 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100"
          onClick={() => toggleSection('aiSettings')}
        >
          <div className="flex items-center">
            <Brain className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="font-medium text-gray-900">AI Support Settings</h3>
          </div>
           {openSections.aiSettings ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
        </div>

        {openSections.aiSettings && (
          <div className="p-4 bg-white">
            <div className="flex justify-between items-center">
               <div>
                  <p className="text-sm font-medium text-gray-900">AI Feedback Assistance</p>
                  <p className="text-xs text-gray-500 mt-1">
                     {data.settings?.useFullAiSupport !== false
                       ? 'Full AI assistance enabled for assessors.'
                       : 'Basic mode enabled (no AI suggestions).'}
                  </p>
               </div>
              <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
                    <input
                      type="checkbox"
                      name="aiSupportToggle"
                      id="aiSupportToggle"
                      className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                      checked={data.settings?.useFullAiSupport !== false}
                      onChange={(e) => handleAiSupportChange(e.target.checked)}
                      style={{ right: data.settings?.useFullAiSupport !== false ? '0px' : 'auto', borderColor: data.settings?.useFullAiSupport !== false ? '#2563EB' : '#D1D5DB', transition: 'right 0.2s ease-in' }}

                    />
                    <label
                      htmlFor="aiSupportToggle"
                      className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${data.settings?.useFullAiSupport !== false ? 'bg-blue-600' : 'bg-gray-300'}`}
                    ></label>
              </div>
            </div>
             <p className="mt-2 text-xs text-gray-500">This setting affects all assessors and cannot be changed after launch.</p>
          </div>
        )}
      </div>


      {/* Email Templates Section */}
      <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
        <div
           className="bg-gray-50 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100"
          onClick={() => toggleSection("emails")}
        >
          <div className="flex items-center">
            <Mail className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="font-medium text-gray-900">Email Templates Preview</h3>
          </div>
           {openSections.emails ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
        </div>

        {openSections.emails && (
          <div className="p-4 bg-white max-h-96 overflow-y-auto">
              {(!data.emailTemplates || typeof data.emailTemplates !== 'object' || Object.keys(data.emailTemplates).length === 0) ? (
                 <p className="text-red-600 italic">Email templates not configured (Step 5).</p>
              ) : (
                  <div className="space-y-4">
                     {/* Show Invitation (most important) */}
                     {data.emailTemplates.invitation && Object.keys(data.emailTemplates.invitation).length > 0 ? (
                         Object.entries(data.emailTemplates.invitation).map(([recipient, template]) => (
                           <div key={`inv-${recipient}`}>
                              <h4 className="text-sm font-medium text-gray-900 mb-1">Invitation ({formatRelationshipType(recipient)})</h4>
                              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs" dangerouslySetInnerHTML={{ __html: renderEmailContent(template?.content) }} />
                           </div>
                         ))
                     ) : (
                          <p className="text-red-600 italic">Invitation email template missing.</p>
                     )}

                      {/* Optionally show others if configured */}
                      {data.emailTemplates.reminder && Object.keys(data.emailTemplates.reminder).length > 0 && (
                          Object.entries(data.emailTemplates.reminder).map(([recipient, template]) => (
                           <div key={`rem-${recipient}`}>
                              <h4 className="text-sm font-medium text-gray-900 mb-1">Reminder ({formatRelationshipType(recipient)})</h4>
                              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs" dangerouslySetInnerHTML={{ __html: renderEmailContent(template?.content) }} />
                           </div>
                         ))
                      )}
                       {/* Add Thank You and Instruction previews similarly if needed */}

                  </div>
              )}
          </div>
        )}
      </div>


      {/* Launch Confirmation */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex">
          <div className="flex-shrink-0 mt-0.5">
            <CheckCircle className="h-5 w-5 text-blue-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Ready to launch?</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                 Please confirm all details are correct. Launching will schedule the campaign to start on {formatDate(data.startDate)}.
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
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setLaunchConfirmation(isChecked); // Keep local state if needed
                      onDataChange({ launchConfirmed: isChecked }); // Update parent state
                  }}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="launch-confirmation" className="font-medium text-blue-700 cursor-pointer">
                    I confirm that this campaign is ready to launch
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The redundant button block that was here has been removed */}
      {/* The main wizard button in CampaignWizard.jsx will now handle the final launch action */}
      {/* We pass the validation status up via onDataChange in the useEffect */}

    </div>
  );
};

export default ReviewLaunch;