// frontend/src/components/integration/EmployeeImport.jsx

import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileUp, 
  Check, 
  AlertTriangle, 
  Info, 
  HelpCircle, 
  ChevronsDown, 
  ArrowRight 
} from 'lucide-react';
import api from "../../services/api";

// Define required and optional fields for employee data
const REQUIRED_FIELDS = [
  { key: 'employeeId', label: 'Employee ID', description: 'Unique identifier for the employee' },
  { key: 'firstName', label: 'First Name', description: 'Employee\'s first name' },
  { key: 'lastName', label: 'Last Name', description: 'Employee\'s last name' },
  { key: 'email', label: 'Email Address', description: 'Employee\'s email address' }
];

const OPTIONAL_FIELDS = [
  { key: 'jobTitle', label: 'Job Title', description: 'Employee\'s job title or position' },
  { key: 'mainFunction', label: 'Main Function', description: 'Primary department or function (e.g., Finance, IT)' },
  { key: 'subFunction', label: 'Sub Function', description: 'Specialized area within the main function' },
  { key: 'levelIdentification', label: 'Level', description: 'Grade, band, or qualitative level (e.g., Director, Manager)' },
  { key: 'managerId', label: 'Manager ID', description: 'Direct manager\'s employee ID' },
  { key: 'secondLevelManagerId', label: 'Second Level Manager ID', description: 'Second level manager\'s employee ID' }
];

