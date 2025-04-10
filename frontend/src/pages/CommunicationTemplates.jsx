// frontend/src/pages/CommunicationTemplates.jsx

import React, { useState } from 'react';
import { communicationTemplatesApi } from '../services/api';
import TemplateList from '../components/communication/TemplateList';
import TemplateEditor from '../components/communication/TemplateEditor';

const CommunicationTemplates = () => {
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleEditTemplate = (template) => {
    setActiveTemplate(template);
    setIsEditing(true);
    setSavedSuccess(false);
  };

  const handleCreateTemplate = (initialData = {}) => {
    setActiveTemplate(initialData);
    setIsEditing(true);
    setSavedSuccess(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setActiveTemplate(null);
  };

  const handleSaveTemplate = async (templateData) => {
    try {
      if (templateData.id) {
        // Update existing template
        await communicationTemplatesApi.update(templateData.id, templateData);
      } else {
        // Create new template
        await communicationTemplatesApi.create(templateData);
      }
      
      setSavedSuccess(true);
      setIsEditing(false);
      setActiveTemplate(null);
      
      return true;
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Communication Templates</h1>
        <p className="text-sm text-gray-500">
          Manage email and instruction templates for 360 feedback campaigns
        </p>
      </div>

      {savedSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">Template saved successfully!</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setSavedSuccess(false)}
          >
            <span className="sr-only">Dismiss</span>
            <svg className="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {isEditing ? (
        <TemplateEditor
          template={activeTemplate}
          onSave={handleSaveTemplate}
          onCancel={handleCancelEdit}
        />
      ) : (
        <TemplateList
          onEditTemplate={handleEditTemplate}
          onCreateTemplate={handleCreateTemplate}
        />
      )}
    </div>
  );
};

export default CommunicationTemplates;