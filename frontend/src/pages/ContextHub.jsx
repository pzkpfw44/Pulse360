import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import DocumentUpload from '../components/contexthub/DocumentUpload';
import DocumentList from '../components/contexthub/DocumentList';
import { useNavigate } from 'react-router-dom';

const ContextHub = () => {
  // State to control auto-refresh when a document is uploaded
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();

  // Function to be called after successful document upload
  const handleDocumentUploaded = () => {
    // Increment trigger to cause DocumentList to refresh
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">ContextHub</h1>
        <p className="text-sm text-gray-500">
          Manage organizational documents and feedback templates
        </p>
      </div>

      {/* Action buttons section */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => navigate('/templates')}
          className="flex items-center px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 transition-colors"
        >
          <FileText size={18} className="mr-2" />
          Manage Templates
        </button>
      </div>

      {/* Document Library Section (Top) */}
      <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
        <div className="p-5 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold">Company Knowledge</h2>
          <p className="text-sm text-gray-500">
            Manage your uploaded organizational documents
          </p>
        </div>
        <div>
          <DocumentList key={refreshTrigger} /> {/* Key prop ensures re-render on upload */}
        </div>
      </div>

      {/* Upload Documents Section (Bottom) */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-5 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold">Upload Documents</h2>
          <p className="text-sm text-gray-500">
            Upload organizational documents to generate feedback templates
          </p>
        </div>
        <div>
          <DocumentUpload onDocumentUploaded={handleDocumentUploaded} />
        </div>
      </div>
    </div>
  );
};

export default ContextHub;