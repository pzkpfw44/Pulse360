// frontend/src/components/insights/InsightView.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Download, Save, Eye, EyeOff, Edit, 
  FileText, User, Clock, Calendar, CheckCircle, AlertTriangle 
} from 'lucide-react';
import api from '../../services/api';

const InsightView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('employeeVisible');
  const [originalContent, setOriginalContent] = useState({});
  
  useEffect(() => {
    fetchInsight();
  }, [id]);
  
  const fetchInsight = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/insights/${id}`);
      setInsight(response.data.insight);
      
      // Initialize edited content with the current content
      setEditedContent(response.data.insight.content);
      setOriginalContent(response.data.insight.originalAiContent || response.data.insight.content);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching insight:', err);
      setError('Failed to load insight. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      
      // Update insight content
      await api.put(`/insights/${id}`, {
        content: editedContent
      });
      
      // Fetch updated insight
      await fetchInsight();
      
      // Exit edit mode
      setEditMode(false);
      setSaving(false);
    } catch (err) {
      console.error('Error saving insight:', err);
      alert('Failed to save changes. Please try again.');
      setSaving(false);
    }
  };
  
  const handlePublish = async () => {
    try {
      setSaving(true);
      
      // Update insight status to published
      await api.put(`/insights/${id}`, {
        status: 'published'
      });
      
      // Fetch updated insight
      await fetchInsight();
      setSaving(false);
    } catch (err) {
      console.error('Error publishing insight:', err);
      alert('Failed to publish insight. Please try again.');
      setSaving(false);
    }
  };
  
  const handleDownload = () => {
    try {
      // This will trigger a file download with the selected visibility
      window.open(`${api.defaults.baseURL}/insights/${id}/export-pdf?visibilityLevel=${activeTab}`, '_blank');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };
  
  const handleContentChange = (section, value) => {
    setEditedContent(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        content: value
      }
    }));
  };
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const formatInsightType = (type) => {
    const typeMap = {
      'growth_blueprint': 'Your Growth Blueprint',
      'leadership_impact': 'Leadership Impact Navigator',
      'team_synergy': 'Team Synergy Compass',
      'collaboration_patterns': 'Collaboration Patterns Analysis',
      'talent_landscape': 'Talent Landscape Panorama',
      'culture_pulse': 'Culture Pulse Monitor',
      'development_impact': 'Development Impact Scorecard'
    };
    
    return typeMap[type] || type.replace(/_/g, ' ');
  };
  
  const getStatusBadge = (status) => {
    const statusConfig = {
      'draft': { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
      'published': { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      'archived': { color: 'bg-gray-100 text-gray-800', icon: <AlertTriangle className="h-3 w-3" /> }
    };

    const config = statusConfig[status] || statusConfig.draft;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };
  
  // Filter content sections by visibility level
  const getContentSections = (visibilityLevel) => {
    if (!insight || !insight.content) return [];
    
    // Helper to determine if a section should be included
    const shouldIncludeSection = (sectionVisibility) => {
      if (visibilityLevel === 'hrOnly') return true; // HR sees everything
      if (visibilityLevel === 'managerOnly') return sectionVisibility !== 'hrOnly';
      if (visibilityLevel === 'employeeVisible') return sectionVisibility === 'employeeVisible';
      return false;
    };
    
    return Object.entries(insight.content)
      .filter(([_, sectionData]) => shouldIncludeSection(sectionData.visibility))
      .map(([key, data]) => ({
        id: key,
        title: key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .replace(/([a-z])([A-Z])/g, '$1 $2'),
        content: data.content,
        visibility: data.visibility,
        editedContent: editedContent[key]?.content || data.content,
        originalContent: originalContent[key]?.content || data.content
      }));
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading insight...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate('/insights-360/self')}
            className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">Insight Details</h1>
        </div>
        
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p>{error}</p>
          <button
            className="text-red-700 underline mt-1"
            onClick={fetchInsight}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  
  if (!insight) return null;
  
  const contentSections = getContentSections(activeTab);
  
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/insights-360/self')}
            className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-grow">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold mr-3">{insight.title}</h1>
              {getStatusBadge(insight.status)}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {formatInsightType(insight.type)}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </button>
            
            {insight.status === 'draft' && (
              <button
                onClick={handlePublish}
                disabled={saving}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Publish
              </button>
            )}
            
            <button
              onClick={() => setEditMode(!editMode)}
              className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white ${
                editMode 
                  ? 'bg-gray-600 hover:bg-gray-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              <Edit className="h-4 w-4 mr-2" />
              {editMode ? 'Cancel Edit' : 'Edit Content'}
            </button>
            
            {editMode && (
              <button
                onClick={handleSaveChanges}
                disabled={saving}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Employee Info */}
      <div className="bg-white rounded-lg shadow mb-6 p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <User className="h-6 w-6" />
            </div>
          </div>
          <div className="ml-4">
            <h2 className="text-lg font-medium text-gray-900">
              {insight.targetEmployee ? `${insight.targetEmployee.firstName} ${insight.targetEmployee.lastName}` : 'Unknown Employee'}
            </h2>
            <div className="text-sm text-gray-500">
              {insight.targetEmployee?.jobTitle && (
                <span className="block">{insight.targetEmployee.jobTitle}</span>
              )}
              <span className="block">Generated on {formatDate(insight.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Visibility Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('employeeVisible')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'employeeVisible'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Eye className="h-4 w-4 mr-2" />
                Employee View
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('managerOnly')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'managerOnly'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                Manager View
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('hrOnly')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'hrOnly'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <EyeOff className="h-4 w-4 mr-2" />
                HR View (All Content)
              </div>
            </button>
          </nav>
        </div>
        
        {/* Content Sections */}
        <div className="p-5">
          {contentSections.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No content available for this visibility level.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {contentSections.map((section) => (
                <div key={section.id} className="pb-6 border-b border-gray-200 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
                    <div className="text-xs text-gray-500">
                      {section.visibility === 'employeeVisible' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-800">
                          <Eye className="h-3 w-3 mr-1" />
                          Employee Visible
                        </span>
                      ) : section.visibility === 'managerOnly' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          <User className="h-3 w-3 mr-1" />
                          Manager Only
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                          <EyeOff className="h-3 w-3 mr-1" />
                          HR Only
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {editMode ? (
                    <div>
                      <textarea
                        value={section.editedContent}
                        onChange={(e) => handleContentChange(section.id, e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 focus:border-blue-500"
                        rows={10}
                      />
                      <div className="mt-2 flex justify-between text-xs text-gray-500">
                        <div>
                          <button
                            onClick={() => handleContentChange(section.id, section.originalContent)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Reset to original
                          </button>
                        </div>
                        <div>
                          {section.editedContent !== section.content && (
                            <span className="text-yellow-600">Modified</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="prose max-w-none">
                      {section.content.split('\n').map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsightView;