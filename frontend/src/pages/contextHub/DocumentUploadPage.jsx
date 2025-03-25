import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from 'react-query'
import { toast } from 'react-toastify'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import {
  CloudArrowUpIcon,
  XCircleIcon,
  PaperClipIcon,
  DocumentIcon
} from '@heroicons/react/24/outline'
import documentService from '../../services/documentService'
import TagInput from '../../components/common/TagInput'
import LoadingSpinner from '../../components/common/LoadingSpinner'

// Validation schema
const validationSchema = Yup.object({
  title: Yup.string().required('Title is required'),
  description: Yup.string(),
  tags: Yup.array().of(Yup.string())
})

export default function DocumentUploadPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  
  // Fetch all existing tags
  const { data: existingTags } = useQuery(
    'document-tags',
    () => documentService.getAllTags(),
    { staleTime: 300000 } // 5 minutes
  )
  
  // Upload document mutation
  const uploadMutation = useMutation(
    (values) => documentService.uploadDocument(
      selectedFile,
      values.title,
      values.description,
      values.tags
    ),
    {
      onSuccess: () => {
        toast.success('Document uploaded successfully')
        navigate('/documents')
      },
      onError: (error) => {
        console.error('Error uploading document:', error)
        toast.error('Failed to upload document')
      }
    }
  )
  
  // Formik setup
  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      tags: []
    },
    validationSchema,
    onSubmit: (values) => {
      if (!selectedFile) {
        toast.error('Please select a file to upload')
        return
      }
      
      uploadMutation.mutate(values)
    }
  })
  
  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleSelectedFile(file)
    }
  }
  
  // Handle file drop
  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectedFile(e.dataTransfer.files[0])
    }
  }
  
  // Process selected file
  const handleSelectedFile = (file) => {
    setSelectedFile(file)
    
    // Auto-fill title if empty
    if (!formik.values.title) {
      // Remove extension from filename
      const filename = file.name.replace(/\.[^/.]+$/, '')
      // Convert to title case
      const titleCase = filename
        .replace(/-|_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
      
      formik.setFieldValue('title', titleCase)
    }
  }
  
  // Remove selected file
  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  // Get file size in human-readable format
  const getFileSize = (size) => {
    if (size < 1024) {
      return `${size} bytes`
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(2)} KB`
    } else {
      return `${(size / (1024 * 1024)).toFixed(2)} MB`
    }
  }
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <div className="px-4 sm:px-0">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Upload Document</h3>
            <p className="mt-1 text-sm text-gray-600">
              Upload documents to provide context for feedback templates and cycles.
              Supported formats include PDF, Word, Excel, and CSV.
            </p>
          </div>
        </div>
        
        <div className="mt-5 md:mt-0 md:col-span-2">
          <form onSubmit={formik.handleSubmit}>
            <div className="shadow sm:rounded-md sm:overflow-hidden">
              <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                {/* File upload area */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Document File</label>
                  <div 
                    className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${
                      dragActive ? 'border-primary-300 bg-primary-50' : 'border-gray-300'
                    }`}
                    onDragEnter={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setDragActive(true)
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setDragActive(false)
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onDrop={handleDrop}
                  >
                    {selectedFile ? (
                      <div className="space-y-1 text-center">
                        <div className="flex items-center justify-center">
                          <DocumentIcon className="h-12 w-12 text-gray-400" />
                        </div>
                        <div className="flex flex-col items-center text-sm text-gray-600">
                          <span className="font-medium">{selectedFile.name}</span>
                          <span>{getFileSize(selectedFile.size)}</span>
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="mt-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <XCircleIcon className="h-4 w-4 mr-1" />
                            Remove File
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 text-center">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                          aria-hidden="true"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                          >
                            <span>Upload a file</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              className="sr-only"
                              ref={fileInputRef}
                              onChange={handleFileChange}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          PDF, Word, Excel, CSV, Text, and other document formats
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Document details */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="title"
                      name="title"
                      className={`form-input ${
                        formik.touched.title && formik.errors.title
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : ''
                      }`}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.title}
                    />
                    {formik.touched.title && formik.errors.title && (
                      <p className="mt-2 text-sm text-red-600">{formik.errors.title}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="description"
                      name="description"
                      rows={4}
                      className="form-input"
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.description}
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Brief description of the document.
                  </p>
                </div>
                
                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                    Tags
                  </label>
                  <div className="mt-1">
                    <TagInput
                      value={formik.values.tags}
                      onChange={value => formik.setFieldValue('tags', value)}
                      suggestions={existingTags || []}
                      placeholder="Add tags..."
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Add tags to help categorize and find this document later.
                  </p>
                </div>
              </div>
              
              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                <button
                  type="button"
                  className="btn-secondary mr-2"
                  onClick={() => navigate('/documents')}
                  disabled={uploadMutation.isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={uploadMutation.isLoading}
                >
                  {uploadMutation.isLoading ? (
                    <>
                      <LoadingSpinner size="sm" center={false} />
                      <span className="ml-2">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <CloudArrowUpIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}