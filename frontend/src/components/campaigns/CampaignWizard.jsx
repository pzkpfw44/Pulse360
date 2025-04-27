// frontend/src/components/campaigns/CampaignWizard.jsx

import React, { useState, useEffect } from 'react';
import { Save, Send, ArrowLeft, ArrowRight } from 'lucide-react';
import TemplateSelection from './wizard/TemplateSelection';
import TargetSelection from './wizard/TargetSelection';
import AssessorSelection from './wizard/AssessorSelection';
import ScheduleSetup from './wizard/ScheduleSetup';
import EmailSetup from './wizard/EmailSetup';
import ReviewLaunch from './wizard/ReviewLaunch';
import { validateCampaignTemplates, prepareCampaignForSubmission } from '../../utils/CampaignUtils'; // Assuming this exists and works

const CampaignWizard = ({ initialData, onSaveDraft, onLaunch }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [campaignData, setCampaignData] = useState({
    name: '',
    description: '',
    templateId: '',
    targetEmployeeId: '',
    targetEmployeeDetails: null, // Added to store details
    participants: [],
    startDate: null,
    endDate: null,
    emailTemplates: {},
    settings: { // Initialize settings object
        reminderFrequency: 7, // Default reminder frequency
        useFullAiSupport: true // Default AI support setting
    },
    launchConfirmed: false // Add this line for final step confirmation
  });
   // State to hold validation errors passed up from ReviewLaunch
  const [validationErrors, setValidationErrors] = useState([]);


  // Initialize with provided data, if any
  useEffect(() => {
    if (initialData) {
      setCampaignData(prevData => ({
        ...prevData, // Keep defaults
        ...initialData, // Overwrite with initialData
        // Ensure complex objects are merged or replaced correctly
        participants: initialData.participants || prevData.participants,
        emailTemplates: initialData.emailTemplates || prevData.emailTemplates,
        settings: { // Merge settings carefully
           ...prevData.settings,
           ...(initialData.settings || {})
        },
        targetEmployeeDetails: initialData.targetEmployeeDetails || prevData.targetEmployeeDetails,
        launchConfirmed: initialData.launchConfirmed || prevData.launchConfirmed, // Persist confirmation if loaded
      }));
       // Initialize validation errors if loading existing draft on review step
       if (initialData.status === 'draft' && currentStep === totalSteps) {
          // You might need a way to re-calculate/fetch these if not saved
          // setValidationErrors(initialData.validationErrors || []);
       }
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]); // Removed currentStep dependency to avoid loop on last step


  // Update campaign data based on step changes
  const updateCampaignData = (stepData) => {
      // Handle validation errors specifically if passed up
      if (stepData.validationErrors !== undefined) {
        setValidationErrors(stepData.validationErrors);
         // Avoid merging validationErrors into campaignData state
         const { validationErrors: _, ...restStepData } = stepData;
         stepData = restStepData;
      }

       // Keep track of launch confirmation state specifically
       if (stepData.launchConfirmed !== undefined) {
         setCampaignData(prevData => ({
             ...prevData,
             launchConfirmed: stepData.launchConfirmed
         }));
         // Avoid merging launchConfirmed with other data if it's the only thing changed
          if (Object.keys(stepData).length === 1) return;
          const { launchConfirmed: __, ...restDataForCampaign } = stepData;
          stepData = restDataForCampaign;
       }

       // Update other campaign data fields
       setCampaignData(prevData => ({
           ...prevData,
           ...stepData
       }));
    };


  // Basic validation function for each step
  const validateStep = (step, data) => {
    switch (step) {
      case 1: // Template Selection
        return !!data.templateId;
      case 2: // Target Selection
        return !!data.targetEmployeeId && !!data.name; // Also require name now
      case 3: // Assessor Selection
        const participants = data.participants || [];
        const types = participants.map(p => p.relationshipType);
        return types.includes('self') && types.includes('manager') && types.filter(t => t === 'peer').length >= 3;
      case 4: // Schedule Setup
        if (!data.startDate || !data.endDate) return false;
        // Check if end date is after start date
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);
        return start <= end;
      case 5: // Email Templates
        // Check if invitation key exists and has at least one recipient type defined
        return data.emailTemplates && typeof data.emailTemplates.invitation === 'object' && Object.keys(data.emailTemplates.invitation).length > 0;
      case 6: // Review Launch - validation handled internally + launchConfirmed state
        // Base validation (all previous steps must be valid)
        for (let i = 1; i < totalSteps; i++) {
            if (!validateStep(i, data)) return false;
        }
        // Plus, the confirmation checkbox must be checked
        return data.launchConfirmed;
      default:
        return false;
    }
  };


  // Handle "Next Step" button click
  const handleNextStep = () => { // Removed stepData param, uses state directly
    // Validate current step before proceeding
    if (!validateStep(currentStep, campaignData)) {
       console.log(`Validation failed for step ${currentStep}`);
       // Optionally show a message to the user
      return;
    }

    if (currentStep < totalSteps) {
       // Reset launch confirmation if moving away from the last step
       if (currentStep === totalSteps - 1) {
          setCampaignData(prev => ({ ...prev, launchConfirmed: false }));
          setValidationErrors([]); // Clear validation errors when moving to review step
       }
      setCurrentStep(currentStep + 1);
    }
  };

  // Handle "Previous Step" button click
  const handlePrevStep = () => {
    if (currentStep > 1) {
       // Reset launch confirmation if moving away from the last step
        if (currentStep === totalSteps) {
          setCampaignData(prev => ({ ...prev, launchConfirmed: false }));
          setValidationErrors([]); // Clear validation errors when leaving review step
        }
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle "Save Draft" button click
  const handleSaveDraft = async () => {
    try {
      setIsLoading(true);
      // Ensure we pass the latest data including launchConfirmed status
      await onSaveDraft({ ...campaignData }); // Pass full current data
    } catch (err) {
       console.error("Error saving draft:", err);
       // Handle error display
    } finally {
      setIsLoading(false);
    }
  };

  // Handle "Launch Campaign" button click (main button)
  const handleLaunch = async () => {
    // Re-validate everything just before launch
    for (let i = 1; i < totalSteps; i++) {
        if (!validateStep(i, campaignData)) {
             console.error(`Pre-launch validation failed for step ${i}`);
             // You might want to navigate the user back to the invalid step or show a clearer message
             alert(`Please complete Step ${i} correctly before launching.`);
             return;
        }
    }
    // Final template structure validation
     const preparedCampaign = prepareCampaignForSubmission(campaignData);
     const templateValidation = validateCampaignTemplates(preparedCampaign);
     if (!templateValidation.success) {
         alert(`Email Template Error: ${templateValidation.message}. Please check Step 5.`);
         setCurrentStep(5); // Navigate to email step
         return;
     }


    if (!campaignData.launchConfirmed) {
        alert("Please confirm you are ready to launch by checking the box in Step 6.");
        setCurrentStep(totalSteps); // Ensure user is on the last step
        return;
    }

    try {
      setIsLoading(true);
      await onLaunch(preparedCampaign); // Use the prepared data
    } catch (err) {
        console.error("Error launching campaign:", err);
        // Handle error display (e.g., show error message from API)
        alert(`Failed to launch campaign: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Total steps in the wizard
  const totalSteps = 6;

  // Render the appropriate step component
  const renderStep = () => {
    const stepProps = {
      data: campaignData,
      onDataChange: updateCampaignData,
      // Pass validation results down if needed by the component
      // validationErrors: currentStep === 3 ? validationErrors : {}, // Example for AssessorSelection
    };

    switch (currentStep) {
      case 1: return <TemplateSelection {...stepProps} />;
      case 2: return <TargetSelection {...stepProps} />;
      case 3: return <AssessorSelection {...stepProps} showValidationErrors={!validateStep(3, campaignData)} />; // Pass flag based on validation
      case 4: return <ScheduleSetup {...stepProps} />;
      case 5: return <EmailSetup {...stepProps} />;
      case 6: return <ReviewLaunch {...stepProps} wizardOnLaunch={handleLaunch} />; // Pass the wizard's launch handler if needed INTERNALLY by ReviewLaunch (removed its own button)
      default: return <div>Unknown step</div>;
    }
  };

  // Determine if the Next/Launch button should be disabled
  const isNextDisabled = () => {
      if (isLoading) return true;
      // For the final step, disable based on internal validation errors AND launch confirmation
      if (currentStep === totalSteps) {
          // Use the validation errors passed up from ReviewLaunch + launchConfirmed state
          return validationErrors.length > 0 || !campaignData.launchConfirmed;
      }
      // For other steps, use the step validation function
      return !validateStep(currentStep, campaignData);
  };


  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Progress Indicator */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        {/* ... Progress Indicator JSX ... */}
         <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-medium">Step {currentStep} of {totalSteps}</h2>
          <div className="flex space-x-3">
            <button onClick={handleSaveDraft} disabled={isLoading} className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
              <Save className="h-4 w-4 mr-2" /> Save Draft
            </button>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="relative pt-4"> {/* Added padding top */}
          <div className="overflow-hidden h-2 flex rounded bg-gray-200">
            <div style={{ width: `${(currentStep / totalSteps) * 100}%` }} className="bg-blue-500 transition-all duration-300"></div>
          </div>
          {/* Step Markers */}
          <div className="absolute top-0 left-0 right-0 flex justify-between">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} className={`w-5 h-5 rounded-full border-2 ${i + 1 <= currentStep ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`} style={{ transform: 'translateX(-50%)' }}></div>
            ))}
          </div>
        </div>
        {/* Step Labels */}
        <div className="flex justify-between mt-2 text-xs text-gray-500 px-1">
            <span>Template</span>
            <span>Target</span>
            <span>Assessors</span>
            <span>Schedule</span>
            <span>Emails</span>
            <span>Review</span>
        </div>

      </div>

      {/* Step Content */}
      <div className="p-6">
        {renderStep()}
      </div>

       {/* Step Navigation Buttons */}
       <div className="flex justify-between items-center mt-8 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          {/* Previous Button */}
          <div>
            <button
              type="button"
              onClick={handlePrevStep}
              disabled={currentStep === 1 || isLoading}
              className={`inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white ${currentStep === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </button>
          </div>

           {/* Center container for specific step messages (e.g., Assessor selection) */}
          <div className="text-center flex-grow mx-4">
            {currentStep === 3 && !validateStep(3, campaignData) && (
              <div className="text-red-600 text-sm font-medium">
                Min. 1 Manager & 3 Peers required
              </div>
            )}
             {/* Display general validation errors for the last step */}
             {currentStep === totalSteps && validationErrors.length > 0 && (
               <div className="text-red-600 text-sm font-medium">
                  Please fix errors before launching.
               </div>
             )}
              {currentStep === totalSteps && !campaignData.launchConfirmed && validationErrors.length === 0 && (
               <div className="text-blue-600 text-sm font-medium">
                  Please tick the confirmation box to enable launch.
               </div>
             )}
          </div>


          {/* Next / Launch Button */}
          <div>
            {currentStep < totalSteps ? (
              // NEXT Button
              <button
                type="button"
                onClick={handleNextStep}
                disabled={isNextDisabled()} // Use combined disabled logic
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            ) : (
              // LAUNCH Button
              <button
                type="button"
                onClick={handleLaunch} // Use the main launch handler
                disabled={isNextDisabled()} // Use combined disabled logic for final step
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Launching...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Launch Campaign
                  </>
                )}
              </button>
            )}
          </div>
        </div>
    </div>
  );
};

export default CampaignWizard;