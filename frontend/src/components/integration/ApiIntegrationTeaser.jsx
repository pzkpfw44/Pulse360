// frontend/src/components/integration/ApiIntegrationTeaser.jsx

import React from 'react';
import { Database, Server, Code, Lock, Rocket, CheckCircle } from 'lucide-react';

const ApiIntegrationTeaser = () => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold mb-2">API Integration - Coming Soon</h2>
        <p className="text-gray-500">
          Seamlessly connect Pulse360 with your company's HR systems for automatic employee data synchronization.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-4 border border-blue-100 rounded-lg bg-blue-50">
          <div className="flex items-center mb-3">
            <Server className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="font-medium">HCM Systems</h3>
          </div>
          <p className="text-sm text-gray-600">
            Connect to popular HCM systems like Workday, SAP SuccessFactors, and Oracle HCM.
          </p>
        </div>
        
        <div className="p-4 border border-blue-100 rounded-lg bg-blue-50">
          <div className="flex items-center mb-3">
            <Database className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="font-medium">Automated Sync</h3>
          </div>
          <p className="text-sm text-gray-600">
            Keep employee data automatically synchronized with scheduled imports.
          </p>
        </div>
        
        <div className="p-4 border border-blue-100 rounded-lg bg-blue-50">
          <div className="flex items-center mb-3">
            <Lock className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="font-medium">Secure & Compliant</h3>
          </div>
          <p className="text-sm text-gray-600">
            Enterprise-grade security with data encryption and access controls.
          </p>
        </div>
      </div>
      
      <div className="border-t border-gray-200 pt-6 mb-6">
        <h3 className="font-medium mb-4">Integration Benefits</h3>
        <div className="space-y-3">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              Eliminate manual data entry and reduce administrative overhead
            </p>
          </div>
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              Ensure data accuracy with bi-directional synchronization
            </p>
          </div>
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              Automatically update organizational charts and reporting relationships
            </p>
          </div>
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              Keep employee statuses and job information current
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center mb-3">
          <Rocket className="h-6 w-6 mr-2" />
          <h3 className="font-medium text-lg">Join the Early Access Program</h3>
        </div>
        <p className="mb-4 text-blue-100">
          Be the first to experience our API integration capabilities. 
          Sign up for our early access program to get priority access when this feature launches.
        </p>
        <button className="bg-white text-blue-600 px-4 py-2 rounded font-medium hover:bg-blue-50 transition-colors">
          Request Early Access
        </button>
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500 italic">
          API integration functionality is currently in development and will be available soon.
        </p>
      </div>
    </div>
  );
};

export default ApiIntegrationTeaser;