// frontend/src/components/settings/IntegrationSettings.jsx

import React from 'react';
import { Database, Globe, Server } from 'lucide-react';

const IntegrationSettings = () => {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 flex items-center">
          <Globe className="h-5 w-5 mr-2 text-blue-500" />
          External Integrations
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Connect Pulse360 with external systems and services
        </p>
      </div>
      
      <div className="p-6">
        <div className="flex flex-col space-y-8">
          {/* HRIS Integration */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-start">
              <Server className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">HRIS Integration</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Connect to your company's Human Resources Information System for automatic employee data synchronization.
                </p>
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
                  <p className="text-sm text-blue-700">
                    This feature is coming soon. You'll be able to integrate with popular HRIS platforms to keep your employee data up-to-date automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* SSO Integration */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-start">
              <Database className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">Single Sign-On (SSO)</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configure SSO integration with your identity provider (IdP) to simplify user authentication.
                </p>
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
                  <p className="text-sm text-blue-700">
                    This feature is coming soon. Pulse360 will support integration with major identity providers like Okta, Azure AD, and Google Workspace.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* API Access */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-start">
              <Globe className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">API Access</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Manage API keys and permissions for programmatic access to Pulse360 data and functionality.
                </p>
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
                  <p className="text-sm text-blue-700">
                    This feature is coming soon. The Pulse360 API will allow you to build custom integrations and workflows.
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

export default IntegrationSettings;