// frontend/src/components/campaigns/wizard/TargetSelection.jsx

import React, { useState, useEffect } from 'react';
import { Search, Check, AlertTriangle, User } from 'lucide-react';
import api from '../../../services/api';

const TargetSelection = ({ data, onDataChange, onNext }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(data.targetEmployeeId || '');
  const [campaignName, setCampaignName] = useState(data.name || '');
  const [campaignDescription, setCampaignDescription] = useState(data.description || '');

  useEffect(() => {
    fetchEmployees();
  }, []);

   // Update parent data when local state changes
  useEffect(() => {
    const employee = employees.find(e => e.id === selectedEmployee);
    onDataChange({
      targetEmployeeId: selectedEmployee,
      targetEmployeeDetails: employee,
      name: campaignName,
      description: campaignDescription
    });
  }, [selectedEmployee, campaignName, campaignDescription, employees, onDataChange]);


  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.get('/employees');

      // Filter to active employees only
      const activeEmployees = response.data.employees
        ? response.data.employees.filter(e => e.status !== 'inactive')
        : [];

      setEmployees(activeEmployees);
      setError(null);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Failed to load employees. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    setSelectedEmployee(employeeId);

    // Find the employee details
    const employee = employees.find(e => e.id === employeeId);

    // If no campaign name set yet, suggest one based on employee name
    if (!campaignName && employee) {
      setCampaignName(`${employee.firstName} ${employee.lastName} - 360 Feedback`);
      // No need to call onDataChange here, useEffect handles it
    } else {
       // Still need to update parent if name doesn't change but selection does
       onDataChange({ targetEmployeeId: employeeId, targetEmployeeDetails: employee });
    }
  };

  // Removed handleNextClick function as the button is removed.

  // Filter employees based on search term
  const filteredEmployees = employees.filter(employee =>
    `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.jobTitle && employee.jobTitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (employee.department && employee.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading employees...</p>
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
          onClick={fetchEmployees}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Select Target Employee</h2>
        <p className="text-gray-600">
          Choose the employee who will receive the 360-degree feedback.
        </p>
      </div>

      {/* Campaign basic info */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="font-medium text-gray-900 mb-3">Campaign Information</h3>

        <div className="mb-4">
          <label htmlFor="campaignName" className="block text-sm font-medium text-gray-700 mb-1">
            Campaign Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="campaignName"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)} // useEffect handles onDataChange
            required
          />
        </div>

        <div>
          <label htmlFor="campaignDescription" className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            id="campaignDescription"
            rows="3"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={campaignDescription}
            onChange={(e) => setCampaignDescription(e.target.value)} // useEffect handles onDataChange
            placeholder="Brief description of this feedback campaign's purpose"
          />
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {employees.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <User size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Employees Available</h3>
          <p className="text-gray-500 mb-4">
            You need to add employees before starting a campaign.
          </p>
          <a
            href="/integration?section=employee-management"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Go to Employee Management
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-h-96 overflow-y-auto">
          {filteredEmployees.map((employee) => (
            <div
              key={employee.id}
              className={`border rounded-lg cursor-pointer transition-all ${
                selectedEmployee === employee.id
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
              onClick={() => handleEmployeeSelect(employee.id)}
            >
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {employee.firstName} {employee.lastName}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {employee.email}
                    </p>
                  </div>
                  {selectedEmployee === employee.id && (
                    <div className="bg-blue-500 text-white p-1 rounded-full">
                      <Check size={16} />
                    </div>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  {employee.jobTitle || 'No job title'}
                </p>
                {employee.mainFunction && (
                  <p className="text-xs text-gray-500">
                    {employee.mainFunction} {employee.subFunction ? `• ${employee.subFunction}` : ''}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {employees.length > 0 && filteredEmployees.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <AlertTriangle size={32} className="mx-auto text-gray-400 mb-2" />
          <p className="text-gray-600">No employees match your search. Try different keywords.</p>
        </div>
      )}

      {/* The redundant button block that was here has been removed */}

    </div>
  );
};

export default TargetSelection;