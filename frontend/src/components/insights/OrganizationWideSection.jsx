// frontend/src/components/insights/OrganizationWideSection.jsx

import React from 'react';
import { Building, Clock } from 'lucide-react';

const OrganizationWideSection = () => {
  return (
    <div className="bg-white rounded-lg shadow p-8 text-center">
      <div className="flex flex-col items-center justify-center">
        <div className="relative mb-6">
          <Building size={64} className="text-blue-500" />
          <div className="absolute top-0 right-0 bg-yellow-400 p-1 rounded-full">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
        </div>
        
        <h2 className="text-xl font-bold mb-3">Coming Soon</h2>
        
        <p className="max-w-lg text-gray-600 mb-4">
          We're actively developing the Organization-Wide insights section. This feature will allow you to analyze broader organizational patterns and talent trends.
        </p>
        
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 max-w-lg text-left">
          <h3 className="font-semibold text-blue-700 mb-2">Organization-Wide Features</h3>
          <ul className="list-disc list-inside text-blue-600 space-y-1">
            <li>Talent Landscape Panorama - Strategic view of talent distribution</li>
            <li>Culture Pulse Monitor - Assess organizational values alignment</li>
            <li>Development Impact Scorecard - ROI analysis of investments</li>
            <li>Organizational culture insights and metrics</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OrganizationWideSection;