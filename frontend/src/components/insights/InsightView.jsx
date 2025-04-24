// frontend/src/components/insights/InsightView.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Save, Eye, EyeOff, Edit,
  FileText, User, Clock, Calendar, CheckCircle, AlertTriangle, RefreshCw
} from 'lucide-react';
import api from '../../services/api';

// Helper functions added from fix-insightview-rendering.js
/**
 * Try to safely parse JSON without throwing errors
 */
const safeJsonParse = (str) => {
  if (!str) return null;

  try {
    return JSON.parse(str);
  } catch (e) {
    console.error('JSON Parse Error:', e);
    return null;
  }
};

/**
 * Clean and repair JSON-like strings that may be invalid
 */
const repairJsonString = (str) => {
  if (!str || typeof str !== 'string') return str;

  // Replace common issues in JSON strings
  try {
    // Replace unescaped quotes in values
    let repaired = str
      .replace(/([^\\])"/g, '$1\\"') // Escape unescaped quotes
      .replace(/^"/, '\\"') // Escape quote at beginning if exists
      .replace(/([^\\])\\"/g, '$1"') // Restore properly escaped quotes
      .replace(/\\\\"/g, '\\"'); // Fix double escapes

    // Wrap in quotes if needed
    if (!repaired.startsWith('"') && !repaired.startsWith('{') && !repaired.startsWith('[')) {
      repaired = `"${repaired}"`;
    }

    return repaired;
  } catch (e) {
    console.error('Error repairing JSON string:', e);
    return str;
  }
};

/**
 * Extract content sections from potentially malformed JSON or string
 */
const extractContentSections = (content) => {
  // If it's already an object
  if (typeof content === 'object' && content !== null) {
    return content;
  }

  // If it's a string, try to parse it
  if (typeof content === 'string') {
    // Try to parse as JSON first
    try {
      return JSON.parse(content);
    } catch (e) {
      console.warn('Could not parse content as JSON, will try to extract sections manually');

      // Extract section contents using regex
      const sections = {};

      // Try to extract JSON-like sections with regex
      const sectionRegex = /"([^"]+)":\s*{[^}]*"content":\s*"([^"]*)"/g;
      let match;

      while ((match = sectionRegex.exec(content)) !== null) {
        const sectionKey = match[1];
        const sectionContent = match[2];

        sections[sectionKey] = {
          content: sectionContent,
          visibility: 'employeeVisible' // Default visibility
        };
      }

      // If no sections were found, try a simpler approach for text sections
      if (Object.keys(sections).length === 0) {
        const paragraphs = content.split(/\n\n+/);

        if (paragraphs.length > 0) {
          sections.strengthsSummary = {
            content: paragraphs[0],
            visibility: 'employeeVisible'
          };

          if (paragraphs.length > 1) {
            sections.growthAreas = {
              content: paragraphs[1],
              visibility: 'employeeVisible'
            };
          }

          if (paragraphs.length > 2) {
            sections.recommendedActions = {
              content: paragraphs.slice(2).join('\n\n'),
              visibility: 'employeeVisible'
            };
          }
        }
      }

      return sections;
    }
  }

  // Default empty object if all else fails
  return {};
};
// End of helper functions from fix-insightview-rendering.js


const InsightView = ({ insight: propInsight, loading: propLoading, error: propError, onRefresh }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [insight, setInsight] = useState(propInsight || null);
  const [loading, setLoading] = useState(propLoading || false);
  const [error, setError] = useState(propError || null);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('employeeVisible');
  const [originalContent, setOriginalContent] = useState({});

  useEffect(() => {
    if (propInsight) {
      setInsight(propInsight);
      // Initialize edited content using the helper function to handle different formats
      const initialContent = extractContentSections(propInsight.content);
      setEditedContent(initialContent);
      // Store original content separately for reset functionality
      const original = extractContentSections(propInsight.originalAiContent || propInsight.content);
      setOriginalContent(original);

    } else if (id) {
      fetchInsight();
    }
  }, [propInsight, id]);

  const fetchInsight = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/insights/${id}`);
      const fetchedInsight = response.data.insight;
      setInsight(fetchedInsight);
      console.log("INSIGHT DATA RAW:", fetchedInsight.content);

      // Initialize edited content using the helper function
      const initialContent = extractContentSections(fetchedInsight.content);
      setEditedContent(initialContent);

       // Store original content separately, prioritize originalAiContent
      const original = extractContentSections(fetchedInsight.originalAiContent || fetchedInsight.content);
      setOriginalContent(original);

      console.log("INITIAL EDITED CONTENT:", initialContent);
      console.log("INITIAL ORIGINAL CONTENT:", original);

      setError(null);
    } catch (err) {
      console.error('Error fetching insight:', err);
      setError('Failed to load insight. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Replaced handleContentChange from fix-insightview-methods.js
  const handleContentChange = (sectionId, value) => {
    setEditedContent(prev => ({
      ...prev,
      [sectionId]: {
        // Preserve existing data like visibility if it exists
        ...(prev[sectionId] || {}),
        content: value
      }
    }));
  };

  // Replaced handleSaveChanges from fix-insightview-methods.js
  const handleSaveChanges = async () => {
    try {
      setSaving(true);

      const contentToSend = {};

      // Process each section ensuring correct structure
      Object.entries(editedContent).forEach(([key, data]) => {
        if (!data) return; // Skip if data is null/undefined

        // Use the edited content directly. Determine visibility from state or original.
        let sectionData = {
          content: '', // Default to empty string
          visibility: originalContent[key]?.visibility || 'employeeVisible' // Default visibility
        };

        // Check if edited data is an object with content/visibility or just a string
        if (typeof data === 'object' && data !== null) {
            sectionData.content = data.content || ''; // Ensure content is a string
            // Use visibility from edited state if present, else fallback
            sectionData.visibility = data.visibility || originalContent[key]?.visibility || 'employeeVisible';
        } else if (typeof data === 'string') {
            // Handle cases where editedContent might just store the string
            sectionData.content = data;
        } else {
             console.warn(`Content for section ${key} was not a string or object, sending empty string.`);
        }

        // *** IMPORTANT: Removed the aggressive string cleaning from here ***
        // We send the content as it is from the editor.
        contentToSend[key] = sectionData;
      });

      console.log('Sending structured content (minimal cleaning):', contentToSend);

      // Update insight content
      await api.put(`/insights/${id}`, {
        content: contentToSend // Send the structured object
      });

      // Fetch updated insight to reflect changes
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

  const handleRegenerateContent = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call the regenerate endpoint
      await api.post(`/insights/${id}/regenerate`);

      // Fetch updated insight
      await fetchInsight();

      setLoading(false);
    } catch (err) {
      console.error('Error regenerating insight:', err);
      setError('Failed to regenerate insight content. Please try again.');
      setLoading(false);
    }
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

  // Replaced getContentSections function from fix-insightview-getcontentsections.js
  const getContentSections = (visibilityLevel) => {
    console.log('INSIGHT CONTENT TYPE:', typeof insight?.content);

    if (!insight) {
      console.log('No insight data');
      return [];
    }

    // Helper to determine if a section should be included
    const shouldIncludeSection = (sectionVisibility) => {
      if (visibilityLevel === 'hrOnly') return true; // HR sees everything
      if (visibilityLevel === 'managerOnly') return sectionVisibility !== 'hrOnly';
      if (visibilityLevel === 'employeeVisible') return sectionVisibility === 'employeeVisible';
      return false;
    };

    let processedContent = {};

    // Process content based on its type using the helper function
    try {
        processedContent = extractContentSections(insight.content);
        console.log("Processed content for sections:", processedContent);
    } catch (error) {
        console.error('Error processing content:', error);
        processedContent = {};
    }

    // Last resort: Create a default section if everything else fails
    if (!processedContent || Object.keys(processedContent).length === 0) {
      console.log('No sections found or content invalid, creating default ones');
      processedContent = {
        strengthsSummary: {
          content: "Content is not available in the expected format. Please regenerate the insight.",
          visibility: 'employeeVisible'
        },
        growthAreas: {
          content: "The insight data needs to be regenerated to display properly.",
          visibility: 'employeeVisible'
        }
      };
    }

    // Map the processed content to sections array
    const sections = Object.entries(processedContent)
      .filter(([key, sectionData]) => {
        if (!sectionData) return false; // Skip null/undefined section data

        // Determine visibility, default to employeeVisible if not specified
        const visibility = typeof sectionData === 'object' && sectionData.visibility
          ? sectionData.visibility
          : 'employeeVisible';

        return shouldIncludeSection(visibility);
      })
      .map(([key, data]) => {
        const title = key
          .replace(/([A-Z])/g, ' $1') // Add space before capitals
          .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
          .replace(/([a-z])([A-Z])/g, '$1 $2'); // Add space between lower and upper case

        // Handle both object format {content, visibility} and direct string content
        let content = '';
        let visibility = 'employeeVisible'; // Default visibility

        if (typeof data === 'object' && data !== null) {
          content = data.content || ''; // Ensure content is string
          visibility = data.visibility || 'employeeVisible';
        } else if (typeof data === 'string') {
          content = data; // Use the string directly as content
        }

        // Get edited and original content, ensuring fallbacks
        const currentEditedContent = editedContent[key]?.content ?? content;
        const originalSecContent = originalContent[key]?.content ?? content;


        return {
          id: key,
          title,
          content: content, // The base content from the processed data
          visibility,
          editedContent: currentEditedContent, // Use state for edited content
          originalContent: originalSecContent // Use state for original content
        };
      });

    console.log(`Processed ${sections.length} sections for visibility level: ${visibilityLevel}`);
    return sections;
  };


  if (loading && !insight) { // Show loading only if insight is not yet loaded
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
            onClick={onRefresh || fetchInsight} // Use passed onRefresh or internal fetchInsight
          >
            Try Again
          </button>
           {/* Add regenerate button here too for convenience */}
           <button
              onClick={handleRegenerateContent}
              disabled={loading}
              className="ml-4 mt-1 inline-flex items-center px-3 py-1 border border-purple-300 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 text-sm"
            >
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
            </button>
        </div>
      </div>
    );
  }

  if (!insight) return null; // Should not happen if loading/error handled, but safe check

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

            {/* Regenerate with AI button */}
            <button
              onClick={handleRegenerateContent}
              disabled={loading || saving} // Disable while loading or saving
              className="inline-flex items-center px-3 py-2 border border-purple-300 shadow-sm text-sm leading-4 font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate with AI
                </>
              )}
            </button>

            {insight.status === 'draft' && (
              <button
                onClick={handlePublish}
                disabled={saving || loading} // Disable while saving or loading
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                 {saving ? 'Publishing...' : 'Publish'}
              </button>
            )}

            <button
              onClick={() => setEditMode(!editMode)}
              disabled={loading || saving} // Disable edit toggle during operations
              className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white ${
                editMode
                  ? 'bg-gray-600 hover:bg-gray-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50`}
            >
              <Edit className="h-4 w-4 mr-2" />
              {editMode ? 'Cancel Edit' : 'Edit Content'}
            </button>

            {editMode && (
              <button
                onClick={handleSaveChanges}
                disabled={saving || loading} // Disable save when saving or loading
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                ) : (
                   <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                   </>
                )}
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
              disabled={editMode} // Disable tab switching in edit mode
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'employeeVisible'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center">
                <Eye className="h-4 w-4 mr-2" />
                Employee View
              </div>
            </button>

            <button
              onClick={() => setActiveTab('managerOnly')}
              disabled={editMode} // Disable tab switching in edit mode
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'managerOnly'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2" />
                Manager View
              </div>
            </button>

            <button
              onClick={() => setActiveTab('hrOnly')}
              disabled={editMode} // Disable tab switching in edit mode
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'hrOnly'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
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
              <p className="text-sm text-gray-400 mt-2">Try using the "Regenerate with AI" button or switching to a different view.</p>

              {/* Add a button to make it easier to regenerate */}
              <button
                onClick={handleRegenerateContent}
                disabled={loading || saving}
                className="mt-4 inline-flex items-center px-4 py-2 border border-purple-300 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate Content
                  </>
                )}
              </button>
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

                 {/* Replaced content rendering block from fix-content-rendering.js */}
                  {editMode ? (
                      <div>
                          <textarea
                          // Use section.editedContent which comes from the state
                          value={section.editedContent || ''}
                          onChange={(e) => handleContentChange(section.id, e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          rows={10}
                          />
                          <div className="mt-2 flex justify-between text-xs text-gray-500">
                          <div>
                              <button
                              // Reset to originalContent from state
                              onClick={() => handleContentChange(section.id, section.originalContent || '')}
                              className="text-blue-600 hover:text-blue-800"
                              >
                              Reset to original
                              </button>
                          </div>
                          <div>
                              {/* Compare edited state with the original state */}
                              {section.editedContent !== section.originalContent && (
                              <span className="text-yellow-600">Modified</span>
                              )}
                          </div>
                          </div>
                      </div>
                      ) : (
                        <div className="prose max-w-none">
                        {/* Display the content (could be original or saved edited) */}
                        {/* Use section.content which reflects the latest fetched/saved state */}
                        {/* Simplified display logic: only split into paragraphs */}
                        {section.content && typeof section.content === 'string' ?
                        section.content
                            .split('\n') // Split into paragraphs by newline
                            .map((paragraph, index) => (
                              // Render each non-empty line as a paragraph
                              paragraph.trim() && <p key={index} className="mb-2">{paragraph.trim()}</p>
                            )) :
                        // Fallback if content is not a string or is empty
                        <p className="text-gray-500">Content not available or in unexpected format. Consider regenerating.</p>
                        }
                    </div>
                  )}
                 {/* End of replaced block */}

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