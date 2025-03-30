import React, { useState, useEffect } from 'react';
import api from "../../services/api";
import {
  Delete,
  Check,
  Clock,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      console.log('Fetching documents...');
      const response = await api.get('/documents');
      console.log('Documents response:', response.data);
      setDocuments(response.data.documents || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (document) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    try {
      await api.delete(`/documents/${documentToDelete.id}`);
      // Remove the deleted document from the list
      setDocuments(documents.filter(doc => doc.id !== documentToDelete.id));
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document. Please try again later.');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      uploaded: { color: 'bg-gray-100 text-gray-800', icon: <Check className="h-3 w-3" />, label: 'Uploaded' },
      uploaded_to_ai: { color: 'bg-blue-100 text-blue-800', icon: <Check className="h-3 w-3" />, label: 'Uploaded to AI' },
      analysis_in_progress: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" />, label: 'Analysis In Progress' },
      analysis_complete: { color: 'bg-green-100 text-green-800', icon: <Check className="h-3 w-3" />, label: 'Analysis Complete' },
      analysis_failed: { color: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-3 w-3" />, label: 'Analysis Failed' },
    };

    const config = statusConfig[status] || statusConfig.uploaded;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const formatDocumentType = (type) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Format file size to readable format
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading documents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4" role="alert">
          <p>{error}</p>
        </div>
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          onClick={fetchDocuments}
        >
          Retry
        </button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Documents Found
        </h3>
        <p className="text-gray-500 mb-4">
          Upload organizational documents to get started.
        </p>
        <button
          onClick={() => window.location.href = '/contexthub'}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Upload Documents
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-5">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Company Knowledge
        </h3>
        <p className="text-sm text-gray-500">
          Manage your uploaded organizational documents
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.map((document) => (
              <tr key={document.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{document.filename}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {formatDocumentType(document.documentType)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatFileSize(document.size)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(document.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(document.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {document.status === 'analysis_complete' && document.associatedTemplateId && (
                    <button
                      className="text-blue-600 hover:text-blue-900 inline-flex items-center mr-3"
                      onClick={() => {
                        window.location.href = `/templates`;
                        console.log("Navigating to templates tab");
                      }}
                      title="View Template"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    className="text-red-600 hover:text-red-900"
                    onClick={() => handleDeleteClick(document)}
                    title="Delete Document"
                  >
                    <Delete className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {documents.some(doc => doc.status === 'analysis_complete') && (
        <div className="mt-6 text-right">
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            onClick={() => window.location.href = '/templates'}
          >
            View All Templates
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setDeleteDialogOpen(false)}></div>
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Delete Document</h3>
              </div>
              <div className="px-6 py-4">
                <p className="text-gray-700">
                  Are you sure you want to delete "{documentToDelete?.filename}"? This action cannot be undone.
                </p>
              </div>
              <div className="px-6 py-3 bg-gray-50 flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteDialogOpen(false)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DocumentList;