const EmployeeImport = () => {
  const [file, setFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [startRow, setStartRow] = useState(2); // Default to row 2 (assuming row 1 is header)
  const [updateExisting, setUpdateExisting] = useState(true);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  // Parse the selected file to preview data
  const parseFile = (file) => {
    setLoading(true);
    setError(null);

    // Simple file preview - in a real app, you'd use more robust parsing
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        
        // For CSV files
        if (file.name.endsWith('.csv')) {
          const rows = content.split('\n');
          if (rows.length > 0) {
            // Parse header row
            const headers = rows[0].split(',').map(h => h.trim());
            
            // Parse a few data rows
            const dataRows = rows.slice(1, Math.min(6, rows.length)).map(row => 
              row.split(',').map(cell => cell.trim())
            );
            
            setFileData({
              headers,
              rows: dataRows,
              type: 'csv'
            });
            
            // Auto-map columns if possible
            autoMapColumns(headers);
          }
        }
        // For Excel files - this is just a placeholder, real implementation would use xlsx.js
        else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          setFileData({
            headers: ['Preview not available for Excel files'],
            rows: [['Please proceed to mapping step']],
            type: 'excel'
          });
          setError('Excel preview is limited. Continue to column mapping to process the file.');
        } else {
          setError('Unsupported file format. Please upload a CSV or Excel file.');
        }
      } catch (err) {
        console.error('Error parsing file:', err);
        setError('Failed to parse file. Please ensure it\'s a valid CSV or Excel file.');
      } finally {
        setLoading(false);
      }
    };
    
    reader.onerror = () => {
      setError('Failed to read file. Please try again.');
      setLoading(false);
    };
    
    reader.readAsText(file);
  };

  // Auto-map columns based on header names
  const autoMapColumns = (headers) => {
    const mapping = {};
    const allFields = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];
    
    // Try to match headers to fields
    allFields.forEach(field => {
      // Look for exact matches first
      const exactMatch = headers.findIndex(h => 
        h.toLowerCase() === field.key.toLowerCase() || 
        h.toLowerCase() === field.label.toLowerCase()
      );
      
      if (exactMatch !== -1) {
        mapping[field.key] = exactMatch;
        return;
      }
      
      // Then try partial matches
      const partialMatch = headers.findIndex(h => 
        h.toLowerCase().includes(field.key.toLowerCase()) || 
        h.toLowerCase().includes(field.label.toLowerCase())
      );
      
      if (partialMatch !== -1) {
        mapping[field.key] = partialMatch;
      }
    });
    
    setColumnMapping(mapping);
  };

  // Handle column mapping change
  const handleMappingChange = (fieldKey, columnIndex) => {
    setColumnMapping({
      ...columnMapping,
      [fieldKey]: columnIndex === '' ? null : columnIndex
    });
  };

  // Handle import
  const handleImport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Convert column indices to column letters or names
      const processedMapping = {};
      Object.entries(columnMapping).forEach(([field, index]) => {
        if (index !== null && index !== undefined) {
          processedMapping[field] = fileData.type === 'csv' 
            ? index // For CSV, we use the index directly
            : String.fromCharCode(65 + parseInt(index)); // For Excel, convert to column letter (A, B, C...)
        }
      });
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('columnMapping', JSON.stringify(processedMapping));
      formData.append('startRow', startRow);
      formData.append('updateExisting', updateExisting);
      
      // Send the import request
      const response = await api.post('/employees/import', formData);
      
      setImportResult(response.data.result);
      setStep(3); // Move to results step
    } catch (err) {
      console.error('Import error:', err);
      setError(err.response?.data?.message || 'Failed to import employees');
    } finally {
      setLoading(false);
    }
  };

  // Reset the import process
  const handleReset = () => {
    setFile(null);
    setFileData(null);
    setColumnMapping({});
    setStartRow(2);
    setImportResult(null);
    setError(null);
    setStep(1);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Render step 1: File selection
  const renderFileSelection = () => (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-medium">Step 1: Select File</h2>
        <p className="text-sm text-gray-500">
          Upload a CSV or Excel file containing employee data.
        </p>
      </div>
      
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => fileInputRef.current.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept=".csv,.xlsx,.xls"
        />
        <FileUp className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Click to browse or drag & drop
        </h3>
        <p className="text-sm text-gray-500">
          Supported formats: CSV, Excel (.xlsx, .xls)
        </p>
      </div>
      
      {file && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
            ) : (
              <Check className="h-6 w-6 text-green-500" />
            )}
          </div>
          
          {fileData && (
            <div className="mt-4">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center mx-auto"
              >
                Continue to Column Mapping
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
            <p>{error}</p>
          </div>
        </div>
      )}
      
      <div className="mt-6 border-t border-gray-200 pt-4">
        <h3 className="font-medium mb-2">File Requirements</h3>
        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
          <li>The file should contain employee data in a tabular format.</li>
          <li>Required fields: Employee ID, First Name, Last Name, Email Address.</li>
          <li>Optional fields: Job Title, Function, Level, Manager IDs, etc.</li>
          <li>First row should be a header row with column names.</li>
          <li>Each subsequent row should represent one employee.</li>
        </ul>
      </div>
    </div>
  );

  // Render step 2: Column mapping
  const renderColumnMapping = () => (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-medium">Step 2: Map Columns</h2>
        <p className="text-sm text-gray-500">
          Match your file columns to the required employee data fields.
        </p>
      </div>
      
      {fileData && (
        <div className="mb-6">
          <h3 className="font-medium mb-2">File Preview</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Row
                  </th>
                  {fileData.headers.map((header, index) => (
                    <th 
                      key={index} 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header || `Column ${index + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fileData.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex === 0 ? 'bg-blue-50' : ''}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {rowIndex + 1}
                    </td>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {cell || <span className="text-gray-400">empty</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 flex items-center">
            <div className="mr-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Starts at Row
              </label>
              <input
                type="number"
                min="1"
                value={startRow}
                onChange={(e) => setStartRow(parseInt(e.target.value) || 1)}
                className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="updateExisting"
                checked={updateExisting}
                onChange={(e) => setUpdateExisting(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="updateExisting" className="ml-2 block text-sm text-gray-700">
                Update existing employees
              </label>
              <HelpCircle 
                className="h-4 w-4 ml-1 text-gray-400 cursor-help"
                title="If checked, existing employees will be updated with new data. If unchecked, duplicate employee IDs will be skipped."
              />
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-6">
        <div>
          <h3 className="font-medium mb-3 flex items-center">
            Required Fields
            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded">
              Required
            </span>
          </h3>
          {REQUIRED_FIELDS.map((field) => (
            <div key={field.key} className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              <div className="flex items-center">
                <select
                  value={columnMapping[field.key] || ''}
                  onChange={(e) => handleMappingChange(field.key, e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 w-full"
                >
                  <option value="">-- Select Column --</option>
                  {fileData && fileData.headers.map((header, index) => (
                    <option key={index} value={index}>
                      {header || `Column ${index + 1}`}
                    </option>
                  ))}
                </select>
                <HelpCircle 
                  className="h-4 w-4 ml-2 text-gray-400 cursor-help"
                  title={field.description}
                />
              </div>
            </div>
          ))}
        </div>
        
        <div>
          <h3 className="font-medium mb-3 flex items-center">
            Optional Fields
            <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-800 text-xs font-medium rounded">
              Optional
            </span>
          </h3>
          {OPTIONAL_FIELDS.map((field) => (
            <div key={field.key} className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              <div className="flex items-center">
                <select
                  value={columnMapping[field.key] || ''}
                  onChange={(e) => handleMappingChange(field.key, e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 w-full"
                >
                  <option value="">-- Not Mapped --</option>
                  {fileData && fileData.headers.map((header, index) => (
                    <option key={index} value={index}>
                      {header || `Column ${index + 1}`}
                    </option>
                  ))}
                </select>
                <HelpCircle 
                  className="h-4 w-4 ml-2 text-gray-400 cursor-help"
                  title={field.description}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
            <p>{error}</p>
          </div>
        </div>
      )}
      
      <div className="mt-6 flex justify-between">
        <button
          onClick={() => setStep(1)}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Back
        </button>
        
        <button
          onClick={handleImport}
          disabled={loading || !REQUIRED_FIELDS.every(f => columnMapping[f.key] !== undefined)}
          className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center
            ${(loading || !REQUIRED_FIELDS.every(f => columnMapping[f.key] !== undefined)) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              Import Employees
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  // Render step 3: Import results
  const renderImportResults = () => (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-medium">Step 3: Import Results</h2>
        <p className="text-sm text-gray-500">
          Review the results of your employee data import.
        </p>
      </div>
      
      {importResult && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium text-green-800 flex items-center mb-2">
              <Check className="h-5 w-5 mr-2" />
              Import Complete
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-white rounded-lg border border-green-100 p-4 text-center">
                <p className="text-sm text-gray-500">Total Records</p>
                <p className="text-2xl font-bold">{importResult.total}</p>
              </div>
              <div className="bg-white rounded-lg border border-green-100 p-4 text-center">
                <p className="text-sm text-gray-500">New Employees</p>
                <p className="text-2xl font-bold text-green-600">{importResult.inserted}</p>
              </div>
              <div className="bg-white rounded-lg border border-green-100 p-4 text-center">
                <p className="text-sm text-gray-500">Updated Employees</p>
                <p className="text-2xl font-bold text-blue-600">{importResult.updated}</p>
              </div>
            </div>
          </div>
          
          {importResult.duplicates && importResult.duplicates.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-800 flex items-center mb-2">
                <Info className="h-5 w-5 mr-2" />
                Duplicate Records ({importResult.duplicates.length})
              </h3>
              
              <div className="mt-2 max-h-40 overflow-y-auto">
                <table className="min-w-full divide-y divide-yellow-200">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-yellow-800 uppercase">Row</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-yellow-800 uppercase">Employee ID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-yellow-800 uppercase">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.duplicates.map((dupe, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-yellow-50' : 'bg-white'}>
                        <td className="px-3 py-2 text-sm">{dupe.row}</td>
                        <td className="px-3 py-2 text-sm">{dupe.employeeId}</td>
                        <td className="px-3 py-2 text-sm">{dupe.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-medium text-red-800 flex items-center mb-2">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Errors ({importResult.errors.length})
              </h3>
              
              <div className="mt-2 max-h-40 overflow-y-auto">
                <table className="min-w-full divide-y divide-red-200">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-red-800 uppercase">Row</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-red-800 uppercase">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importResult.errors.map((error, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-red-50' : 'bg-white'}>
                        <td className="px-3 py-2 text-sm">{error.row}</td>
                        <td className="px-3 py-2 text-sm">{error.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-6 flex justify-between">
        <button
          onClick={handleReset}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Start New Import
        </button>
        
        <button
          onClick={() => window.location.href = '/integration?tab=1'}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Employee Management
        </button>
      </div>
    </div>
  );

  // Render the current step
  const renderStep = () => {
    switch (step) {
      case 1:
        return renderFileSelection();
      case 2:
        return renderColumnMapping();
      case 3:
        return renderImportResults();
      default:
        return renderFileSelection();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Step indicators */}
      <div className="flex items-center mb-6">
        <div className={`flex items-center relative ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`rounded-full h-8 w-8 flex items-center justify-center border-2 ${
            step >= 1 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
          }`}>
            1
          </div>
          <div className="absolute top-10 -left-6 w-20 text-xs text-center">
            Select File
          </div>
        </div>
        
        <div className={`flex-1 h-0.5 mx-2 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
        
        <div className={`flex items-center relative ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`rounded-full h-8 w-8 flex items-center justify-center border-2 ${
            step >= 2 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
          }`}>
            2
          </div>
          <div className="absolute top-10 -left-8 w-24 text-xs text-center">
            Map Columns
          </div>
        </div>
        
        <div className={`flex-1 h-0.5 mx-2 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
        
        <div className={`flex items-center relative ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`rounded-full h-8 w-8 flex items-center justify-center border-2 ${
            step >= 3 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
          }`}>
            3
          </div>
          <div className="absolute top-10 -left-6 w-20 text-xs text-center">
            Results
          </div>
        </div>
      </div>
      
      {renderStep()}
    </div>
  );
};

export default EmployeeImport;