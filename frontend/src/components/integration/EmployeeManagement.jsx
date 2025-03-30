// frontend/src/components/integration/EmployeeManagement.jsx

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Trash2, 
  Edit, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  Check, 
  X,
  Plus,
  Trash
} from 'lucide-react';
import api from "../../services/api";

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState('lastName');
  const [sortDirection, setSortDirection] = useState('asc');
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purgeConfirmation, setPurgeConfirmation] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showNewEmployee, setShowNewEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    jobTitle: '',
    mainFunction: '',
    subFunction: '',
    levelIdentification: '',
    managerId: '',
    secondLevelManagerId: ''
  });

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/employees', {
        params: {
          page,
          limit: 10,
          search: searchTerm,
          sortField,
          sortDirection
        }
      });
      
      setEmployees(response.data.employees || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Failed to load employees. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchEmployees();
  }, [page, sortField, sortDirection]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle sort change
  const handleSort = (field) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1);
  };

  // Handle edit employee
  const handleEditClick = (employee) => {
    setEditingEmployee({ ...employee });
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      
      await api.put(`/employees/${editingEmployee.id}`, editingEmployee);
      
      setSuccessMessage('Employee updated successfully');
      setEditingEmployee(null);
      fetchEmployees();
    } catch (err) {
      console.error('Error updating employee:', err);
      setError('Failed to update employee. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete employee
  const handleDeleteClick = (employeeId) => {
    setDeleteEmployeeId(employeeId);
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      
      await api.delete(`/employees/${deleteEmployeeId}`);
      
      setSuccessMessage('Employee deleted successfully');
      setDeleteEmployeeId(null);
      fetchEmployees();
    } catch (err) {
      console.error('Error deleting employee:', err);
      setError('Failed to delete employee. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle purge all employees
  const handlePurgeConfirm = async () => {
    if (purgeConfirmation !== 'CONFIRM_PURGE') {
      setError('You must type CONFIRM_PURGE to proceed with purging all employees.');
      return;
    }
    
    try {
      setLoading(true);
      
      await api.delete('/employees', {
        data: { confirmation: 'CONFIRM_PURGE' }
      });
      
      setSuccessMessage('All employees have been purged from the database');
      setShowPurgeConfirm(false);
      setPurgeConfirmation('');
      fetchEmployees();
    } catch (err) {
      console.error('Error purging employees:', err);
      setError('Failed to purge employees. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle create new employee
  const handleCreateEmployee = async () => {
    // Basic validation
    if (!newEmployee.employeeId || !newEmployee.firstName || !newEmployee.lastName || !newEmployee.email) {
      setError('Please fill in all required fields (Employee ID, First Name, Last Name, Email)');
      return;
    }
    
    try {
      setLoading(true);
      
      await api.post('/employees', newEmployee);
      
      setSuccessMessage('Employee created successfully');
      setShowNewEmployee(false);
      setNewEmployee({
        employeeId: '',
        firstName: '',
        lastName: '',
        email: '',
        jobTitle: '',
        mainFunction: '',
        subFunction: '',
        levelIdentification: '',
        managerId: '',
        secondLevelManagerId: ''
      });
      fetchEmployees();
    } catch (err) {
      console.error('Error creating employee:', err);
      setError('Failed to create employee. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render employee details
  const renderEmployeeDetails = () => (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Employee Details</h3>
        <button 
          onClick={() => setSelectedEmployee(null)}
          className="text-gray-400 hover:text-gray-500"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Employee ID</p>
          <p className="font-medium">{selectedEmployee.employeeId}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Full Name</p>
          <p className="font-medium">{selectedEmployee.firstName} {selectedEmployee.lastName}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Email</p>
          <p className="font-medium">{selectedEmployee.email}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Job Title</p>
          <p className="font-medium">{selectedEmployee.jobTitle || 'Not specified'}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Main Function</p>
          <p className="font-medium">{selectedEmployee.mainFunction || 'Not specified'}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Sub Function</p>
          <p className="font-medium">{selectedEmployee.subFunction || 'Not specified'}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Level</p>
          <p className="font-medium">{selectedEmployee.levelIdentification || 'Not specified'}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Manager ID</p>
          <p className="font-medium">{selectedEmployee.managerId || 'Not specified'}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Second Level Manager ID</p>
          <p className="font-medium">{selectedEmployee.secondLevelManagerId || 'Not specified'}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Status</p>
          <p className="font-medium">{selectedEmployee.status || 'active'}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Imported At</p>
          <p className="font-medium">{new Date(selectedEmployee.importedAt).toLocaleString()}</p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500">Last Updated</p>
          <p className="font-medium">{new Date(selectedEmployee.lastUpdatedAt || selectedEmployee.updatedAt).toLocaleString()}</p>
        </div>
      </div>
      
      <div className="mt-6 flex justify-end space-x-3">
        <button
          onClick={() => handleEditClick(selectedEmployee)}
          className="px-3 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 flex items-center text-sm"
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </button>
        
        <button
          onClick={() => handleDeleteClick(selectedEmployee.id)}
          className="px-3 py-1.5 border border-red-300 rounded text-red-700 hover:bg-red-50 flex items-center text-sm"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        {/* Search and filters */}
        <div className="relative w-full md:w-80 mb-4 md:mb-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowNewEmployee(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Employee
          </button>
          
          <button
            onClick={() => setShowPurgeConfirm(true)}
            className="px-4 py-2 border border-red-300 text-red-700 rounded hover:bg-red-50 flex items-center"
          >
            <Trash className="h-4 w-4 mr-1" />
            Purge All
          </button>
        </div>
      </div>
      
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md flex justify-between items-center">
          <div className="flex">
            <Check className="h-5 w-5 mr-2 flex-shrink-0" />
            <p>{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-700 hover:text-green-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex justify-between items-center">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
            <p>{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      
      {/* Main content */}
      <div className="flex">
        {/* Employee table */}
        <div className={`bg-white rounded-lg shadow ${selectedEmployee ? 'w-2/3 mr-4' : 'w-full'}`}>
          {loading && employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600">Loading employees...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Employees Found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'No employees match your search criteria.' : 'Your employee database is empty.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => window.location.href = '/integration'}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Import Employees
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('employeeId')}
                      >
                        <div className="flex items-center">
                          Employee ID
                          {sortField === 'employeeId' && (
                            <span className="ml-1">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('lastName')}
                      >
                        <div className="flex items-center">
                          Name
                          {sortField === 'lastName' && (
                            <span className="ml-1">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('email')}
                      >
                        <div className="flex items-center">
                          Email
                          {sortField === 'email' && (
                            <span className="ml-1">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('jobTitle')}
                      >
                        <div className="flex items-center">
                          Job Title
                          {sortField === 'jobTitle' && (
                            <span className="ml-1">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employees.map((employee) => (
                      <tr 
                        key={employee.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedEmployee(employee)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {employee.employeeId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.firstName} {employee.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {employee.jobTitle || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(employee);
                            }}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(employee.id);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">Page {page}</span> of <span className="font-medium">{totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setPage(Math.max(page - 1, 1))}
                        disabled={page <= 1}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                          page <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Previous</span>
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setPage(Math.min(page + 1, totalPages))}
                        disabled={page >= totalPages}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                          page >= totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Next</span>
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Employee details panel */}
        {selectedEmployee && (
          <div className="w-1/3">
            {renderEmployeeDetails()}
          </div>
        )}
      </div>
      
      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setEditingEmployee(null)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Employee</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        value={editingEmployee.firstName}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, firstName: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        value={editingEmployee.lastName}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, lastName: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">
                      Employee ID *
                    </label>
                    <input
                      type="text"
                      id="employeeId"
                      value={editingEmployee.employeeId}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, employeeId: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={editingEmployee.email}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      id="jobTitle"
                      value={editingEmployee.jobTitle || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, jobTitle: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="mainFunction" className="block text-sm font-medium text-gray-700 mb-1">
                        Main Function
                      </label>
                      <input
                        type="text"
                        id="mainFunction"
                        value={editingEmployee.mainFunction || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, mainFunction: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="subFunction" className="block text-sm font-medium text-gray-700 mb-1">
                        Sub Function
                      </label>
                      <input
                        type="text"
                        id="subFunction"
                        value={editingEmployee.subFunction || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, subFunction: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="levelIdentification" className="block text-sm font-medium text-gray-700 mb-1">
                      Level Identification
                    </label>
                    <input
                      type="text"
                      id="levelIdentification"
                      value={editingEmployee.levelIdentification || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, levelIdentification: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="managerId" className="block text-sm font-medium text-gray-700 mb-1">
                        Manager ID
                      </label>
                      <input
                        type="text"
                        id="managerId"
                        value={editingEmployee.managerId || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, managerId: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="secondLevelManagerId" className="block text-sm font-medium text-gray-700 mb-1">
                        Second Level Manager ID
                      </label>
                      <input
                        type="text"
                        id="secondLevelManagerId"
                        value={editingEmployee.secondLevelManagerId || ''}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, secondLevelManagerId: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      id="status"
                      value={editingEmployee.status || 'active'}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, status: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* New Employee Modal */}
      {showNewEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowNewEmployee(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Employee</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        value={newEmployee.firstName}
                        onChange={(e) => setNewEmployee({ ...newEmployee, firstName: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        value={newEmployee.lastName}
                        onChange={(e) => setNewEmployee({ ...newEmployee, lastName: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">
                      Employee ID *
                    </label>
                    <input
                      type="text"
                      id="employeeId"
                      value={newEmployee.employeeId}
                      onChange={(e) => setNewEmployee({ ...newEmployee, employeeId: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      id="jobTitle"
                      value={newEmployee.jobTitle}
                      onChange={(e) => setNewEmployee({ ...newEmployee, jobTitle: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="mainFunction" className="block text-sm font-medium text-gray-700 mb-1">
                        Main Function
                      </label>
                      <input
                        type="text"
                        id="mainFunction"
                        value={newEmployee.mainFunction}
                        onChange={(e) => setNewEmployee({ ...newEmployee, mainFunction: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="subFunction" className="block text-sm font-medium text-gray-700 mb-1">
                        Sub Function
                      </label>
                      <input
                        type="text"
                        id="subFunction"
                        value={newEmployee.subFunction}
                        onChange={(e) => setNewEmployee({ ...newEmployee, subFunction: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="levelIdentification" className="block text-sm font-medium text-gray-700 mb-1">
                      Level Identification
                    </label>
                    <input
                      type="text"
                      id="levelIdentification"
                      value={newEmployee.levelIdentification}
                      onChange={(e) => setNewEmployee({ ...newEmployee, levelIdentification: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="managerId" className="block text-sm font-medium text-gray-700 mb-1">
                        Manager ID
                      </label>
                      <input
                        type="text"
                        id="managerId"
                        value={newEmployee.managerId}
                        onChange={(e) => setNewEmployee({ ...newEmployee, managerId: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="secondLevelManagerId" className="block text-sm font-medium text-gray-700 mb-1">
                        Second Level Manager ID
                      </label>
                      <input
                        type="text"
                        id="secondLevelManagerId"
                        value={newEmployee.secondLevelManagerId}
                        onChange={(e) => setNewEmployee({ ...newEmployee, secondLevelManagerId: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleCreateEmployee}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Create Employee
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewEmployee(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {deleteEmployeeId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setDeleteEmployeeId(null)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Employee</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete this employee? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteEmployeeId(null)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Purge Confirmation Modal */}
      {showPurgeConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowPurgeConfirm(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Purge All Employees</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        This will permanently delete ALL employees from the database. This action cannot be undone.
                      </p>
                      <div className="mt-4">
                        <label htmlFor="purgeConfirmation" className="block text-sm font-medium text-gray-700 mb-1">
                          Type CONFIRM_PURGE to proceed:
                        </label>
                        <input
                          type="text"
                          id="purgeConfirmation"
                          value={purgeConfirmation}
                          onChange={(e) => setPurgeConfirmation(e.target.value)}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handlePurgeConfirm}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm ${
                    purgeConfirmation !== 'CONFIRM_PURGE' ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={purgeConfirmation !== 'CONFIRM_PURGE'}
                >
                  Purge All Employees
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPurgeConfirm(false);
                    setPurgeConfirmation('');
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;