// frontend/src/components/campaigns/CampaignWizard.jsx

import React, { useState, useEffect } from 'react';
import { Save, Send, ArrowLeft, ArrowRight } from 'lucide-react';
import TemplateSelection from './wizard/TemplateSelection';
import TargetSelection from './wizard/TargetSelection';
import AssessorSelection from './wizard/AssessorSelection';
import ScheduleSetup from './wizard/ScheduleSetup';
import EmailSetup from './wizard/EmailSetup';
import ReviewLaunch from './wizard/ReviewLaunch';
import { validateCampaignTemplates, prepareCampaignForSubmission } from '../../utils/CampaignUtils';

const CampaignWizard = ({ initialData, onSaveDraft, onLaunch }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [campaignData, setCampaignData] = useState({
    name: '',
    description: '',
    templateId: '',
    targetEmployeeId: '',
    participants: [],
    startDate: null,
    endDate: null,
    emailTemplates: {},
    settings: {},
    useFullAiSupport: true // Default to true for full AI support
  });

  // Initialize with provided data, if any
  useEffect(() => {
    if (initialData) {
      setCampaignData(prevData => ({
        ...prevData,
        ...initialData,
        // Ensure we don't lose any fields that might not be in initialData
        participants: initialData.participants || prevData.participants,
        emailTemplates: initialData.emailTemplates || prevData.emailTemplates,
        settings: initialData.settings || prevData.settings,
        useFullAiSupport: initialData.useFullAiSupport !== undefined ? initialData.useFullAiSupport : prevData.useFullAiSupport
      }));
    }
  }, [initialData]);

  // Update campaign data based on step changes
  const updateCampaignData = (stepData) => {
    setCampaignData(prevData => ({
      ...prevData,
      ...stepData
    }));
  };

  // Handle "Next Step" button click
  const handleNextStep = async (stepData) => {
    // Update data from current step
    const updatedData = { ...campaignData, ...stepData };
    
    // Special handling for email templates to ensure they're saved correctly
    if (stepData.emailTemplates && currentStep === 5) {
      console.log('Saving email templates:', stepData.emailTemplates);
      // Force re-validate to ensure it's recognized properly
      const validateResult = validateCampaignTemplates(updatedData);
      console.log('Email template validation result:', validateResult);
    }
    
    updateCampaignData(stepData);
    
    // Validate current step
    const isValid = validateStep(currentStep, updatedData);
    if (!isValid) {
      return;
    }
    
    // If it's the last step, don't increment
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Handle "Previous Step" button click
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle "Save Draft" button click
  const handleSaveDraft = async () => {
    try {
      setIsLoading(true);
      await onSaveDraft(campaignData);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle "Launch Campaign" button click
  const handleLaunch = async () => {
    try {
      setIsLoading(true);
      await onLaunch(campaignData);
    } finally {
      setIsLoading(false);
    }
  };

  // Validate current step
  const validateStep = (step, data) => {
    switch (step) {
      case 1: // Template Selection
        return !!data.templateId;
      case 2: // Target Selection
        return !!data.targetEmployeeId;
      case 3: // Assessor Selection
        // Check minimum requirements:
        // 1. Self assessment
        // 2. At least one manager
        // 3. At least three peers
        const participants = data.participants || [];
        const relationshipTypes = participants.map(p => p.relationshipType);
        
        const hasSelf = relationshipTypes.includes('self');
        const hasManager = relationshipTypes.includes('manager');
        const peerCount = relationshipTypes.filter(type => type === 'peer').length;
        
        return hasSelf && hasManager && peerCount >= 3;
      case 4: // Schedule Setup
        return !!data.startDate && !!data.endDate;
        case 5: // Email Templates
        // More flexible validation that will pass if any format of email templates is present
        if (!data.emailTemplates) {
          return false;
        }
        
        // For any format, as long as there's something in emailTemplates, consider it valid
        // The actual detailed validation will happen in validateCampaignTemplates
        return Object.keys(data.emailTemplates).length > 0;
    }
  };

  // Total steps in the wizard
  const totalSteps = 6;

  // Render the appropriate step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <TemplateSelection
            data={campaignData}
            onDataChange={updateCampaignData}
            onNext={handleNextStep}
          />
        );
      case 2:
        return (
          <TargetSelection
            data={campaignData}
            onDataChange={updateCampaignData}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
          />
        );
      case 3:
        return (
          <AssessorSelection
            data={campaignData}
            onDataChange={updateCampaignData}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
            showValidationErrors={true} // This line to show validation errors
          />
        );
      case 4:
        return (
          <ScheduleSetup
            data={campaignData}
            onDataChange={updateCampaignData}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
          />
        );
      case 5:
        return (
          <EmailSetup
            data={campaignData}
            onDataChange={updateCampaignData}
            onNext={handleNextStep}
            onPrev={handlePrevStep}
          />
        );
      case 6:
        return (
          <ReviewLaunch
            data={campaignData}
            onDataChange={updateCampaignData}
            onPrev={handlePrevStep}
            onLaunch={handleLaunch}
          />
        );
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Progress Indicator */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-medium">
            Step {currentStep} of {totalSteps}
          </h2>
          <div className="flex space-x-3">
            <button
              onClick={handleSaveDraft}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </button>
          </div>
        </div>

        <div className="relative">
          <div className="overflow-hidden h-2 flex rounded bg-gray-200">
            <div
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              className="bg-blue-500 transition-all duration-300"
            ></div>
          </div>
          <div className="absolute top-0 left-0 right-0 flex justify-between -mt-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`w-5 h-5 rounded-full border-2 ${
                  i + 1 <= currentStep
                    ? 'bg-blue-500 border-blue-500'
                    : 'bg-white border-gray-300'
                }`}
              ></div>
            ))}
          </div>
        </div>

        <div className="flex justify-between mt-2 text-xs text-gray-500">
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

        {/* Step Navigation Buttons - Controlled by individual steps */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
          <div> {/* Left container for Previous button */}
            <button
              type="button"
              onClick={handlePrevStep}
              disabled={currentStep === 1 || isLoading}
              className={`inline-flex items-center px-4 py-2 ${
                currentStep === 1
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-gray-50'
              } border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white`}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </button>
          </div>
          
          {/* Center container for error messages */}
          <div className="text-center flex-grow mx-4">
            {currentStep === 3 && !validateStep(3, campaignData) && (
              <div className="text-red-600 text-sm font-medium">
                Please select at least 1 Manager and 3 Peers to continue
              </div>
            )}
          </div>
          
          {/* Right container for Next/Launch button */}
          <div>
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={() => handleNextStep(campaignData)}
                disabled={isLoading || !validateStep(currentStep, campaignData)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLaunch}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
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
    </div>
  );
};

export default CampaignWizard;