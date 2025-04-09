// frontend/src/components/campaigns/AiSupportToggle.jsx

import React from 'react';
import { HelpCircle, Brain, AlertTriangle } from 'lucide-react';

const AiSupportToggle = ({ useFullAiSupport, onChange }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-1 flex items-center">
            <Brain className="h-5 w-5 mr-2 text-blue-600" />
            AI Support Settings
          </h3>
          <p className="text-gray-600 text-sm mb-3">
            Configure how Flux AI assists assessors during feedback collection
          </p>
        </div>
        <div className="relative inline-block w-12 align-middle select-none mt-1">
          <input
            type="checkbox"
            name="aiSupport"
            id="aiSupport"
            checked={useFullAiSupport}
            onChange={(e) => onChange(e.target.checked)}
            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
          />
          <label
            htmlFor="aiSupport"
            className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
              useFullAiSupport ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          ></label>
        </div>
      </div>

      <div className={`mt-2 p-3 rounded-md ${useFullAiSupport ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-gray-200'}`}>
        {useFullAiSupport ? (
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
      
      <div className="mt-3 flex items-start">
        <div className="flex-shrink-0">
          <HelpCircle className="h-4 w-4 text-gray-400" />
        </div>
        <p className="ml-2 text-xs text-gray-500">
          This setting affects all assessors in this campaign and cannot be changed after the campaign is launched.
        </p>
      </div>
    </div>
  );
};

export default AiSupportToggle;

// Add this CSS to your stylesheet
/*
.toggle-checkbox:checked {
  right: 0;
  border-color: #fff;
}
.toggle-checkbox:checked + .toggle-label {
  background-color: #3b82f6;
}
.toggle-label {
  transition: background-color 0.2s ease;
}
*/