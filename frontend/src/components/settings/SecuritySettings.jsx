// frontend/src/components/settings/SecuritySettings.jsx

import React from 'react';
import { Shield, Key, LockIcon } from 'lucide-react';

const SecuritySettings = () => {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 flex items-center">
          <Shield className="h-5 w-5 mr-2 text-blue-500" />
          Security Settings
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure security and privacy settings for your Pulse360 instance
        </p>
      </div>
      
      <div className="p-6">
        <div className="flex flex-col space-y-8">
          {/* Password Policy */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-start">
              <Key className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">Password Policy</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configure password requirements and expiration settings.
                </p>
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
                  <p className="text-sm text-blue-700">
                    This feature is coming soon. You'll be able to set password complexity requirements, expiration periods, and more.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Data Privacy */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-start">
              <LockIcon className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">Data Privacy</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configure data retention, anonymization, and export policies.
                </p>
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
                  <p className="text-sm text-blue-700">
                    This feature is coming soon. You'll be able to configure how feedback data is anonymized, how long it's retained, and set up automatic exports.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;