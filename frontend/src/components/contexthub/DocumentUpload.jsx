import React, { useState } from 'react';
import api from "../../services/api";
import { CloudUpload, Check, X } from 'lucide-react';

const DocumentUpload = ({ onDocumentUploaded }) => {
  const [files, setFiles] = useState([]);
  const [documentType, setDocumentType] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  const handleFileChange = (event) => {
    setFiles(Array.from(event.target.files));
  };

  const handleDocumentTypeChange = (event) => {
    setDocumentType(event.target.value);
  };

  const handleUpload = async () => {
    if (files.length === 0 || !documentType) {
      setUploadStatus({
        success: false,
        message: 'Please select files and document type'
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('documentType', documentType);

    try {
      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadStatus({
        success: true,
        message: `Successfully uploaded ${files.length} document(s). Documents are ready for template creation.`,
        data: response.data
      });
      
      // Reset form after successful upload
      setFiles([]);
      setDocumentType('');
      
      // Call the callback function to notify parent component
      if (onDocumentUploaded) {
        onDocumentUploaded();
      }
      
    } catch (error) {
      console.error('Error uploading documents:', error);
      
      // Extract detailed error message if available
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Error uploading documents';
      
      setUploadStatus({
        success: false,
        message: errorMessage
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle drag and drop
  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      setFiles(Array.from(event.dataTransfer.files));
    }
  };

  // Handle closing the alert
  const handleAlertClose = () => {
    setUploadStatus(null);
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="documentType">
            Document Type <span className="text-red-500">*</span>
          </label>
          <select
            id="documentType"
            value={documentType}
            onChange={handleDocumentTypeChange}
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
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => document.getElementById('file-input').click()}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              id="file-input"
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
            />
            <CloudUpload className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drag and drop files here or click to browse
            </h3>
            <p className="text-sm text-gray-500">
              Supported formats: PDF, Word, Text (max 10MB per file)
            </p>
            
            {files.length > 0 && (
              <div className="mt-4 text-left">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Selected files ({files.length}):
                </p>
                <ul className="pl-5 list-disc text-sm text-gray-600">
                  {files.map((file, index) => (
                    <li key={index} className="mb-0.5">
                      {file.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        <div>
          <button
            onClick={handleUpload}
            disabled={isUploading || files.length === 0 || !documentType}
            className={`w-full py-2 px-4 flex items-center justify-center rounded-md shadow-sm text-white font-medium ${
              isUploading || files.length === 0 || !documentType
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } transition-colors`}
          >
            {isUploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <CloudUpload className="h-5 w-5 mr-2" />
                Upload Documents
              </>
            )}
          </button>
        </div>
        
        {uploadStatus && (
          <div className={`rounded-md p-4 ${
            uploadStatus.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {uploadStatus.success ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : (
                  <X className="h-5 w-5 text-red-500" />
                )}
              </div>
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${
                  uploadStatus.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {uploadStatus.message}
                </h3>
                
                {!uploadStatus.success && (
                  <div className="mt-2 text-sm text-red-700">
                    <p>Note: In development mode, the system will generate mock questions without using the Flux AI API.</p>
                  </div>
                )}
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={handleAlertClose}
                    className={`inline-flex rounded-md p-1.5 ${
                      uploadStatus.success 
                        ? 'text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500'
                        : 'text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500'
                    }`}
                  >
                    <span className="sr-only">Dismiss</span>
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUpload;