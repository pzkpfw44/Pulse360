import React, { useState, useEffect } from 'react';
import api from "../../services/api";
import {
  Delete,
  Edit,
  Copy,
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock,
  Plus,
  Zap,
  Brain,
  Settings,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TemplateConfiguration from './TemplateConfiguration';

const TemplateList = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      console.log('Fetching templates...');
      const response = await api.get('/templates');
      console.log('Templates response:', response.data);
      
      // Check if templates exist
      if (response.data && response.data.templates) {
        setTemplates(response.data.templates);
      } else if (response.data && Array.isArray(response.data)) {
        // If data is returned as an array directly
        setTemplates(response.data);
      } else {
        console.warn('Unexpected templates data format:', response.data);
        setTemplates([]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTemplate = (templateId) => {
    console.log('Viewing template with ID:', templateId);
    navigate(`/contexthub/templates/${templateId}`);
  };

  const handleDeleteClick = (template) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;
  
    try {
      setError(null); // Clear any previous errors
      
      const response = await api.delete(`/templates/${templateToDelete.id}`);
      
      // Remove the deleted template from the list
      setTemplates(templates.filter(t => t.id !== templateToDelete.id));
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
      
    } catch (err) {
      console.error('Error deleting template:', err);
      
      // Extract detailed error message if available
      const errorMessage = err.response?.data?.message || 'Failed to delete template. Please try again later.';
      
      setError(errorMessage);
      // Keep the dialog open so the user can see the error
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending_review: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" />, label: 'Pending Review' },
      approved: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" />, label: 'Approved' },
      archived: { color: 'bg-gray-100 text-gray-800', icon: <Copy className="h-3 w-3" />, label: 'Archived' },
    };

    const config = statusConfig[status] || statusConfig.pending_review;

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading templates...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Manage Templates</h1>
        <p className="text-sm text-gray-500">
          Review and manage feedback templates generated from your documents
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end mb-6">
        <button
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          onClick={() => navigate('/contexthub')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Upload New Document
        </button>
      </div>
      
      <TemplateConfiguration onTemplateCreated={fetchTemplates} />

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <p>{error}</p>
          <button 
            className="text-red-700 underline ml-2"
            onClick={fetchTemplates}
          >
            Retry
          </button>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Templates Found
          </h3>
          <p className="text-gray-500 mb-4">
            Upload documents to generate feedback templates, or create templates manually.
          </p>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            onClick={() => navigate('/contexthub')}
          >
            Upload Documents
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div 
              key={template.id} 
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-medium text-gray-900 truncate mr-2">
                    {template.name}
                  </h3>
                  {getStatusBadge(template.status)}
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {formatDocumentType(template.documentType)}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    {template.questions?.length || 0} Questions
                  </span>

                  {/* Generation method badge */}
                  {(template.generatedBy === 'flux_ai_direct' || template.generatedBy === 'flux_ai') && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                      <Brain className="h-3 w-3 mr-1" />
                      AI Generated
                    </span>
                  )}
                  {template.generatedBy === 'flux_ai_enhanced' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                      <Zap className="h-3 w-3 mr-1" />
                      AI Enhanced
                    </span>
                  )}
                  {template.generatedBy === 'flux_ai_fallback' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                      <Zap className="h-3 w-3 mr-1" />
                      AI Assisted
                    </span>
                  )}
                  {(template.generatedBy === 'Pre-loaded Template' || template.generatedBy === 'standard') && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                      <Settings className="h-3 w-3 mr-1" />
                      Pre-loaded Template
                    </span>
                  )}
                  {template.generatedBy === 'manual' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                      <Edit className="h-3 w-3 mr-1" />
                      Custom
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {template.description || 'No description provided.'}
                </p>

                <p className="text-xs text-gray-400">
                  Created: {new Date(template.createdAt).toLocaleDateString()}
                </p>
              </div>
              
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-between">
                <div className="flex space-x-2">
                  <button
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    onClick={() => handleViewTemplate(template.id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </button>
                  {template.status === 'pending_review' && (
                    <button
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                      onClick={() => handleViewTemplate(template.id)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                  )}
                </div>
                <button
                  className="text-sm text-red-600 hover:text-red-800"
                  onClick={() => handleDeleteClick(template)}
                >
                  <Delete className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setDeleteDialogOpen(false)}></div>
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Delete Template</h3>
              </div>
              <div className="px-6 py-4">
                <p className="text-gray-700">
                  Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
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

export default TemplateList;