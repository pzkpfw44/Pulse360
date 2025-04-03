import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from "../../services/api";
import { Plus, Check, X, RefreshCw, FileText } from 'lucide-react';

const TemplateConfiguration = ({ onTemplateCreated }) => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    purpose: '',
    department: '',
    documentType: '',
    perspectiveSettings: {
      manager: { enabled: true, questionCount: 10 },
      peer: { enabled: true, questionCount: 10 },
      direct_report: { enabled: true, questionCount: 10 },
      self: { enabled: true, questionCount: 10 },
      external: { enabled: false, questionCount: 5 }
    }
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (showForm) {
      fetchAvailableDocuments();
    }
  }, [showForm]);

  const fetchAvailableDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/documents');
      
      // Filter out documents that are already being processed or analyzed
      const availableDocs = (response.data.documents || []).filter(doc => 
        doc.status === 'uploaded'
      );
      
      setDocuments(availableDocs);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load available documents');
      setLoading(false);
    }
  };

  const handleToggleForm = () => {
    setShowForm(!showForm);
    if (!showForm) {
      // Reset form when opening
      setSelectedDocumentIds([]);
      setError(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleDocumentSelection = (documentId) => {
    setSelectedDocumentIds(prev => {
      if (prev.includes(documentId)) {
        return prev.filter(id => id !== documentId);
      } else {
        return [...prev, documentId];
      }
    });
    
    // If this is the first document selected, use its documentType
    if (selectedDocumentIds.length === 0) {
      const selectedDoc = documents.find(doc => doc.id === documentId);
      if (selectedDoc) {
        setFormData(prev => ({
          ...prev,
          documentType: selectedDoc.documentType,
          name: `${selectedDoc.documentType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Template`
        }));
      }
    }
  };

  const handlePerspectiveSettingChange = (perspective, field, value) => {
    setFormData(prev => ({
      ...prev,
      perspectiveSettings: {
        ...prev.perspectiveSettings,
        [perspective]: {
          ...prev.perspectiveSettings[perspective],
          [field]: field === 'questionCount' ? parseInt(value) : value
        }
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedDocumentIds.length === 0) {
      setError('Please select at least one document');
      return;
    }
    
    if (!formData.documentType) {
      setError('Document type is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/templates/generate-configured', {
        documentIds: selectedDocumentIds,
        name: formData.name,
        description: formData.description,
        purpose: formData.purpose,
        department: formData.department,
        documentType: formData.documentType,
        perspectiveSettings: formData.perspectiveSettings
      });
      
      // Reset the form
      setShowForm(false);
      setSelectedDocumentIds([]);
      
      // Navigate to the template review page
      if (response.data && response.data.template) {
        navigate(`/contexthub/templates/${response.data.template.id}`);
      }
      
      // Notify parent component
      if (onTemplateCreated) {
        onTemplateCreated();
      }
      
    } catch (err) {
      console.error('Error generating template:', err);
      setError(err.response?.data?.message || 'Failed to generate template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-8 bg-white rounded-lg shadow-sm">
      <div className="p-5 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Create New Template</h2>
          <p className="text-sm text-gray-500">
            Configure and generate a new feedback template from your documents
          </p>
        </div>
        <button
          onClick={handleToggleForm}
          className={`flex items-center px-4 py-2 rounded-md transition-colors ${
            showForm 
              ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {showForm ? 'Cancel' : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </>
          )}
        </button>
      </div>
      
      {showForm && (
        <div className="p-5">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <p>{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            {/* Document Selection */}
            <div className="mb-6">
              <h3 className="text-md font-medium mb-2">Select Documents</h3>
              
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="ml-3 text-gray-600">Loading documents...</p>
                </div>
              ) : documents.length === 0 ? (
                <div className="bg-gray-50 p-6 text-center rounded-lg">
                  <p className="text-gray-600 mb-3">
                    No available documents found.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/contexthub')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Upload Documents
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {documents.map(doc => (
                    <div 
                      key={doc.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        selectedDocumentIds.includes(doc.id) 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                      onClick={() => handleDocumentSelection(doc.id)}
                    >
                      <div className="flex items-start">
                        <div className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border flex items-center justify-center ${
                          selectedDocumentIds.includes(doc.id) 
                            ? 'bg-blue-500 border-blue-500 text-white' 
                            : 'border-gray-300'
                        }`}>
                          {selectedDocumentIds.includes(doc.id) && <Check className="w-3 h-3" />}
                        </div>
                        <div className="ml-2 flex-1">
                          <p className="font-medium text-gray-900 truncate">{doc.filename}</p>
                          <p className="text-xs text-gray-500">
                            {doc.documentType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Template Information */}
            <div className="mb-6">
              <h3 className="text-md font-medium mb-3">Template Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-500 mb-1">
                    Template Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="documentType" className="block text-sm font-medium text-gray-500 mb-1">
                    Document Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="documentType"
                    name="documentType"
                    value={formData.documentType}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select document type</option>
                    <option value="leadership_model">Leadership Model</option>
                    <option value="job_description">Job Description</option>
                    <option value="competency_framework">Competency Framework</option>
                    <option value="company_values">Company Values</option>
                    <option value="performance_criteria">Performance Criteria</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-500 mb-1">
                    Department / Function
                  </label>
                  <input
                    id="department"
                    name="department"
                    type="text"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g., Finance, Engineering, Marketing"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="purpose" className="block text-sm font-medium text-gray-500 mb-1">
                    Template Purpose
                  </label>
                  <textarea
                    id="purpose"
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g., 360 Assessment for Finance Controller Manager"
                    rows={2}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-500 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    rows={2}
                  />
                </div>
              </div>
            </div>
            
            {/* Perspective Settings */}
            <div className="mb-6">
              <h3 className="text-md font-medium mb-3">Perspective Settings</h3>
              <p className="text-sm text-gray-500 mb-4">
                Configure which perspectives to include and how many questions each should have.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(formData.perspectiveSettings).map(([perspective, settings]) => (
                  <div key={perspective} className={`border rounded-lg p-4 ${!settings.enabled ? 'opacity-60' : ''}`}>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">
                        {perspective.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Assessment
                      </h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.enabled}
                          onChange={(e) => handlePerspectiveSettingChange(perspective, 'enabled', e.target.checked)}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div>
                      <label htmlFor={`${perspective}-count`} className="block text-sm font-medium text-gray-500 mb-1">
                        Question Count
                      </label>
                      <input
                        id={`${perspective}-count`}
                        type="number"
                        min="0"
                        max="50"
                        value={settings.questionCount}
                        onChange={(e) => handlePerspectiveSettingChange(perspective, 'questionCount', e.target.value)}
                        disabled={!settings.enabled}
                        className="w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || selectedDocumentIds.length === 0}
                className={`px-6 py-2 flex items-center justify-center rounded-md shadow-sm text-white font-medium ${
                  loading || selectedDocumentIds.length === 0
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } transition-colors`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate Template
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TemplateConfiguration;