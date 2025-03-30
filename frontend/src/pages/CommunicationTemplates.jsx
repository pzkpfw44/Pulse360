// frontend/src/pages/CommunicationTemplates.jsx

import React from 'react';
import { Mail, Plus } from 'lucide-react';

const CommunicationTemplates = () => {
  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Communication Templates</h1>
          <p className="text-sm text-gray-500">
            Manage email and notification templates for feedback campaigns
          </p>
        </div>
        
        <button
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center flex-col p-12">
          <Mail size={64} className="text-blue-500 mb-4" />
          <h2 className="text-xl font-medium mb-2">
            Communication Templates Coming Soon
          </h2>
          <p className="text-gray-600 max-w-lg text-center">
            This feature is currently in development. Soon you'll be able to create and manage email templates for invitations, reminders, and notifications.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CommunicationTemplates;