// frontend/src/pages/Results360.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, BarChart2, Download, FileText, 
  UserCheck, Users, ChevronDown, ChevronUp,
  Clock, CheckCircle2, AlertTriangle, Briefcase
} from 'lucide-react';
import { resultsApi, campaignsApi } from '../services/api';

const Results360 = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    self: false,
    manager: false,
    peer: false,
    directReport: false,
    external: false
  });

  // Fetch campaigns if no campaignId is provided
  useEffect(() => {
    if (!campaignId) {
      fetchCompletedCampaigns();
    } else {
      fetchCampaignResults(campaignId);
    }
  }, [campaignId]);

  // Fetch completed campaigns for the listing page
  const fetchCompletedCampaigns = async () => {
    try {
      setLoading(true);
      const response = await campaignsApi.getAll();
      
      // Get all campaigns with either "completed" status or with completed assessments
      const campaignsWithResults = response.data.campaigns
        ? response.data.campaigns.filter(campaign => {
            // Include completed campaigns
            if (campaign.status === 'completed') return true;
            
            // Include active campaigns that have at least one completed assessment
            if ((campaign.status === 'active' || campaign.status === 'paused') && 
                campaign.participants && campaign.participants.length > 0) {
              const completedParticipants = campaign.participants.filter(p => p.status === 'completed').length;
              return completedParticipants > 0;
            }
            
            return false;
          })
        : [];
        
      console.log('Campaigns with results:', campaignsWithResults);
      setCampaigns(campaignsWithResults);
      setError(null);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Failed to load campaigns with results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch results for a specific campaign
  const fetchCampaignResults = async (id) => {
    try {
      setLoading(true);
      const response = await resultsApi.getCampaignResults(id);
      console.log('Campaign results:', response.data);
      setResults(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching results:', err);
      setError('Failed to load results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle PDF export
  const handleExport = async () => {
    try {
      setLoading(true);
      const response = await resultsApi.exportCampaignResults(campaignId);
      
      // In a real implementation, handle the PDF download here
      // For now, just show a notification
      alert('Export functionality will be implemented in a future update.');
      
      setLoading(false);
    } catch (err) {
      console.error('Error exporting results:', err);
      setError('Failed to export results. Please try again.');
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  // Campaign listing view (when no campaignId is provided)
  if (!campaignId) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Results 360</h1>
          <p className="text-sm text-gray-500">
            View feedback results for completed and in-progress campaigns
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <p>{error}</p>
            <button
              className="text-red-700 underline mt-1"
              onClick={fetchCompletedCampaigns}
            >
              Try Again
            </button>
          </div>
        )}

        {campaigns.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <BarChart2 size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Campaigns With Results</h3>
            <p className="text-gray-500 mb-4">
              Wait for assessors to complete their feedback or complete a campaign to view results.
            </p>
            <button
              onClick={() => navigate('/monitor-360')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Campaign Monitoring
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campaign
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target Employee
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completion
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {campaigns.map((campaign) => {
                    // Calculate actual completion rate if not provided
                    const completionRate = campaign.completionRate || (
                      campaign.participants && campaign.participants.length > 0 
                        ? Math.round((campaign.participants.filter(p => p.status === 'completed').length / 
                                    campaign.participants.length) * 100)
                        : 0
                    );
                    
                    return (
                      <tr key={campaign.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                          <div className="text-sm text-gray-500">
                            {campaign.template ? campaign.template.name : 'No template'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {campaign.targetEmployee ? (
                            <div className="text-sm text-gray-900">
                              {campaign.targetEmployee.firstName} {campaign.targetEmployee.lastName}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Not assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            campaign.status === 'completed' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            <span className="mr-1">
                              {campaign.status === 'completed' 
                                ? <CheckCircle2 className="h-3 w-3" /> 
                                : <Clock className="h-3 w-3" />}
                            </span>
                            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900 mr-2">
                              {completionRate}%
                            </span>
                            <div className="w-24 bg-gray-200 rounded-full h-2.5">
                              <div
                                className={`h-2.5 rounded-full ${
                                  completionRate >= 80
                                    ? 'bg-green-600'
                                    : completionRate >= 50
                                    ? 'bg-blue-600'
                                    : 'bg-yellow-500'
                                }`}
                                style={{ width: `${completionRate}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => navigate(`/results-360/campaign/${campaign.id}`)}
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                          >
                            <BarChart2 className="h-4 w-4 mr-1" />
                            View Results
                          </button>
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
    );
  }

  // Render error state for specific campaign view
  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate('/results-360')}
            className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">Campaign Results</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p>{error}</p>
          <button
            className="text-red-700 underline mt-1"
            onClick={() => fetchCampaignResults(campaignId)}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!results) return null;

  // Define relationship type colors for consistent styling
  const relationshipColors = {
    'self': 'bg-purple-100 text-purple-800',
    'manager': 'bg-blue-100 text-blue-800',
    'peer': 'bg-green-100 text-green-800',
    'direct_report': 'bg-amber-100 text-amber-800',
    'external': 'bg-gray-100 text-gray-800'
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

  // Check if there are enough responses to show anonymized data
  const hasEnoughResponses = (type) => {
    const count = results.participantCounts[type === 'directReport' ? 'directReport' : type];
    return count >= 3;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/results-360')}
            className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{results.campaign.name} - Results</h1>
            <p className="text-sm text-gray-500 mt-1">
              Feedback for: {results.campaign.targetEmployee?.name || 'Unknown'}
              {results.campaign.targetEmployee?.jobTitle && ` - ${results.campaign.targetEmployee.jobTitle}`}
            </p>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={handleExport}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4 mr-2" />
          Export to PDF
        </button>
      </div>

      {/* Overview Section */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div 
          className="p-5 border-b border-gray-200 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('overview')}
        >
          <h2 className="text-lg font-medium">Overview</h2>
          <div>
            {expandedSections.overview ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </div>
        </div>
        
        {expandedSections.overview && (
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Campaign Information</h3>
                <div className="mt-2">
                  <p className="text-sm">
                    <span className="font-medium">Template:</span> {results.campaign.template.name}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Period:</span> {formatDate(results.campaign.startDate)} - {formatDate(results.campaign.endDate)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Status:</span> {results.campaign.status.charAt(0).toUpperCase() + results.campaign.status.slice(1)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Completion:</span> {results.campaign.completionRate}%
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Participant Breakdown</h3>
                <div className="mt-2">
                  <p className="text-sm">
                    <span className="font-medium">Total Participants:</span> {results.participantCounts.total}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Completed Assessments:</span> {results.participantCounts.completed}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Self Assessment:</span> {results.participantCounts.self ? 'Completed' : 'Not Completed'}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Manager Responses:</span> {results.participantCounts.manager}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Peer Responses:</span> {results.participantCounts.peer}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Direct Report Responses:</span> {results.participantCounts.directReport}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">External Responses:</span> {results.participantCounts.external}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Overall Rating Summary */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Overall Rating Summary</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                {Object.keys(results.ratingAverages.overall).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(results.ratingAverages.overall).map(([questionId, data]) => (
                      <div key={questionId} className="flex flex-col">
                        <p className="text-sm font-medium">{data.questionText}</p>
                        <div className="flex items-center mt-1">
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full" 
                              style={{ width: `${(data.average / 5) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{data.average.toFixed(1)}</span>
                        </div>
                        <p className="text-xs text-gray-500">Based on {data.count} responses</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No rating data available</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Self Assessment Section */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div 
          className="p-5 border-b border-gray-200 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('self')}
        >
          <div className="flex items-center">
            <h2 className="text-lg font-medium mr-2">Self Assessment</h2>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${relationshipColors.self}`}>
              {formatRelationshipType('self')}
            </span>
          </div>
          <div>
            {expandedSections.self ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </div>
        </div>
        
        {expandedSections.self && (
          <div className="p-5">
            {results.individualResponses.self && results.individualResponses.self.length > 0 ? (
              <div className="space-y-6">
                {results.individualResponses.self.map(response => (
                  <div key={response.id} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                    <p className="font-medium">{response.Question?.text}</p>
                    {response.Question?.type === 'rating' ? (
                      <div className="flex items-center mt-2">
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map(value => (
                            <div 
                              key={value}
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                value <= response.ratingValue 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              {value}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-gray-700">{response.textResponse}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No self-assessment data available</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Manager Feedback Section */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div 
          className="p-5 border-b border-gray-200 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('manager')}
        >
          <div className="flex items-center">
            <h2 className="text-lg font-medium mr-2">Manager Feedback</h2>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${relationshipColors.manager}`}>
              {formatRelationshipType('manager')}
            </span>
          </div>
          <div>
            {expandedSections.manager ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </div>
        </div>
        
        {expandedSections.manager && (
          <div className="p-5">
            {results.individualResponses.manager && results.individualResponses.manager.length > 0 ? (
              <div className="space-y-6">
                {results.individualResponses.manager.map(response => (
                  <div key={response.id} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                    <p className="font-medium">{response.Question?.text}</p>
                    {response.Question?.type === 'rating' ? (
                      <div className="flex items-center mt-2">
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map(value => (
                            <div 
                              key={value}
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                value <= response.ratingValue 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              {value}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-gray-700">{response.textResponse}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No manager feedback available</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Peer Feedback Section */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div 
          className="p-5 border-b border-gray-200 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('peer')}
        >
          <div className="flex items-center">
            <h2 className="text-lg font-medium mr-2">Peer Feedback</h2>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${relationshipColors.peer}`}>
              {formatRelationshipType('peer')} ({results.participantCounts.peer})
            </span>
          </div>
          <div>
            {expandedSections.peer ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </div>
        </div>
        
        {expandedSections.peer && (
          <div className="p-5">
            {/* Check if there are at least 3 responses for anonymity */}
            {hasEnoughResponses('peer') ? (
              <div>
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-md mb-4">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Note:</span> Peer feedback is anonymized and aggregated to protect privacy.
                  </p>
                </div>
                
                {results.aggregatedResponses.peer && 
                Object.keys(results.aggregatedResponses.peer.byQuestion).length > 0 ? (
                  <div className="space-y-8">
                    {Object.entries(results.aggregatedResponses.peer.byQuestion).map(([questionId, data]) => (
                      <div key={questionId} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                        <p className="font-medium">{data.questionText}</p>
                        
                        {data.questionType === 'rating' ? (
                          <div className="mt-3">
                            <div className="flex items-center mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2 max-w-md">
                                <div 
                                  className="bg-green-600 h-2.5 rounded-full" 
                                  style={{ width: `${(data.average / 5) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{data.average.toFixed(1)}</span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">Based on {data.count} responses</p>
                            
                            {/* Rating distribution */}
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-500 mb-1">Rating Distribution:</p>
                              <div className="grid grid-cols-5 gap-1">
                                {[1, 2, 3, 4, 5].map(value => (
                                  <div key={value} className="text-center">
                                    <div className="text-xs">{value}</div>
                                    <div className="h-16 bg-gray-100 rounded-md relative">
                                      <div 
                                        className="absolute bottom-0 w-full bg-green-500 rounded-b-md"
                                        style={{ 
                                          height: `${data.distribution[value] ? (data.distribution[value] / data.count) * 100 : 0}%` 
                                        }}
                                      ></div>
                                    </div>
                                    <div className="text-xs mt-1">
                                      {data.distribution[value] || 0}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3">
                            <p className="text-sm text-gray-500 mb-2">
                              {data.count} {data.count === 1 ? 'response' : 'responses'}
                            </p>
                            <div className="space-y-2">
                              {data.responses.map((text, index) => (
                                <div key={index} className="bg-gray-50 p-3 rounded-md">
                                  <p className="text-gray-700">{text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No peer feedback responses available</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md inline-block">
                  <AlertTriangle className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
                  <p className="text-gray-700">
                    {results.participantCounts.peer > 0 ? (
                      <>
                        <span className="font-medium">Privacy protection active:</span> Peer feedback will be displayed when at least 3 peers have provided feedback.
                        <br />
                        <span className="text-sm text-gray-500">Currently {results.participantCounts.peer} {results.participantCounts.peer === 1 ? 'peer has' : 'peers have'} responded.</span>
                      </>
                    ) : (
                      <span>No peer feedback available</span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Direct Report Feedback Section */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div 
          className="p-5 border-b border-gray-200 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('directReport')}
        >
          <div className="flex items-center">
            <h2 className="text-lg font-medium mr-2">Direct Report Feedback</h2>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${relationshipColors.direct_report}`}>
              {formatRelationshipType('direct_report')} ({results.participantCounts.directReport})
            </span>
          </div>
          <div>
            {expandedSections.directReport ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </div>
        </div>
        
        {expandedSections.directReport && (
          <div className="p-5">
            {/* Check if there are at least 3 responses for anonymity */}
            {hasEnoughResponses('directReport') ? (
              <div>
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-md mb-4">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Note:</span> Direct report feedback is anonymized and aggregated to protect privacy.
                  </p>
                </div>
                
                {results.aggregatedResponses.directReport && 
                Object.keys(results.aggregatedResponses.directReport.byQuestion).length > 0 ? (
                  <div className="space-y-8">
                    {Object.entries(results.aggregatedResponses.directReport.byQuestion).map(([questionId, data]) => (
                      <div key={questionId} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                        <p className="font-medium">{data.questionText}</p>
                        
                        {data.questionType === 'rating' ? (
                          <div className="mt-3">
                            <div className="flex items-center mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2 max-w-md">
                                <div 
                                  className="bg-amber-600 h-2.5 rounded-full" 
                                  style={{ width: `${(data.average / 5) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{data.average.toFixed(1)}</span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">Based on {data.count} responses</p>
                            
                            {/* Rating distribution */}
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-500 mb-1">Rating Distribution:</p>
                              <div className="grid grid-cols-5 gap-1">
                                {[1, 2, 3, 4, 5].map(value => (
                                  <div key={value} className="text-center">
                                    <div className="text-xs">{value}</div>
                                    <div className="h-16 bg-gray-100 rounded-md relative">
                                      <div 
                                        className="absolute bottom-0 w-full bg-amber-500 rounded-b-md"
                                        style={{ 
                                          height: `${data.distribution[value] ? (data.distribution[value] / data.count) * 100 : 0}%` 
                                        }}
                                      ></div>
                                    </div>
                                    <div className="text-xs mt-1">
                                      {data.distribution[value] || 0}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3">
                            <p className="text-sm text-gray-500 mb-2">
                              {data.count} {data.count === 1 ? 'response' : 'responses'}
                            </p>
                            <div className="space-y-2">
                              {data.responses.map((text, index) => (
                                <div key={index} className="bg-gray-50 p-3 rounded-md">
                                  <p className="text-gray-700">{text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No direct report feedback responses available</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md inline-block">
                  <AlertTriangle className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
                  <p className="text-gray-700">
                    {results.participantCounts.directReport > 0 ? (
                      <>
                        <span className="font-medium">Privacy protection active:</span> Direct report feedback will be displayed when at least 3 direct reports have provided feedback.
                        <br />
                        <span className="text-sm text-gray-500">Currently {results.participantCounts.directReport} {results.participantCounts.directReport === 1 ? 'direct report has' : 'direct reports have'} responded.</span>
                      </>
                    ) : (
                      <span>No direct report feedback available</span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* External Feedback Section */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div 
          className="p-5 border-b border-gray-200 flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('external')}
        >
          <div className="flex items-center">
            <h2 className="text-lg font-medium mr-2">External Feedback</h2>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${relationshipColors.external}`}>
              {formatRelationshipType('external')} ({results.participantCounts.external})
            </span>
          </div>
          <div>
            {expandedSections.external ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </div>
        </div>
        
        {expandedSections.external && (
          <div className="p-5">
            {/* Check if there are at least 3 responses for anonymity */}
            {hasEnoughResponses('external') ? (
              <div>
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-md mb-4">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Note:</span> External feedback is anonymized and aggregated to protect privacy.
                  </p>
                </div>
                
                {results.aggregatedResponses.external && 
                Object.keys(results.aggregatedResponses.external.byQuestion).length > 0 ? (
                  <div className="space-y-8">
                    {Object.entries(results.aggregatedResponses.external.byQuestion).map(([questionId, data]) => (
                      <div key={questionId} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                        <p className="font-medium">{data.questionText}</p>
                        
                        {data.questionType === 'rating' ? (
                          <div className="mt-3">
                            <div className="flex items-center mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2 max-w-md">
                                <div 
                                  className="bg-gray-600 h-2.5 rounded-full" 
                                  style={{ width: `${(data.average / 5) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{data.average.toFixed(1)}</span>
                            </div>
                            <p className="mt-1 text-xs text-gray-500">Based on {data.count} responses</p>
                            
                            {/* Rating distribution */}
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-500 mb-1">Rating Distribution:</p>
                              <div className="grid grid-cols-5 gap-1">
                                {[1, 2, 3, 4, 5].map(value => (
                                  <div key={value} className="text-center">
                                    <div className="text-xs">{value}</div>
                                    <div className="h-16 bg-gray-100 rounded-md relative">
                                      <div 
                                        className="absolute bottom-0 w-full bg-gray-500 rounded-b-md"
                                        style={{ 
                                          height: `${data.distribution[value] ? (data.distribution[value] / data.count) * 100 : 0}%` 
                                        }}
                                      ></div>
                                    </div>
                                    <div className="text-xs mt-1">
                                      {data.distribution[value] || 0}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3">
                            <p className="text-sm text-gray-500 mb-2">
                              {data.count} {data.count === 1 ? 'response' : 'responses'}
                            </p>
                            <div className="space-y-2">
                              {data.responses.map((text, index) => (
                                <div key={index} className="bg-gray-50 p-3 rounded-md">
                                  <p className="text-gray-700">{text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No external feedback responses available</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md inline-block">
                  <AlertTriangle className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
                  <p className="text-gray-700">
                    {results.participantCounts.external > 0 ? (
                      <>
                        <span className="font-medium">Privacy protection active:</span> External feedback will be displayed when at least 3 external assessors have provided feedback.
                        <br />
                        <span className="text-sm text-gray-500">Currently {results.participantCounts.external} {results.participantCounts.external === 1 ? 'external assessor has' : 'external assessors have'} responded.</span>
                      </>
                    ) : (
                      <span>No external feedback available</span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Results360;