// frontend/src/components/campaigns/wizard/AssessorSelection.jsx

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Check, AlertTriangle, RefreshCw, Search } from 'lucide-react';
import api from '../../../services/api';

const AssessorSelection = ({ data, onDataChange, onNext, onPrev, showValidationErrors = false }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState(data.participants || []);
  const [suggestedAssessors, setSuggestedAssessors] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Define relationship colors
  const relationshipColors = {
    'self': 'bg-purple-100 text-purple-800',
    'manager': 'bg-blue-100 text-blue-800',
    'peer': 'bg-green-100 text-green-800',
    'direct_report': 'bg-amber-100 text-amber-800',
    'external': 'bg-gray-100 text-gray-800'
  };

   // Update parent component whenever selected participants change
  useEffect(() => {
    onDataChange({ participants: selectedParticipants });
    validateSelection(); // Re-validate when participants change
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParticipants, onDataChange]);


  // Group participants by relationship type
  const getParticipantsByType = () => {
    const grouped = {
      self: selectedParticipants.filter(p => p.relationshipType === 'self'),
      manager: selectedParticipants.filter(p => p.relationshipType === 'manager'),
      peer: selectedParticipants.filter(p => p.relationshipType === 'peer'),
      direct_report: selectedParticipants.filter(p => p.relationshipType === 'direct_report'),
      external: selectedParticipants.filter(p => p.relationshipType === 'external')
    };

    return grouped;
  };

  // Generate counts for each relationship type
  const getCounts = () => {
    const grouped = getParticipantsByType();

    return {
      self: {
        current: grouped.self.length,
        required: 1,
        complete: grouped.self.length >= 1
      },
      manager: {
        current: grouped.manager.length,
        required: 1,
        complete: grouped.manager.length >= 1
      },
      peer: {
        current: grouped.peer.length,
        required: 3,
        complete: grouped.peer.length >= 3
      },
      direct_report: {
        current: grouped.direct_report.length,
        required: 0,
        complete: true
      },
      external: {
        current: grouped.external.length,
        required: 0,
        complete: true
      }
    };
  };

  // Validate selection
  const validateSelection = () => {
    const counts = getCounts();
    const errors = {};

    if (!counts.self.complete) {
      errors.self = 'Self-assessment is required';
    }

    if (!counts.manager.complete) {
      errors.manager = 'At least one manager is required';
    }

    if (!counts.peer.complete) {
      errors.peer = 'At least three peers are required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Fetch employees on component mount
  useEffect(() => {
    fetchEmployees();

    // If target employee and template are selected, get AI suggestions
    if (data.targetEmployeeId && data.templateId) {
      getSuggestedAssessors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.targetEmployeeId, data.templateId]);

  // Initialize selected participants from data
  useEffect(() => {
    if (data.participants) {
      setSelectedParticipants(data.participants);
    }
  }, [data.participants]);


  useEffect(() => {
    // If target employee data exists but isn't in the self-assessment list yet, add them automatically
    if (data.targetEmployeeId && data.targetEmployeeDetails) {
      const hasSelfAssessment = selectedParticipants.some(
        p => p.relationshipType === 'self'
      );

      if (!hasSelfAssessment) {
        // Add target employee as self-assessor automatically
        const targetAsSelf = {
          employeeId: data.targetEmployeeId,
          relationshipType: 'self',
          employee: {
            id: data.targetEmployeeId,
            firstName: data.targetEmployeeDetails.firstName,
            lastName: data.targetEmployeeDetails.lastName,
            email: data.targetEmployeeDetails.email,
            jobTitle: data.targetEmployeeDetails.jobTitle || ''
          }
        };

        setSelectedParticipants(prev => [...prev, targetAsSelf]);
        // No need to call onDataChange here, the other useEffect handles it
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.targetEmployeeId, data.targetEmployeeDetails]);

  // Fetch employees
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

  // Get suggested assessors from AI
  const getSuggestedAssessors = async () => {
    try {
      setLoadingSuggestions(true);
      const response = await api.post('/campaigns/suggest-assessors', {
        templateId: data.templateId,
        employeeId: data.targetEmployeeId
      });

      setSuggestedAssessors(response.data);
    } catch (err) {
      console.error('Error getting suggested assessors:', err);
      // Don't show an error message, just disable suggestions
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Add a participant
  const addParticipant = (employee, relationshipType) => {
    // Prevent target employee from being added as anything other than Self
    if (employee.id === data.targetEmployeeId && relationshipType !== 'self') {
      return; // Do nothing if trying to add target as manager/peer etc.
    }

    // Check if participant already exists
    const existingIndex = selectedParticipants.findIndex(
      p => p.employeeId === employee.id && p.relationshipType === relationshipType
    );

    const exists = existingIndex !== -1;

    // If exists, REMOVE instead of ignoring
    if (exists) {
      const updatedParticipants = selectedParticipants.filter((_, index) => index !== existingIndex);
      setSelectedParticipants(updatedParticipants);
      // useEffect handles onDataChange
      return;
    }

    // For self, only allow one and replace existing if target employee is being added
    if (relationshipType === 'self') {
      // Remove existing self if any
      const newParticipants = selectedParticipants.filter(
        p => p.relationshipType !== 'self'
      );

      const newParticipant = {
        employeeId: employee.id,
        relationshipType,
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          jobTitle: employee.jobTitle || ''
        }
      };

      const updatedParticipants = [...newParticipants, newParticipant];
      setSelectedParticipants(updatedParticipants);
       // useEffect handles onDataChange
      return;
    }

    // For other relationship types, add to the list
    const newParticipant = {
      employeeId: employee.id,
      relationshipType,
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        jobTitle: employee.jobTitle || ''
      }
    };

    setSelectedParticipants(prev => [...prev, newParticipant]);
    // useEffect handles onDataChange
  };


  // Remove a participant
  const removeParticipant = (participantIndex) => {
    const updatedParticipants = selectedParticipants.filter((_, index) => index !== participantIndex);
    setSelectedParticipants(updatedParticipants);
    // useEffect handles onDataChange
  };

  // Removed handleNextClick function as the button is removed.

  // Calculate progress
  const isSelectionComplete = () => {
    const counts = getCounts();
    return counts.self.complete && counts.manager.complete && counts.peer.complete;
  };

  // Filter employees based on search term
  const filteredEmployees = employees.filter(employee =>
    `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.jobTitle && employee.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Format relationship type for display
  const formatRelationshipType = (type) => {
    const formats = {
      'self': 'Self',
      'manager': 'Manager',
      'peer': 'Peer',
      'direct_report': 'Direct Report',
      'external': 'External'
    };
    return formats[type] || type;
  };

  // Render assessor card for selection
  const renderAssessorCard = (employee, relationshipType, isSelected, confidence = null) => {
    // Prevent target employee from being added as anything other than Self
    const isTargetEmployee = employee.id === data.targetEmployeeId;
    const isDisabled = isTargetEmployee && relationshipType !== 'self';

    return (
      <div
        className={`border rounded-lg p-4 ${
          isSelected ? 'border-blue-500 bg-blue-50' :
          isDisabled ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed' :
          'border-gray-200 hover:border-blue-300'
        } transition-all`}
        onClick={() => isDisabled ? null : addParticipant(employee, relationshipType)}
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-gray-900">
              {employee.firstName} {employee.lastName}
              {isTargetEmployee && <span className="ml-2 text-xs text-blue-600">(Target Employee)</span>}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {employee.email}
            </p>
          </div>
          {isSelected && (
            <div className="bg-blue-500 text-white p-1 rounded-full">
              <Check size={16} />
            </div>
          )}
        </div>
        {/* Rest of the card content... */}
        {employee.jobTitle && (
         <p className="text-xs text-gray-600 mt-1">{employee.jobTitle}</p>
        )}
        {confidence && (
          <div className="mt-2 text-xs text-gray-500">
            Confidence: {Math.round(confidence * 100)}%
          </div>
        )}
      </div>
    );
  };

  // Render participant list
  const renderParticipantList = () => {
    const grouped = getParticipantsByType();
    const counts = getCounts();

    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">Selected Assessors</h3>

        {/* Self */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${relationshipColors.self} mr-2`}>
                Self
              </span>
              <span className="text-sm">
                {counts.self.current}/{counts.self.required}
              </span>
            </div>
            {validationErrors.self && showValidationErrors && (
              <span className="text-xs text-red-600">{validationErrors.self}</span>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            {grouped.self.length > 0 ? (
              grouped.self.map((participant, index) => (
                <div key={index} className="flex justify-between items-center mb-2 last:mb-0">
                  <div>
                    <span className="text-sm font-medium">
                       {participant.employee.firstName} {participant.employee.lastName}
                    </span>
                    <span className="text-xs text-gray-500 block">
                      {participant.employee.email}
                    </span>
                  </div>
                  <button
                    className="text-red-600 hover:text-red-800 transition-colors text-xs"
                    onClick={() => removeParticipant(selectedParticipants.findIndex(p =>
                      p.employeeId === participant.employeeId && p.relationshipType === 'self'
                    ))}
                    // Disable remove if it's the target employee
                    disabled={participant.employeeId === data.targetEmployeeId}
                  >
                    {participant.employeeId === data.targetEmployeeId ? '(Required)' : 'Remove'}
                  </button>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 italic">No self-assessment selected</div>
            )}
          </div>
        </div>

        {/* Manager */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${relationshipColors.manager} mr-2`}>
                Manager
              </span>
              <span className="text-sm">
                {counts.manager.current}/{counts.manager.required}
              </span>
            </div>
            {validationErrors.manager && showValidationErrors && (
              <span className="text-xs text-red-600">{validationErrors.manager}</span>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            {grouped.manager.length > 0 ? (
              grouped.manager.map((participant, index) => (
                <div key={index} className="flex justify-between items-center mb-2 last:mb-0">
                  <div>
                    <span className="text-sm font-medium">
                      {participant.employee.firstName} {participant.employee.lastName}
                    </span>
                    <span className="text-xs text-gray-500 block">
                      {participant.employee.email}
                    </span>
                  </div>
                  <button
                    className="text-red-600 hover:text-red-800 transition-colors text-xs"
                    onClick={() => removeParticipant(selectedParticipants.findIndex(p =>
                      p.employeeId === participant.employeeId && p.relationshipType === 'manager'
                    ))}
                  >
                    Remove
                  </button>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 italic">No managers selected</div>
            )}
          </div>
        </div>

        {/* Peers */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${relationshipColors.peer} mr-2`}>
                Peers
              </span>
              <span className="text-sm">
                {counts.peer.current}/{counts.peer.required}
              </span>
            </div>
            {validationErrors.peer && showValidationErrors && (
              <span className="text-xs text-red-600">{validationErrors.peer}</span>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            {grouped.peer.length > 0 ? (
              grouped.peer.map((participant, index) => (
                <div key={index} className="flex justify-between items-center mb-2 last:mb-0">
                  <div>
                    <span className="text-sm font-medium">
                      {participant.employee.firstName} {participant.employee.lastName}
                    </span>
                    <span className="text-xs text-gray-500 block">
                      {participant.employee.email}
                    </span>
                  </div>
                  <button
                    className="text-red-600 hover:text-red-800 transition-colors text-xs"
                    onClick={() => removeParticipant(selectedParticipants.findIndex(p =>
                      p.employeeId === participant.employeeId && p.relationshipType === 'peer'
                    ))}
                  >
                    Remove
                  </button>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 italic">No peers selected</div>
            )}
          </div>
        </div>

        {/* Direct Reports (if any) */}
        {grouped.direct_report.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${relationshipColors.direct_report} mr-2`}>
                Direct Reports
              </span>
              <span className="text-sm">
                {counts.direct_report.current}
              </span>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              {grouped.direct_report.map((participant, index) => (
                <div key={index} className="flex justify-between items-center mb-2 last:mb-0">
                  <div>
                    <span className="text-sm font-medium">
                      {participant.employee.firstName} {participant.employee.lastName}
                    </span>
                    <span className="text-xs text-gray-500 block">
                      {participant.employee.email}
                    </span>
                  </div>
                  <button
                    className="text-red-600 hover:text-red-800 transition-colors text-xs"
                    onClick={() => removeParticipant(selectedParticipants.findIndex(p =>
                      p.employeeId === participant.employeeId && p.relationshipType === 'direct_report'
                    ))}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* External (if any) */}
        {grouped.external.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${relationshipColors.external} mr-2`}>
                External
              </span>
              <span className="text-sm">
                {counts.external.current}
              </span>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              {grouped.external.map((participant, index) => (
                <div key={index} className="flex justify-between items-center mb-2 last:mb-0">
                  <div>
                    <span className="text-sm font-medium">
                       {participant.employee.firstName} {participant.employee.lastName}
                    </span>
                    <span className="text-xs text-gray-500 block">
                      {participant.employee.email}
                    </span>
                  </div>
                  <button
                    className="text-red-600 hover:text-red-800 transition-colors text-xs"
                    onClick={() => removeParticipant(selectedParticipants.findIndex(p =>
                      p.employeeId === participant.employeeId && p.relationshipType === 'external'
                    ))}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading employees...</p>
      </div>
    );
  }

  // Render error state
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

  // Main render
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Select Assessors</h2>
        <p className="text-gray-600">
           Choose the individuals who will provide feedback for {data.targetEmployeeDetails?.firstName || 'the target employee'} {data.targetEmployeeDetails?.lastName || ''}
        </p>
      </div>

      {/* Validation Errors */}
      {showValidationErrors && Object.keys(validationErrors).length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <h3 className="font-semibold flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Selection Requirements Not Met
          </h3>
          <ul className="mt-2 ml-6 list-disc">
            {Object.values(validationErrors).map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Progress Bars */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Selection Progress</h3>

        <div className="space-y-4">
          {/* Self Assessment */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <div className="flex items-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${relationshipColors.self} mr-2`}>
                  Self
                </span>
                <span>{getCounts().self.current}/{getCounts().self.required}</span>
              </div>
              <span className={`${getCounts().self.complete ? 'text-green-500' : 'text-gray-400'}`}>{getCounts().self.complete ? '✓' : ''}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getCounts().self.complete ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(100, (getCounts().self.current / getCounts().self.required) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Manager */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <div className="flex items-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${relationshipColors.manager} mr-2`}>
                  Manager
                </span>
                <span>{getCounts().manager.current}/{getCounts().manager.required}</span>
              </div>
              <span className={`${getCounts().manager.complete ? 'text-green-500' : 'text-gray-400'}`}>{getCounts().manager.complete ? '✓' : ''}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getCounts().manager.complete ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(100, (getCounts().manager.current / getCounts().manager.required) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Peers */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <div className="flex items-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${relationshipColors.peer} mr-2`}>
                  Peers
                </span>
                <span>{getCounts().peer.current}/{getCounts().peer.required}</span>
              </div>
              <span className={`${getCounts().peer.complete ? 'text-green-500' : 'text-gray-400'}`}>{getCounts().peer.complete ? '✓' : ''}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getCounts().peer.complete ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(100, (getCounts().peer.current / getCounts().peer.required) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Participant List */}
      {renderParticipantList()}

      {/* AI Suggested Assessors */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">AI-Suggested Assessors</h3>
          <button
            onClick={getSuggestedAssessors}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
            disabled={loadingSuggestions}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loadingSuggestions ? 'animate-spin' : ''}`} />
            Refresh Suggestions
          </button>
        </div>

        {loadingSuggestions ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : suggestedAssessors ? (
          <div>
            {/* Self */}
            {suggestedAssessors.suggestions.self.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Self-Assessment
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  {suggestedAssessors.suggestions.self.map((suggestion, index) => {
                    const isSelected = selectedParticipants.some(
                      p => p.employeeId === suggestion.id && p.relationshipType === 'self'
                    );

                    // Convert suggestion to employee format
                    const employee = {
                      id: suggestion.id,
                      firstName: suggestion.name.split(' ')[0],
                      lastName: suggestion.name.split(' ').slice(1).join(' '),
                      email: suggestion.email,
                      jobTitle: suggestion.jobTitle
                    };

                    return renderAssessorCard(employee, 'self', isSelected, suggestion.confidence);
                  })}
                </div>
              </div>
            )}

            {/* Managers */}
            {suggestedAssessors.suggestions.manager.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Suggested Managers
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestedAssessors.suggestions.manager.map((suggestion, index) => {
                    const isSelected = selectedParticipants.some(
                      p => p.employeeId === suggestion.id && p.relationshipType === 'manager'
                    );

                    // Convert suggestion to employee format
                    const employee = {
                      id: suggestion.id,
                      firstName: suggestion.name.split(' ')[0],
                      lastName: suggestion.name.split(' ').slice(1).join(' '),
                      email: suggestion.email,
                      jobTitle: suggestion.jobTitle
                    };

                    return renderAssessorCard(employee, 'manager', isSelected, suggestion.confidence);
                  })}
                </div>
              </div>
            )}

            {/* Peers */}
            {suggestedAssessors.suggestions.peer.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Suggested Peers
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestedAssessors.suggestions.peer.map((suggestion, index) => {
                    const isSelected = selectedParticipants.some(
                      p => p.employeeId === suggestion.id && p.relationshipType === 'peer'
                    );

                    // Convert suggestion to employee format
                    const employee = {
                      id: suggestion.id,
                      firstName: suggestion.name.split(' ')[0],
                      lastName: suggestion.name.split(' ').slice(1).join(' '),
                      email: suggestion.email,
                      jobTitle: suggestion.jobTitle
                    };

                    return renderAssessorCard(employee, 'peer', isSelected, suggestion.confidence);
                  })}
                </div>
              </div>
            )}

            {/* Direct Reports */}
            {suggestedAssessors.suggestions.direct_report.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Suggested Direct Reports
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestedAssessors.suggestions.direct_report.map((suggestion, index) => {
                    const isSelected = selectedParticipants.some(
                      p => p.employeeId === suggestion.id && p.relationshipType === 'direct_report'
                    );

                    // Convert suggestion to employee format
                    const employee = {
                      id: suggestion.id,
                      firstName: suggestion.name.split(' ')[0],
                      lastName: suggestion.name.split(' ').slice(1).join(' '),
                      email: suggestion.email,
                      jobTitle: suggestion.jobTitle
                    };

                    return renderAssessorCard(employee, 'direct_report', isSelected, suggestion.confidence);
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Suggestions Available</h3>
            <p className="text-gray-500 mb-4">
              Select a target employee and template to get AI-suggested assessors based on organizational data.
            </p>
          </div>
        )}
      </div>

      {/* Manual Selection */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Manual Selection</h3>

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

        <div className="flex space-x-2 mb-6 overflow-x-auto py-2">
          <button
            className={`px-3 py-1 rounded-full text-sm ${
              relationshipColors.self
            } whitespace-nowrap`}
            onClick={() => setSearchTerm('self')}
          >
            Self Assessment
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm ${
              relationshipColors.manager
            } whitespace-nowrap`}
            onClick={() => setSearchTerm('manager')}
          >
            Managers
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm ${
              relationshipColors.peer
            } whitespace-nowrap`}
            onClick={() => setSearchTerm('peers')}
          >
            Peers
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm ${
              relationshipColors.direct_report
            } whitespace-nowrap`}
            onClick={() => setSearchTerm('direct report')}
          >
            Direct Reports
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm ${
              relationshipColors.external
            } whitespace-nowrap`}
            onClick={() => setSearchTerm('external')}
          >
            External
          </button>
        </div>

        {filteredEmployees.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {filteredEmployees.map((employee) => (
              <div key={employee.id} className="border rounded-lg p-4">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {employee.firstName} {employee.lastName}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {employee.email}
                    </p>
                    {employee.jobTitle && (
                      <p className="text-xs text-gray-600 mt-1">
                        {employee.jobTitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => addParticipant(employee, 'self')}
                    className={`px-2 py-1 text-xs rounded ${
                      selectedParticipants.some(p => p.employeeId === employee.id && p.relationshipType === 'self')
                        ? 'bg-purple-600 text-white'
                        : relationshipColors.self
                    }`}
                    // Disable if this employee is not the target employee
                    disabled={employee.id !== data.targetEmployeeId}
                  >
                    + Self
                  </button>
                  <button
                    onClick={() => addParticipant(employee, 'manager')}
                    className={`px-2 py-1 text-xs rounded ${
                      selectedParticipants.some(p => p.employeeId === employee.id && p.relationshipType === 'manager')
                        ? 'bg-blue-600 text-white'
                        : relationshipColors.manager
                    }`}
                     // Disable if this employee IS the target employee
                     disabled={employee.id === data.targetEmployeeId}
                  >
                    + Manager
                  </button>
                  <button
                    onClick={() => addParticipant(employee, 'peer')}
                    className={`px-2 py-1 text-xs rounded ${
                      selectedParticipants.some(p => p.employeeId === employee.id && p.relationshipType === 'peer')
                        ? 'bg-green-600 text-white'
                        : relationshipColors.peer
                    }`}
                     // Disable if this employee IS the target employee
                     disabled={employee.id === data.targetEmployeeId}
                  >
                    + Peer
                  </button>
                  <button
                    onClick={() => addParticipant(employee, 'direct_report')}
                    className={`px-2 py-1 text-xs rounded ${
                      selectedParticipants.some(p => p.employeeId === employee.id && p.relationshipType === 'direct_report')
                        ? 'bg-amber-600 text-white'
                        : relationshipColors.direct_report
                    }`}
                     // Disable if this employee IS the target employee
                     disabled={employee.id === data.targetEmployeeId}
                  >
                    + Direct Report
                  </button>
                  <button
                    onClick={() => addParticipant(employee, 'external')}
                    className={`px-2 py-1 text-xs rounded ${
                      selectedParticipants.some(p => p.employeeId === employee.id && p.relationshipType === 'external')
                        ? 'bg-gray-600 text-white'
                        : relationshipColors.external
                    }`}
                     // Disable if this employee IS the target employee
                     disabled={employee.id === data.targetEmployeeId}
                  >
                    + External
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-500">No employees match your search criteria.</p>
          </div>
        )}
      </div>

      {/* The redundant button block that was here has been removed */}

    </div>
  );
};

export default AssessorSelection;