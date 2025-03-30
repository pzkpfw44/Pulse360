import React from 'react';
import { Construction } from 'lucide-react';

const WorkInProgress = ({ title }) => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          This section is currently under development
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-12 flex flex-col items-center justify-center text-center">
        <Construction size={64} className="text-blue-500 mb-4" />
        <h2 className="text-xl font-medium mb-2">
          Work in Progress
        </h2>
        <p className="text-gray-600 max-w-lg">
          We're actively developing this feature for Pulse360. It will be available soon to help streamline your 360-degree feedback processes.
        </p>
      </div>
    </div>
  );
};

export default WorkInProgress;