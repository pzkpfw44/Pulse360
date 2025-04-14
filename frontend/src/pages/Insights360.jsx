// frontend/src/pages/Insights360.jsx

import React from 'react';
import { BarChart2 } from 'lucide-react';

const Insights360 = () => {
  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Insights 360</h1>
        <p className="text-sm text-gray-500">
          This section is currently under development
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="flex flex-col items-center justify-center">
          <div className="relative mb-6">
            <BarChart2 size={64} className="text-blue-500" />
            <div className="absolute top-0 right-0 bg-yellow-400 p-1 rounded-full">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
          </div>
          
          <h2 className="text-xl font-bold mb-3">Work in Progress</h2>
          
          <p className="max-w-lg text-gray-600 mb-4">
            We're actively developing this feature for Pulse360. It will be 
            available soon to help streamline your 360-degree feedback 
            processes.
          </p>
          
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 max-w-lg text-left">
            <h3 className="font-semibold text-blue-700 mb-2">Coming Soon: Advanced Analytics</h3>
            <ul className="list-disc list-inside text-blue-600 space-y-1">
              <li>Trend identification across multiple campaigns</li>
              <li>Development priority suggestions</li>
              <li>Comparative analysis between departments</li>
              <li>AI-generated action plans and recommendations</li>
              <li>Organizational culture insights and metrics</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Insights360;