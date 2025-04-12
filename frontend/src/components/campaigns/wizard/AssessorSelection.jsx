// frontend/src/components/campaigns/wizard/AssessorSelection.jsx

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Check, 
  Users, 
  AlertTriangle, 
  User, 
  UserPlus, 
  RefreshCw,
  Shield,
  UserMinus,
  X
} from 'lucide-react';
import api from '../../../services/api';

const AssessorSelection = ({ data, onDataChange, onNext }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [participants, setParticipants] = useState(data.participants || []);
  const [selectedTab, setSelectedTab] = useState('self');
  const [targetEmployee, setTargetEmployee] = useState(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestions, setSuggestions] = useState({});
  const [hasSufficientData, setHasSufficientData] = useState({});
  const [showAll, setShowAll] = useState(false);

  // Define relationship types and their requirements
  const relationshipTypes = [
    { id: 'self', label: 'Self', min: 1, max: 1, description: 'Self-assessment by the individual' },
    { id: 'manager', label: 'Manager', min: 1, max: 2, description: 'Direct and indirect managers' },
    { id: 'peer', label: 'Peers', min: 3, max: 10, description: 'Colleagues at the same level' },
    { id: 'direct_report', label: 'Direct Reports', min: 0, max: 10, description: 'Team members reporting to this person' },
    { id: 'external', label: 'External', min: 0, max: 5, description: 'Outside stakeholders (clients, partners)' }
  ];

  useEffect(() => {
    fetchEmployees();
    if (data.targetEmployeeId) {
      fetchTargetEmployee(data.targetEmployeeId);
    }
  }, [data.targetEmployeeId]);

  useEffect(() => {
    if (data.templateId && data.targetEmployeeId && employees.length > 0) {
      getSuggestedAssessors();
    }
  }, [data.templateId, data.targetEmployeeId, employees]);

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

  const fetchTargetEmployee = async (employeeId) => {
    try {
      const employee = employees.find(e => e.id === employeeId);
      if (employee) {
        setTargetEmployee(employee);
      } else {
        const response = await api.get(`/employees/${employeeId}`);
        setTargetEmployee(response.data);
      }
    } catch (err) {
      console.error('Error fetching target employee:', err);
    }
  };

  const getSuggestedAssessors = async () => {
    try {
      setSuggestionLoading(true);
      
      const response = await api.post('/campaigns/suggest-assessors', {
        templateId: data.templateId,
        employeeId: data.targetEmployeeId
      });
      
      setSuggestions(response.data.suggestions || {});
      setHasSufficientData(response.data.hasSufficientData || {});
      
      // Pre-populate participants with suggestions
      const newParticipants = [...participants];
      
      // Add self-assessment automatically
      if (response.data.suggestions.self && response.data.suggestions.self.length > 0 && 
          !participants.some(p => p.relationshipType === 'self')) {
        const self = response.data.suggestions.self[0];
        newParticipants.push({
          id: `new-${Date.now()}-self`,
          employeeId: self.id,
          relationshipType: 'self',
          employeeName: self.name,
          employeeEmail: self.email,
          employeeJobTitle: self.jobTitle,
          aiSuggested: true
        });
      }
      
      // Add manager automatically
      if (response.data.suggestions.manager && response.data.suggestions.manager.length > 0 && 
          !participants.some(p => p.relationshipType === 'manager')) {
        const manager = response.data.suggestions.manager[0];
        newParticipants.push({
          id: `new-${Date.now()}-manager`,
          employeeId: manager.id,
          relationshipType: 'manager',
          employeeName: manager.name,
          employeeEmail: manager.email,
          employeeJobTitle: manager.jobTitle,
          aiSuggested: true
        });
      }
      
      setParticipants(newParticipants);
      updateParticipants(newParticipants);
      
    } catch (err) {
      console.error('Error getting suggested assessors:', err);
    } finally {
      setSuggestionLoading(false);
    }
  };

  const addParticipant = (employee, relationshipType) => {
    // Check if employee is already selected for this relationship type
    const exists = participants.some(
      p => p.employeeId === employee.id && p.relationshipType === relationshipType
    );
    
    if (exists) return;
    
    // For self assessment, remove any existing self entries first
    if (relationshipType === 'self') {
      const filtered = participants.filter(p => p.relationshipType !== 'self');
      
      const newParticipant = {
        id: `new-${Date.now()}`,
        employeeId: employee.id,
        relationshipType,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        employeeEmail: employee.email,
        employeeJobTitle: employee.jobTitle || '',
        aiSuggested: false
      };
      
      const newParticipants = [...filtered, newParticipant];
      setParticipants(newParticipants);
      updateParticipants(newParticipants);
      return;
    }
    
    // Check if we've reached the maximum for this relationship type
    const typeConfig = relationshipTypes.find(type => type.id === relationshipType);
    const currentCount = participants.filter(p => p.relationshipType === relationshipType).length;
    
    if (typeConfig && currentCount >= typeConfig.max) return;
    
    const newParticipant = {
      id: `new-${Date.now()}`,
      employeeId: employee.id,
      relationshipType,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeEmail: employee.email,
      employeeJobTitle: employee.jobTitle || '',
      aiSuggested: false
    };
    
    const newParticipants = [...participants, newParticipant];
    setParticipants(newParticipants);
    updateParticipants(newParticipants);
  };

  const removeParticipant = (participantId) => {
    const newParticipants = participants.filter(p => p.id !== participantId);
    setParticipants(newParticipants);
    updateParticipants(newParticipants);
  };

  const updateParticipants = (newParticipants) => {
    onDataChange({ participants: newParticipants });
  };

  const handleSuggestionRefresh = () => {
    getSuggestedAssessors();
  };

  const handleNextClick = () => {
    console.log("Next button clicked, participants:", participants);
    // Make sure we're passing the full participants array
    onNext({ participants: [...participants] });
  };

  // Filter employees based on search term
  const filteredEmployees = employees.filter(employee => {
    // Special handling for self tab - show all employees for manual selection
    if (selectedTab === 'self') {
      // Don't restrict to just target employee for manual selection
      return `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employee.jobTitle && employee.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    // For other tabs, exclude the target employee
    if (employee.id === data.targetEmployeeId) {
      return false;
    }
    
    return `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.jobTitle && employee.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  // Get counts for each relationship type
  const getCounts = () => {
    const counts = {};
    relationshipTypes.forEach(type => {
      counts[type.id] = participants.filter(p => p.relationshipType === type.id).length;
    });
    return counts;
  };

  const relationshipCounts = getCounts();

  // Check if we meet minimum requirements
  const meetsRequirements = () => {
    // Self-assessment is not strictly required to proceed
    // Check if at least some assessors are selected
    const totalAssessors = Object.values(relationshipCounts).reduce((sum, count) => sum + count, 0);
    
    if (totalAssessors > 0) {
      // As long as some assessors are selected, allow proceeding
      return true;
    }
    
    return false;
  };

  const renderWarningForType = (typeId) => {
    const typeConfig = relationshipTypes.find(type => type.id === typeId);
    const count = relationshipCounts[typeId] || 0;
    
    if (!typeConfig) return null;
    
    if (count < typeConfig.min) {
      return (
        <div className="flex items-center text-amber-600 text-sm mt-1">
          <AlertTriangle className="h-4 w-4 mr-1" />
          <span>Need at least {typeConfig.min} {typeConfig.label}</span>
        </div>
      );
    }
    
    return null;
  };

  // Get suggested employees for the current tab
  const getSuggestionsForCurrentTab = () => {
    return suggestions[selectedTab] || [];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading assessors...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Select Assessors</h2>
        <p className="text-gray-600">
          Choose the individuals who will provide feedback for{' '}
          <strong>{targetEmployee ? `${targetEmployee.firstName} ${targetEmployee.lastName}` : 'the target employee'}</strong>.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6 flex flex-wrap gap-4">
        {relationshipTypes.map(type => (
          <div key={type.id} className="flex-1 min-w-[150px]">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-700">{type.label}</h3>
              <span className={`text-sm font-medium ${
                relationshipCounts[type.id] < type.min ? 'text-amber-600' : 'text-gray-900'
              }`}>
                {relationshipCounts[type.id] || 0} / {type.min}+
              </span>
            </div>
            <div className="mt-1 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full rounded-full ${
                  relationshipCounts[type.id] >= type.min ? 'bg-green-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, (relationshipCounts[type.id] || 0) / type.min * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Relationship Type Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {relationshipTypes.map(type => (
            <button
              key={type.id}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === type.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setSelectedTab(type.id)}
            >
              {type.label}
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs font-medium bg-gray-100">
                {relationshipCounts[type.id] || 0}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Selected Participants */}
      {participants.filter(p => p.relationshipType === selectedTab).length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Selected {relationshipTypes.find(t => t.id === selectedTab)?.label}</h3>
          <div className="space-y-2">
            {participants
              .filter(p => p.relationshipType === selectedTab)
              .map(participant => (
                <div 
                  key={participant.id}
                  className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{participant.employeeName}</p>
                      <p className="text-xs text-gray-500">{participant.employeeEmail}</p>
                    </div>
                    {participant.aiSuggested && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        AI Suggested
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Add this line to prevent event bubbling
                      removeParticipant(participant.id);
                    }}
                    className="text-gray-400 hover:text-red-500"
                    aria-label="Remove participant"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
          </div>
          {renderWarningForType(selectedTab)}
        </div>
      )}

      {/* AI Suggestions and Selection Area */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium text-gray-700">
            {suggestionLoading ? 'Loading Suggestions...' : 'AI Suggested Assessors'}
          </h3>
          <button
            onClick={handleSuggestionRefresh}
            disabled={suggestionLoading}
            className={`flex items-center text-xs px-2 py-1 rounded ${
              suggestionLoading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${suggestionLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {!hasSufficientData[selectedTab] && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start">
            <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-700">
                Limited data available for AI suggestions.
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Please use manual selection to add {relationshipTypes.find(t => t.id === selectedTab)?.label.toLowerCase()}.
              </p>
            </div>
          </div>
        )}

        {getSuggestionsForCurrentTab().length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {getSuggestionsForCurrentTab()
              .slice(0, showAll ? undefined : 4)
              .map(suggestion => {
                const isAlreadySelected = participants.some(
                  p => p.employeeId === suggestion.id && p.relationshipType === selectedTab
                );
                
                return (
                  <div
                    key={suggestion.id}
                    className={`border rounded-lg p-3 ${
                      isAlreadySelected 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-white border-gray-200 hover:border-blue-300 cursor-pointer'
                    }`}
                    onClick={() => {
                      if (!isAlreadySelected) {
                        addParticipant({
                          id: suggestion.id,
                          firstName: suggestion.name.split(' ')[0],
                          lastName: suggestion.name.split(' ').slice(1).join(' '),
                          email: suggestion.email,
                          jobTitle: suggestion.jobTitle
                        }, selectedTab);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{suggestion.name}</p>
                          <p className="text-xs text-gray-500">{suggestion.email}</p>
                          {suggestion.jobTitle && (
                            <p className="text-xs text-gray-500">{suggestion.jobTitle}</p>
                          )}
                        </div>
                      </div>
                      {isAlreadySelected ? (
                        <div className="bg-blue-500 text-white p-1 rounded-full">
                          <Check className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="p-1 rounded-full border border-gray-200">
                          <UserPlus className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                    {suggestion.reason && (
                      <div className="mt-2 text-xs bg-blue-50 text-blue-700 py-1 px-2 rounded inline-block">
                        {suggestion.reason}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ) : (
          !suggestionLoading && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center mb-4">
              <Shield className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                No AI suggestions available for this relationship type.
              </p>
            </div>
          )
        )}

        {getSuggestionsForCurrentTab().length > 4 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center mx-auto mb-4"
          >
            Show all {getSuggestionsForCurrentTab().length} suggestions
          </button>
        )}

        {/* Manual Employee Selection */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-700">Manual Selection</h3>
          </div>

          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder={`Search ${selectedTab === 'self' ? 'target employee' : 'employees'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {employees.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Users size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600">No employees available. Add employees first.</p>
              <a
                href="/integration?section=employee-management"
                className="mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Add Employees
              </a>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <AlertTriangle size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-600">No matching employees found. Try different search terms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {filteredEmployees.map(employee => {
                const isAlreadySelected = participants.some(
                  p => p.employeeId === employee.id && p.relationshipType === selectedTab
                );
                
                return (
                  <div
                    key={employee.id}
                    className={`border rounded-lg p-3 ${
                      isAlreadySelected 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-white border-gray-200 hover:border-blue-300 cursor-pointer'
                    }`}
                    onClick={() => {
                      if (isAlreadySelected) {
                        // Find the participant ID to remove
                        const participantToRemove = participants.find(
                          p => p.employeeId === employee.id && p.relationshipType === selectedTab
                        );
                        if (participantToRemove) {
                          removeParticipant(participantToRemove.id);
                        }
                      } else {
                        addParticipant(employee, selectedTab);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 mr-3">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {employee.firstName} {employee.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{employee.email}</p>
                          {employee.jobTitle && (
                            <p className="text-xs text-gray-500">{employee.jobTitle}</p>
                          )}
                        </div>
                      </div>
                      {isAlreadySelected ? (
                        <div className="bg-blue-500 text-white p-1 rounded-full">
                          <Check className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="p-1 rounded-full border border-gray-200">
                          <UserPlus className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Humor warning about confidentiality with small groups */}
      {selectedTab === 'peer' && relationshipCounts.peer > 0 && relationshipCounts.peer < 3 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start">
          <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-700 font-medium">
              Confidentiality Alert: "The Three Amigos" Rule
            </p>
            <p className="text-sm text-amber-600 mt-1">
              We recommend at least 3 peers for feedback. With fewer people, it's easier to guess who said what, 
              and feedback might be less honest. Besides, who wants to play "Guess Who Said That About Me?" at 
              the next team lunch? 🕵️‍♂️
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end mt-6">
        <button
          onClick={handleNextClick}
          disabled={!meetsRequirements()}
          className={`px-4 py-2 text-white rounded-md ${
            meetsRequirements()
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Next: Schedule Campaign
        </button>
      </div>
    </div>
  );
};

export default AssessorSelection;