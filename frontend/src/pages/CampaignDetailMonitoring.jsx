// frontend/src/pages/CampaignDetailMonitoring.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Clock, Calendar, CheckCircle2, User, Users, 
  Mail, AlertTriangle, RefreshCw, Trash2, Edit, PauseCircle,
  PlayCircle, Send, Slash, XCircle, Eye, ChevronDown, ChevronUp
} from 'lucide-react';
import api from '../services/api';

const CampaignDetailMonitoring = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(null);

  // Define relationship colors
  const relationshipColors = {
    'self': 'bg-purple-100 text-purple-800',
    'manager': 'bg-blue-100 text-blue-800',
    'peer': 'bg-green-100 text-green-800',
    'direct_report': 'bg-amber-100 text-amber-800',
    'external': 'bg-gray-100 text-gray-800'
  };

  // Fetch campaign data
  const fetchCampaign = async () => {
    try {
      setRefreshing(true);
      const response = await api.get(`/campaigns/${id}`);
      setCampaign(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching campaign:', err);
      setError('Failed to load campaign details. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  // Toggle section expansion
  const toggleSection = (section) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  // Calculate campaign progress metrics
  const calculateMetrics = () => {
    if (!campaign || !campaign.participants) return null;
    
    const participants = campaign.participants;
    const total = participants.length;
    const completed = participants.filter(p => p.status === 'completed').length;
    const inProgress = participants.filter(p => p.status === 'in_progress').length;
    const pending = participants.filter(p => ['pending', 'invited'].includes(p.status)).length;
    const declined = participants.filter(p => p.status === 'declined').length;
    
    // Calculate by relationship type
    const byRelationshipType = {
      self: calculateByType('self'),
      manager: calculateByType('manager'),
      peer: calculateByType('peer'),
      direct_report: calculateByType('direct_report'),
      external: calculateByType('external')
    };
    
    function calculateByType(type) {
      const typeParticipants = participants.filter(p => p.relationshipType === type);
      const typeTotal = typeParticipants.length;
      if (typeTotal === 0) return { total: 0, completed: 0, rate: 0 };
      
      const typeCompleted = typeParticipants.filter(p => p.status === 'completed').length;
      return {
        total: typeTotal,
        completed: typeCompleted,
        rate: Math.round((typeCompleted / typeTotal) * 100)
      };
    }
    
    return {
      total,
      completed,
      inProgress,
      pending,
      declined,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      byRelationshipType
    };
  };

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

  // Get status badge for participant
  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { color: 'bg-gray-100 text-gray-800', icon: <Clock className="h-3 w-3" />, label: 'Pending' },
      'invited': { color: 'bg-blue-100 text-blue-800', icon: <Mail className="h-3 w-3" />, label: 'Invited' },
      'in_progress': { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" />, label: 'In Progress' },
      'completed': { color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Completed' },
      'declined': { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" />, label: 'Declined' }
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  // Get status badge for campaign
  const getCampaignStatusBadge = (status) => {
    const statusConfig = {
      'draft': { color: 'bg-gray-100 text-gray-800', icon: <Clock className="h-3 w-3" />, label: 'Draft' },
      'active': { color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Active' },
      'paused': { color: 'bg-yellow-100 text-yellow-800', icon: <PauseCircle className="h-3 w-3" />, label: 'Paused' },
      'completed': { color: 'bg-blue-100 text-blue-800', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Completed' },
      'canceled': { color: 'bg-red-100 text-red-800', icon: <Slash className="h-3 w-3" />, label: 'Canceled' }
    };

    const config = statusConfig[status] || statusConfig.draft;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  // Check if participant needs a reminder
  const needsReminder = (participant) => {
    if (participant.status === 'completed' || participant.status === 'declined') {
      return false;
    }
    
    if (!participant.lastInvitedAt) {
      return true;
    }
    
    const lastInvited = new Date(participant.lastInvitedAt);
    const now = new Date();
    const daysDifference = Math.floor((now - lastInvited) / (1000 * 60 * 60 * 24));
    
    return daysDifference >= 3; // Reminder needed if last invitation was 3+ days ago
  };

  // Get days since last reminder
  const getDaysSinceLastInvitation = (participant) => {
    if (!participant.lastInvitedAt) return null;
    
    const lastInvited = new Date(participant.lastInvitedAt);
    const now = new Date();
    return Math.floor((now - lastInvited) / (1000 * 60 * 60 * 24));
  };

  // Handle sending reminders
  const handleSendReminders = async () => {
    try {
      setSendingReminder(true);
      
      // Mock API call for now - in a real implementation you would call an endpoint
      // that sends reminders to the selected participants
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update participants as if reminders were sent
      const updatedCampaign = { ...campaign };
      updatedCampaign.participants = campaign.participants.map(p => {
        if (selectedParticipants.includes(p.id)) {
          return {
            ...p,
            lastInvitedAt: new Date().toISOString(),
            reminderCount: (p.reminderCount || 0) + 1
          };
        }
        return p;
      });
      
      setCampaign(updatedCampaign);
      setSelectedParticipants([]);
      
      // Show success message
      // This would be implemented with a proper notification system
      alert('Reminders sent successfully!');
      
    } catch (err) {
      console.error('Error sending reminders:', err);
      alert('Failed to send reminders. Please try again.');
    } finally {
      setSendingReminder(false);
    }
  };

  // Handle campaign action (pause, resume, cancel)
  const handleCampaignAction = async (action) => {
    try {
      setShowConfirmation(null);
      setRefreshing(true);
      
      let endpoint;
      let successMessage;
      
      switch (action) {
        case 'pause':
          // In a real implementation, you'd have an endpoint for pausing
          endpoint = `/campaigns/${id}`;
          successMessage = 'Campaign paused successfully';
          await api.put(endpoint, { ...campaign, status: 'paused' });
          break;
        case 'resume':
          // In a real implementation, you'd have an endpoint for resuming
          endpoint = `/campaigns/${id}`;
          successMessage = 'Campaign resumed successfully';
          await api.put(endpoint, { ...campaign, status: 'active' });
          break;
        case 'cancel':
          endpoint = `/campaigns/${id}/cancel`;
          successMessage = 'Campaign canceled successfully';
          await api.post(endpoint);
          break;
        default:
          throw new Error('Unknown action');
      }
      
      // Refresh campaign data
      await fetchCampaign();
      
      // Show success message
      alert(successMessage);
      
    } catch (err) {
      console.error(`Error ${action}ing campaign:`, err);
      alert(`Failed to ${action} campaign. Please try again.`);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle toggling participant selection
  const toggleParticipantSelection = (participantId) => {
    if (selectedParticipants.includes(participantId)) {
      setSelectedParticipants(selectedParticipants.filter(id => id !== participantId));
    } else {
      setSelectedParticipants([...selectedParticipants, participantId]);
    }
  };

  // Handle select all participants
  const selectAllParticipants = () => {
    const incompleteParticipants = campaign.participants
      .filter(p => p.status !== 'completed' && p.status !== 'declined')
      .map(p => p.id);
    
    setSelectedParticipants(incompleteParticipants);
  };

  // Handle clear selection
  const clearSelection = () => {
    setSelectedParticipants([]);
  };

  // Calculate metrics
  const metrics = campaign ? calculateMetrics() : null;

  // Render loading state
  if (loading && !campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading campaign details...</p>
      </div>
    );
  }

  // Render error state
  if (error && !campaign) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate('/monitor-360')}
            className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">Campaign Details</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p>{error}</p>
          <button
            className="text-red-700 underline mt-1"
            onClick={fetchCampaign}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!campaign) return null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/monitor-360')}
            className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center">
              <h1 className="text-2xl font-bold mr-3">{campaign.name}</h1>
              {getCampaignStatusBadge(campaign.status)}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {campaign.description || 'No description provided'}
            </p>
          </div>
        </div>
      </div>

      {/* Campaign Overview */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-medium">Campaign Overview</h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Target Employee</h3>
            <div className="mt-1 flex items-center">
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 mr-2">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {campaign.targetEmployee ? `${campaign.targetEmployee.firstName} ${campaign.targetEmployee.lastName}` : 'Not assigned'}
                </p>
                <p className="text-xs text-gray-500">
                  {campaign.targetEmployee?.jobTitle || ''}
                </p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Timeline</h3>
            <div className="mt-1">
              <div className="flex items-center text-sm text-gray-900">
                <Calendar className="h-4 w-4 text-gray-500 mr-1" />
                <span>{formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}</span>
              </div>
              {campaign.status === 'active' && (
                <div className="mt-1 text-xs">
                  {campaign.endDate && new Date(campaign.endDate) < new Date() ? (
                    <span className="text-red-600">Overdue</span>
                  ) : campaign.endDate ? (
                    <span className="text-green-600">
                      {Math.ceil((new Date(campaign.endDate) - new Date()) / (1000 * 60 * 60 * 24))} days remaining
                    </span>
                  ) : (
                    <span className="text-gray-500">No end date set</span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Template</h3>
            <div className="mt-1 text-sm text-gray-900">
              {campaign.template ? (
                <div className="flex items-center">
                  <span className="font-medium">{campaign.template.name}</span>
                </div>
              ) : (
                <span className="text-gray-500">No template assigned</span>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Last Activity</h3>
            <div className="mt-1 text-sm text-gray-900">
              {campaign.updatedAt ? (
                <div>
                  <p>
                    {new Date(campaign.updatedAt).toLocaleDateString()} at{' '}
                    {new Date(campaign.updatedAt).toLocaleTimeString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {campaign.status === 'active' ? 'Campaign active' : `Campaign ${campaign.status}`}
                  </p>
                </div>
              ) : (
                <span className="text-gray-500">No activity recorded</span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Campaign Progress */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-medium">Campaign Progress</h2>
        </div>
        {metrics && (
          <div className="p-5">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Overall Completion</div>
                <div className="text-sm font-medium">{metrics.completionRate}%</div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    metrics.completionRate >= 80
                      ? 'bg-green-600'
                      : metrics.completionRate >= 50
                      ? 'bg-blue-600'
                      : 'bg-yellow-500'
                  }`}
                  style={{ width: `${metrics.completionRate}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <div>0%</div>
                <div>50%</div>
                <div>100%</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Total Assessors</p>
                <p className="text-lg font-bold">{metrics.total}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600 mb-1">Completed</p>
                <p className="text-lg font-bold text-green-700">{metrics.completed}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-xs text-yellow-600 mb-1">In Progress</p>
                <p className="text-lg font-bold text-yellow-700">{metrics.inProgress}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 mb-1">Pending</p>
                <p className="text-lg font-bold text-blue-700">{metrics.pending}</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-3">Progress by Relationship Type</h3>
              <div className="space-y-3">
                {Object.entries(metrics.byRelationshipType).map(([type, data]) => {
                  if (data.total === 0) return null;
                  
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${relationshipColors[type]}`}>
                            {formatRelationshipType(type)}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            {data.completed} of {data.total} completed
                          </span>
                        </div>
                        <div className="text-xs font-medium">{data.rate}%</div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            data.rate >= 80
                              ? 'bg-green-600'
                              : data.rate >= 50
                              ? 'bg-blue-600'
                              : 'bg-yellow-500'
                          }`}
                          style={{ width: `${data.rate}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Campaign Actions */}
      {campaign.status !== 'completed' && campaign.status !== 'canceled' && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-5 border-b border-gray-200">
            <h2 className="text-lg font-medium">Campaign Actions</h2>
          </div>
          <div className="p-5 flex flex-wrap gap-3">
            {campaign.status === 'active' && (
              <button
                onClick={() => setShowConfirmation('pause')}
                className="inline-flex items-center px-4 py-2 border border-yellow-300 bg-yellow-50 text-yellow-700 rounded-md hover:bg-yellow-100"
              >
                <PauseCircle className="h-4 w-4 mr-2" />
                Pause Campaign
              </button>
            )}
            
            {campaign.status === 'paused' && (
              <button
                onClick={() => setShowConfirmation('resume')}
                className="inline-flex items-center px-4 py-2 border border-green-300 bg-green-50 text-green-700 rounded-md hover:bg-green-100"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Resume Campaign
              </button>
            )}
            
            {['active', 'paused', 'draft'].includes(campaign.status) && (
              <button
                onClick={() => setShowConfirmation('cancel')}
                className="inline-flex items-center px-4 py-2 border border-red-300 bg-red-50 text-red-700 rounded-md hover:bg-red-100"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Campaign
              </button>
            )}
            
            {campaign.status === 'active' && (
              <button
                onClick={() => navigate(`/campaign/edit/${campaign.id}`)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Campaign
              </button>
            )}
            
            {campaign.status === 'draft' && (
              <button
                onClick={() => navigate(`/campaign/edit/${campaign.id}`)}
                className="inline-flex items-center px-4 py-2 border border-blue-600 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Edit className="h-4 w-4 mr-2" />
                Continue Editing
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Assessor Management */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div 
          className="p-5 border-b border-gray-200 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('assessors')}
        >
          <h2 className="text-lg font-medium">Assessor Management</h2>
          <div>
            {expandedSection === 'assessors' ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </div>
        </div>
        
        {expandedSection === 'assessors' && campaign.participants && campaign.participants.length > 0 && (
          <div className="p-5">
            <div className="flex flex-wrap gap-2 mb-4">
              {campaign.status === 'active' && (
                <>
                  <button
                    onClick={selectAllParticipants}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                    disabled={campaign.participants.every(p => p.status === 'completed' || p.status === 'declined')}
                  >
                    Select All Incomplete
                  </button>
                  
                  {selectedParticipants.length > 0 && (
                    <>
                      <button
                        onClick={clearSelection}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                      >
                        Clear Selection
                      </button>
                      
                      <button
                        onClick={handleSendReminders}
                        disabled={sendingReminder}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
                      >
                        {sendingReminder ? (
                          <>
                            <RefreshCw className="animate-spin h-3 w-3 mr-1" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-3 w-3 mr-1" />
                            Send Reminders ({selectedParticipants.length})
                          </>
                        )}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {campaign.status === 'active' && (
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <span className="sr-only">Select</span>
                      </th>
                    )}
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assessor
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Relationship
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Reminder
                    </th>
                    <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {campaign.participants.map((participant) => {
                    const daysSinceLastInvitation = getDaysSinceLastInvitation(participant);
                    const isNeedingReminder = needsReminder(participant);
                    
                    return (
                      <tr key={participant.id} className="hover:bg-gray-50">
                        {campaign.status === 'active' && (
                          <td className="px-3 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              checked={selectedParticipants.includes(participant.id)}
                              onChange={() => toggleParticipantSelection(participant.id)}
                              disabled={participant.status === 'completed' || participant.status === 'declined'}
                            />
                          </td>
                        )}
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 mr-2">
                              <User className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {participant.employee ? `${participant.employee.firstName} ${participant.employee.lastName}` : 'Unknown'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {participant.employee?.email || 'No email'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${relationshipColors[participant.relationshipType]}`}>
                            {formatRelationshipType(participant.relationshipType)}
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          {getStatusBadge(participant.status)}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          {participant.lastInvitedAt ? (
                            <div>
                              <div className="text-sm text-gray-900">
                                {new Date(participant.lastInvitedAt).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {daysSinceLastInvitation === 0
                                  ? 'Today'
                                  : daysSinceLastInvitation === 1
                                  ? 'Yesterday'
                                  : `${daysSinceLastInvitation} days ago`}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Not sent yet</span>
                          )}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {campaign.status === 'active' && isNeedingReminder && (
                            <button
                              onClick={() => {
                                setSelectedParticipants([participant.id]);
                                handleSendReminders();
                              }}
                              className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                              disabled={sendingReminder}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Remind
                            </button>
                          )}
                          
                          {participant.status === 'completed' && (
                            <button
                              className="text-green-600 hover:text-green-900 inline-flex items-center"
                              onClick={() => {
                                // This would show a feedback preview or details in a real implementation
                                alert('Feedback details would be shown here in a real implementation');
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {/* Communication Log */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div 
          className="p-5 border-b border-gray-200 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('communications')}
        >
          <h2 className="text-lg font-medium">Communication Log</h2>
          <div>
            {expandedSection === 'communications' ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </div>
        </div>
        
        {expandedSection === 'communications' && (
          <div className="p-5">
            {/* For a real implementation, fetch and display the communication log */}
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Communication Log</h3>
              <p className="text-gray-500 max-w-lg mx-auto">
                The communication log would show all emails sent to participants, including invitations and reminders.
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Confirmation Dialog for Campaign Actions */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-lg font-medium">
                {showConfirmation === 'pause' && 'Pause Campaign'}
                {showConfirmation === 'resume' && 'Resume Campaign'}
                {showConfirmation === 'cancel' && 'Cancel Campaign'}
              </h3>
            </div>
            <div className="p-5">
              <p className="text-gray-700 mb-4">
                {showConfirmation === 'pause' && 'Are you sure you want to pause this campaign? No invitations or reminders will be sent while paused.'}
                {showConfirmation === 'resume' && 'Are you sure you want to resume this campaign? This will allow invitations and reminders to be sent again.'}
                {showConfirmation === 'cancel' && 'Are you sure you want to cancel this campaign? This action cannot be undone and will end the campaign permanently.'}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirmation(null)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-gray-700 hover:bg-gray-50"
                >
                  No, Cancel
                </button>
                <button
                  onClick={() => handleCampaignAction(showConfirmation)}
                  className={`px-4 py-2 text-white rounded-md shadow-sm ${
                    showConfirmation === 'cancel' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Yes, Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignDetailMonitoring;