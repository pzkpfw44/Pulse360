import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { templatesApi } from '../../services/api';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  Plus,
  Trash2,
  Pencil,
  Save,
  Check,
  X,
  RefreshCw,
  Settings,
  FileText,
  Scale,
  Users,
  HelpCircle
} from 'lucide-react';

// TabPanel component for perspective tabs
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`perspective-tabpanel-${index}`}
      aria-labelledby={`perspective-tab-${index}`}
      {...other}
    >
      {value === index && (
        <div className="p-2">
          {children}
        </div>
      )}
    </div>
  );
}

// Rating Scale Component
const RatingScaleEditor = ({ scales, setScales, onSave, onCancel }) => {
  const [currentScale, setCurrentScale] = useState(null);
  const [editMode, setEditMode] = useState(false);

  // Handle creating a new scale
  const handleCreateScale = () => {
    setCurrentScale({
      name: 'New Rating Scale',
      minValue: 1,
      maxValue: 5,
      labels: {
        "1": "Poor",
        "2": "Below Expectations",
        "3": "Meets Expectations",
        "4": "Exceeds Expectations",
        "5": "Outstanding"
      },
      defaultForPerspective: 'all',
      _id: `temp_${Date.now()}`
    });
    setEditMode(true);
  };

  // Handle editing an existing scale
  const handleEditScale = (scale) => {
    setCurrentScale({...scale});
    setEditMode(true);
  };

  // Handle saving a scale
  const handleSaveScale = () => {
    const updatedScales = currentScale.id
      ? scales.map(s => s.id === currentScale.id ? currentScale : s)
      : [...scales, {...currentScale, id: currentScale._id}];
    
    setScales(updatedScales);
    setEditMode(false);
    setCurrentScale(null);
    
    if (onSave) onSave(updatedScales);
  };

  // Handle deleting a scale
  const handleDeleteScale = (scaleId) => {
    const updatedScales = scales.filter(s => s.id !== scaleId);
    setScales(updatedScales);
    
    if (onSave) onSave(updatedScales);
  };

  // Handle updating labels
  const handleLabelChange = (value, labelText) => {
    const updatedLabels = {...currentScale.labels, [value]: labelText};
    setCurrentScale({...currentScale, labels: updatedLabels});
  };

  return (
    <div>
      {!editMode ? (
        <div>
          <div className="flex justify-between mb-4">
            <h2 className="text-lg font-semibold">Rating Scales</h2>
            <button 
              className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              onClick={handleCreateScale}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Scale
            </button>
          </div>
          
          {scales.length === 0 ? (
            <div className="p-6 bg-gray-50 rounded-lg text-center">
              <p className="text-gray-600 mb-4">
                No rating scales defined yet.
              </p>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center mx-auto"
                onClick={handleCreateScale}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Default Scale
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scales.map(scale => (
                <div key={scale.id} className="border border-gray-200 rounded p-4">
                  <div className="flex justify-between mb-2">
                    <h3 className="font-medium">{scale.name}</h3>
                    <div>
                      <button 
                        className="text-gray-600 hover:text-blue-600 p-1"
                        onClick={() => handleEditScale(scale)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button 
                        className="text-gray-600 hover:text-red-600 p-1"
                        onClick={() => handleDeleteScale(scale.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    Scale: {scale.minValue} to {scale.maxValue}
                  </p>
                  
                  <div className="mt-2">
                    {scale.defaultForPerspective && (
                      <span 
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {scale.defaultForPerspective === 'all' 
                          ? 'Default for All Perspectives' 
                          : `Default for ${scale.defaultForPerspective.charAt(0).toUpperCase() + scale.defaultForPerspective.slice(1)} Perspective`}
                      </span>
                    )}
                  </div>
                  
                  <div className="my-2 border-t border-gray-100 pt-2" />
                  
                  <p className="text-sm text-gray-600">
                    Rating Labels:
                  </p>
                  
                  <div className="mt-2">
                    {scale.labels && Object.entries(scale.labels).map(([value, label]) => (
                      <div key={value} className="flex mb-1">
                        <span className="inline-flex items-center justify-center w-8 h-6 rounded bg-gray-100 text-xs font-medium mr-2">
                          {value}
                        </span>
                        <span className="text-sm">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">
            {currentScale.id ? 'Edit Rating Scale' : 'Create New Rating Scale'}
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="scaleName" className="block text-sm font-medium text-gray-700 mb-1">
                Scale Name
              </label>
              <input
                id="scaleName"
                type="text"
                value={currentScale.name}
                onChange={(e) => setCurrentScale({...currentScale, name: e.target.value})}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="minValue" className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Value
                </label>
                <input
                  id="minValue"
                  type="number"
                  value={currentScale.minValue}
                  onChange={(e) => {
                    const minValue = parseInt(e.target.value);
                    setCurrentScale({...currentScale, minValue});
                  }}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="maxValue" className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Value
                </label>
                <input
                  id="maxValue"
                  type="number"
                  value={currentScale.maxValue}
                  onChange={(e) => {
                    const maxValue = parseInt(e.target.value);
                    setCurrentScale({...currentScale, maxValue});
                  }}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="defaultPerspective" className="block text-sm font-medium text-gray-700 mb-1">
                Default For Perspective
              </label>
              <select
                id="defaultPerspective"
                value={currentScale.defaultForPerspective || 'all'}
                onChange={(e) => setCurrentScale({...currentScale, defaultForPerspective: e.target.value})}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Perspectives</option>
                <option value="manager">Manager Perspective</option>
                <option value="peer">Peer Perspective</option>
                <option value="direct_report">Direct Report Perspective</option>
                <option value="self">Self Assessment</option>
                <option value="external">External Stakeholder</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                This scale will be the default for questions in the selected perspective
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Rating Labels
              </h3>
              <div className="border border-gray-200 rounded p-4">
                {Array.from({ length: currentScale.maxValue - currentScale.minValue + 1 }).map((_, i) => {
                  const value = currentScale.minValue + i;
                  return (
                    <div key={value} className="flex items-center mb-2">
                      <span className="inline-flex items-center justify-center w-8 h-6 rounded bg-gray-100 text-xs font-medium mr-2">
                        {value}
                      </span>
                      <input
                        type="text"
                        value={currentScale.labels?.[value] || ''}
                        onChange={(e) => handleLabelChange(value, e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder={`Label for ${value}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button 
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 mr-2"
              onClick={() => {
                setEditMode(false);
                setCurrentScale(null);
                if (onCancel) onCancel();
              }}
            >
              Cancel
            </button>
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              onClick={handleSaveScale}
            >
              <Save className="h-4 w-4 mr-1" />
              Save Scale
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Main TemplateReview Component
const TemplateReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [newQuestion, setNewQuestion] = useState({
    text: '',
    type: 'rating',
    category: '',
    perspective: 'peer',
    required: true,
  });
  const [showNewQuestionForm, setShowNewQuestionForm] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [settingsTab, setSettingsTab] = useState(0);
  const [perspectiveTab, setPerspectiveTab] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [ratingScales, setRatingScales] = useState([]);
  const [reAnalyzing, setReAnalyzing] = useState(false);
  const [reAnalysisResult, setReAnalysisResult] = useState(null);

  // Perspective names and mapping
  const perspectiveMap = {
    manager: { name: 'Manager Assessment', index: 0 },
    peer: { name: 'Peer Assessment', index: 1 },
    direct_report: { name: 'Direct Report Assessment', index: 2 },
    self: { name: 'Self Assessment', index: 3 },
    external: { name: 'External Stakeholder', index: 4 }
  };

  // Get perspective key from index
  const getPerspectiveKeyFromIndex = (index) => {
    return Object.keys(perspectiveMap).find(key => perspectiveMap[key].index === index) || 'peer';
  };

  // Fetch template data
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setLoading(true);
        console.log('Fetching template with ID:', id);
        
        // Use templatesApi instead of axios directly
        const response = await templatesApi.getById(id);
        console.log('Template response:', response.data);
        
        // Make sure perspective is set for all questions
        if (response.data && response.data.questions) {
          response.data.questions = response.data.questions.map(q => ({
            ...q,
            perspective: q.perspective || 'peer' // Default to 'peer' if missing
          }));
        }
        
        // Initialize perspective settings if not present
        if (!response.data.perspectiveSettings) {
          response.data.perspectiveSettings = {
            manager: { questionCount: 10, enabled: true },
            peer: { questionCount: 10, enabled: true },
            direct_report: { questionCount: 10, enabled: true },
            self: { questionCount: 10, enabled: true },
            external: { questionCount: 5, enabled: false }
          };
        }
        
        setTemplate(response.data);
        
        // Setup rating scales
        if (response.data.ratingScales && response.data.ratingScales.length > 0) {
          setRatingScales(response.data.ratingScales);
        } else {
          // Default rating scale if none exists
          setRatingScales([{
            _id: `temp_${Date.now()}`,
            name: 'Default 5-Point Scale',
            minValue: 1,
            maxValue: 5,
            labels: {
              "1": "Poor",
              "2": "Below Expectations",
              "3": "Meets Expectations",
              "4": "Exceeds Expectations",
              "5": "Outstanding"
            },
            defaultForPerspective: 'all'
          }]);
        }
        
        // Extract unique categories
        const uniqueCategories = [...new Set(
          response.data.questions
            .filter(q => q.category)
            .map(q => q.category)
        )];
        setCategories(uniqueCategories);
        
        // Try to set perspective tab based on active perspectives
        const activePerspectives = Object.entries(response.data.perspectiveSettings || {})
          .filter(([, settings]) => settings.enabled)
          .map(([key]) => key);
          
        if (activePerspectives.length > 0) {
          const firstActivePerspective = activePerspectives[0];
          setPerspectiveTab(perspectiveMap[firstActivePerspective]?.index || 0);
        }
      } catch (err) {
        console.error('Error fetching template:', err);
        setError(err.response?.data?.message || 'Failed to load template');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [id]);

  // Handle settings tab changes
  const handleSettingsTabChange = (newValue) => {
    setSettingsTab(newValue);
  };

  // Handle perspective tab changes
  const handlePerspectiveTabChange = (newValue) => {
    setPerspectiveTab(newValue);
    
    // Update newQuestion to use the selected perspective
    const perspectiveKey = getPerspectiveKeyFromIndex(newValue);
    setNewQuestion({
      ...newQuestion,
      perspective: perspectiveKey
    });
  };

  // Get questions filtered by the current perspective
  const getQuestionsForCurrentPerspective = () => {
    if (!template || !template.questions) return [];
    
    const currentPerspective = getPerspectiveKeyFromIndex(perspectiveTab);
    return template.questions.filter(q => q.perspective === currentPerspective);
  };

  // Group questions by category
  const groupQuestionsByCategory = (questions) => {
    const grouped = {};
    
    questions.forEach(question => {
      const category = question.category || 'General';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(question);
    });
    
    // Sort questions by order within each category
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => a.order - b.order);
    });
    
    return grouped;
  };

  // Handle drag and drop reordering
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const currentPerspective = getPerspectiveKeyFromIndex(perspectiveTab);
    const questionsForPerspective = template.questions.filter(q => q.perspective === currentPerspective);
    
    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    
    // Create a new array with the reordered questions
    const reorderedPerspectiveQuestions = [...questionsForPerspective];
    const [reorderedItem] = reorderedPerspectiveQuestions.splice(sourceIndex, 1);
    reorderedPerspectiveQuestions.splice(destIndex, 0, reorderedItem);
    
    // Update order property for the reordered perspective questions
    const updatedPerspectiveQuestions = reorderedPerspectiveQuestions.map((item, index) => ({
      ...item,
      order: index + 1
    }));
    
    // Combine with questions from other perspectives
    const otherQuestions = template.questions.filter(q => q.perspective !== currentPerspective);
    const allUpdatedQuestions = [...otherQuestions, ...updatedPerspectiveQuestions];
    
    setTemplate({
      ...template,
      questions: allUpdatedQuestions
    });
  };

  // Handle editing a question
  const handleEditQuestion = (question) => {
    setEditingQuestion({
      ...question
    });
  };

  // Handle saving edited question
  const handleSaveQuestion = () => {
    const updatedQuestions = template.questions.map(q => 
      q.id === editingQuestion.id ? editingQuestion : q
    );
    
    setTemplate({
      ...template,
      questions: updatedQuestions
    });
    
    setEditingQuestion(null);
  };

  // Handle deleting a question
  const handleDeleteQuestion = (questionId) => {
    const currentPerspective = getPerspectiveKeyFromIndex(perspectiveTab);
    
    // First, filter out the deleted question
    const updatedQuestions = template.questions.filter(q => q.id !== questionId);
    
    // Then, reorder the questions within the current perspective
    const perspectiveQuestions = updatedQuestions.filter(q => q.perspective === currentPerspective);
    const otherQuestions = updatedQuestions.filter(q => q.perspective !== currentPerspective);
    
    const reorderedPerspectiveQuestions = perspectiveQuestions.map((q, index) => ({
      ...q,
      order: index + 1
    }));
    
    setTemplate({
      ...template,
      questions: [...otherQuestions, ...reorderedPerspectiveQuestions]
    });
  };

  // Handle adding a new question
  const handleAddQuestion = () => {
    if (!newQuestion.text.trim()) return;
    
    const currentPerspective = getPerspectiveKeyFromIndex(perspectiveTab);
    const perspectiveQuestions = template.questions.filter(q => q.perspective === currentPerspective);
    
    const questionToAdd = {
      ...newQuestion,
      perspective: currentPerspective,
      _id: `temp_${Date.now()}`, // Temporary ID until saved to backend
      order: perspectiveQuestions.length + 1
    };
    
    setTemplate({
      ...template,
      questions: [...template.questions, questionToAdd]
    });
    
    setNewQuestion({
      text: '',
      type: 'rating',
      category: newQuestion.category, // Keep the same category for convenience
      perspective: currentPerspective,
      required: true
    });
    
    setShowNewQuestionForm(false);
  };

  // Handle adding a new category
  const handleAddCategory = (categoryName) => {
    if (!categoryName.trim()) return;
    if (categories.includes(categoryName)) return;
    
    setCategories([...categories, categoryName]);
  };

  // Handle perspective settings change
  const handlePerspectiveSettingChange = (perspective, field, value) => {
    const updatedSettings = {
      ...template.perspectiveSettings,
      [perspective]: {
        ...template.perspectiveSettings[perspective],
        [field]: value
      }
    };
    
    setTemplate({
      ...template,
      perspectiveSettings: updatedSettings
    });
  };

  // Handle reanalysis button click
  const handleReAnalyze = async () => {
    try {
      setReAnalyzing(true);
      setReAnalysisResult(null);
      
      const response = await api.post(`/templates/${id}/reanalyze`);
      
      setTemplate(response.data.template);
      setReAnalysisResult({
        success: true,
        message: response.data.message
      });
      
    } catch (err) {
      console.error('Re-analysis error:', err);
      setReAnalysisResult({
        success: false,
        message: err.response?.data?.message || 'Failed to re-analyze template'
      });
    } finally {
      setReAnalyzing(false);
    }
  };

  // Handle saving the template
  const handleSaveTemplate = async () => {
    try {
      setSavingTemplate(true);
      console.log('Saving template:', template.id);
      
      // Prepare the rating scales data
      const preparedRatingScales = ratingScales.map(scale => {
        // Remove the _id property if it exists (it's only for temporary frontend use)
        const { _id, ...scaleData } = scale;
        return scaleData;
      });
      
      await templatesApi.update(id, {
        name: template.name,
        description: template.description,
        purpose: template.purpose,
        department: template.department,
        questions: template.questions,
        status: template.status,
        perspectiveSettings: template.perspectiveSettings,
        ratingScales: preparedRatingScales
      });
      
      // Navigate back to templates list
      navigate('/contexthub?tab=2');
    } catch (err) {
      console.error('Error saving template:', err);
      setError(err.response?.data?.message || 'Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };
  
  // Update the handleApproveTemplate function
  const handleApproveTemplate = async () => {
    try {
      setSavingTemplate(true);
      console.log('Approving template:', id);
      
      // Prepare questions data - ensure all questions have the proper format
      const formattedQuestions = template.questions.map(q => {
        // Remove _id property which is only for frontend use
        const { _id, ...questionData } = q;
        return {
          id: q.id,
          text: q.text,
          type: q.type || 'rating',
          category: q.category,
          perspective: q.perspective || 'peer',
          required: q.required !== undefined ? q.required : true,
          order: q.order,
          ratingScaleId: q.ratingScaleId
        };
      });
      
      // Prepare the rating scales data
      const preparedRatingScales = ratingScales.map(scale => {
        // Remove the _id property if it exists (it's only for temporary frontend use)
        const { _id, ...scaleData } = scale;
        return scaleData;
      });
      
      // Use templatesApi instead of direct api call to avoid the double /api/ prefix
      const response = await templatesApi.approve(id, {
        name: template.name,
        description: template.description,
        purpose: template.purpose,
        department: template.department,
        questions: formattedQuestions,
        ratingScales: preparedRatingScales
      });
      
      console.log('Template approved successfully:', response.data);
      
      // Navigate back to templates list
      navigate('/contexthub?tab=2');
    } catch (err) {
      console.error('Error approving template:', err);
      setError(err.response?.data?.message || 'Failed to approve template');
    } finally {
      setSavingTemplate(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading template...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto my-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4" role="alert">
          <p>{error}</p>
        </div>
        <button 
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          onClick={() => navigate('/contexthub?tab=2')}
        >
          Back to Templates
        </button>
      </div>
    );
  }

  // Filter perspectives to only show enabled ones
  const enabledPerspectives = Object.entries(template.perspectiveSettings || {})
    .filter(([, settings]) => settings.enabled)
    .map(([key]) => key);

  // Get active perspectives in order
  const activePerspectives = Object.keys(perspectiveMap)
    .filter(key => enabledPerspectives.includes(key))
    .sort((a, b) => perspectiveMap[a].index - perspectiveMap[b].index);

  return (
    <div className="max-w-4xl mx-auto my-4">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">
          {showSettings ? 'Template Settings' : 'Review Template'}
        </h1>
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
          <div>
            <p className="text-gray-600">
              {template.documentType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Template
            </p>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2
              ${template.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}
            >
              {template.status === 'pending_review' ? 'Pending Review' : 'Approved'}
            </span>
          </div>
          
          <div className="mt-4 sm:mt-0">
            <button 
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 mr-2"
              onClick={() => navigate('/templates')}
            >
              Cancel
            </button>
            
            <button
              className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center inline-flex
                ${(savingTemplate || template.questions.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => setConfirmDialogOpen(true)}
              disabled={savingTemplate || template.questions.length === 0}
            >
              {savingTemplate ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Approve Template
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="border-t border-gray-200 my-4" />
        
        {/* Template Base Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 mb-1">
              Template Name
            </label>
            <input
              id="templateName"
              type="text"
              value={template.name}
              onChange={(e) => setTemplate({ ...template, name: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
              Department / Function
            </label>
            <input
              id="department"
              type="text"
              value={template.department || ''}
              onChange={(e) => setTemplate({ ...template, department: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., Finance, Engineering, Marketing"
            />
          </div>
          
          <div className="md:col-span-2">
            <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-1">
              Template Purpose
            </label>
            <textarea
              id="purpose"
              value={template.purpose || ''}
              onChange={(e) => setTemplate({ ...template, purpose: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., 360 Assessment for Finance Controller Manager"
              rows={2}
            />
          </div>
          
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={template.description || ''}
              onChange={(e) => setTemplate({ ...template, description: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              rows={2}
            />
          </div>
        </div>
        
        {/* Template Actions */}
        <div className="flex justify-between items-center mb-6">
          <button
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4 mr-1" />
            {showSettings ? 'Back to Questions' : 'Template Settings'}
          </button>
          
          {!showSettings && (
            <button
              className={`px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center
                ${reAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleReAnalyze}
              disabled={reAnalyzing}
            >
              {reAnalyzing ? (
                <svg className="animate-spin h-4 w-4 mr-2 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Re-analyze with AI
            </button>
          )}
        </div>
        
        {/* Re-analysis Result Alert */}
        {reAnalysisResult && (
          <div 
            className={`mb-6 p-4 rounded-md flex ${
              reAnalysisResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}
            role="alert"
          >
            <div className="flex-shrink-0">
              {reAnalysisResult.success ? (
                <Check className="h-5 w-5 text-green-400" />
              ) : (
                <X className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm ${reAnalysisResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {reAnalysisResult.message}
              </p>
            </div>
            <button
              className="ml-auto flex-shrink-0 -mx-1.5 -my-1.5 rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2"
              onClick={() => setReAnalysisResult(null)}
            >
              <span className="sr-only">Dismiss</span>
              <X className={`h-4 w-4 ${reAnalysisResult.success ? 'text-green-500' : 'text-red-500'}`} />
            </button>
          </div>
        )}
      </div>
      
      {/* Settings or Questions Content */}
      {showSettings ? (
        /* Settings Content */
        <div className="border border-gray-200 rounded-lg">
          {/* Settings Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  settingsTab === 0
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => handleSettingsTabChange(0)}
              >
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Perspectives
                </div>
              </button>
              <button
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  settingsTab === 1
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => handleSettingsTabChange(1)}
              >
                <div className="flex items-center">
                  <Scale className="h-4 w-4 mr-2" />
                  Rating Scales
                </div>
              </button>
              <button
                className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                  settingsTab === 2
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => handleSettingsTabChange(2)}
              >
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Documents
                </div>
              </button>
            </nav>
          </div>
          
          {/* Settings Tab Panels */}
          {/* Perspectives Tab */}
          <div className={`p-6 ${settingsTab !== 0 ? 'hidden' : ''}`}>
            <h2 className="text-lg font-semibold mb-2">Perspective Settings</h2>
            <p className="text-sm text-gray-500 mb-4">
              Configure which perspectives are included in this assessment and how many questions each should have.
            </p>
            
            <div className="border border-gray-200 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.keys(perspectiveMap).map(perspective => (
                  <div 
                    key={perspective} 
                    className={`border border-gray-200 rounded-lg p-4 ${
                      !template.perspectiveSettings[perspective]?.enabled ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">{perspectiveMap[perspective].name}</h3>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox"
                          className="sr-only peer"
                          checked={template.perspectiveSettings[perspective]?.enabled || false}
                          onChange={(e) => handlePerspectiveSettingChange(
                            perspective, 
                            'enabled', 
                            e.target.checked
                          )}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div>
                      <label htmlFor={`${perspective}-count`} className="block text-sm font-medium text-gray-700 mb-1">
                        Question Count
                      </label>
                      <input
                        id={`${perspective}-count`}
                        type="number"
                        min="0"
                        max="50"
                        value={template.perspectiveSettings[perspective]?.questionCount || 0}
                        onChange={(e) => handlePerspectiveSettingChange(
                          perspective,
                          'questionCount',
                          parseInt(e.target.value) || 0
                        )}
                        disabled={!template.perspectiveSettings[perspective]?.enabled}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                      />
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-2">
                      Current: {template.questions.filter(q => q.perspective === perspective).length} questions
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Rating Scales Tab */}
          <div className={`p-6 ${settingsTab !== 1 ? 'hidden' : ''}`}>
            <RatingScaleEditor
              scales={ratingScales}
              setScales={setRatingScales}
            />
          </div>
          
          {/* Documents Tab */}
          <div className={`p-6 ${settingsTab !== 2 ? 'hidden' : ''}`}>
            <h2 className="text-lg font-semibold mb-2">Source Documents</h2>
            
            {template.sourceDocuments && template.sourceDocuments.length > 0 ? (
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  These documents were used to generate the template questions. You can re-analyze them to generate additional questions.
                </p>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium">
                      Source Documents ({template.sourceDocuments.length})
                    </h3>
                    
                    <button
                      className={`px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center text-sm
                        ${reAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={handleReAnalyze}
                      disabled={reAnalyzing}
                    >
                      {reAnalyzing ? (
                        <svg className="animate-spin h-4 w-4 mr-1 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-1" />
                      )}
                      Re-analyze with AI
                    </button>
                  </div>
                  
                  <div className="border-t border-gray-200 my-2" />
                  
                  {template.lastAnalysisDate && (
                    <p className="text-sm text-gray-500 mb-4">
                      Last analyzed: {new Date(template.lastAnalysisDate).toLocaleString()}
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    {template.sourceDocuments.map((doc, index) => (
                      <div key={doc.id || index} className="border border-gray-200 rounded p-3 flex items-center">
                        <FileText className="h-5 w-5 text-blue-500 mr-2" />
                        <span className="text-sm">
                          {doc.documentId ? `Document ID: ${doc.documentId}` : 'External document'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-6 text-center rounded-lg">
                <p className="text-gray-600 mb-4">
                  No source documents attached to this template.
                </p>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  onClick={() => navigate('/contexthub')}
                >
                  Upload Documents
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Questions Content */
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Questions ({template.questions.length})
            </h2>
            
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              onClick={() => setShowNewQuestionForm(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Question
            </button>
          </div>
          
          {/* Perspective Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-4 overflow-x-auto">
              {activePerspectives.map(perspective => (
                <button
                  key={perspective}
                  className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                    perspectiveTab === perspectiveMap[perspective].index
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } ${!template.perspectiveSettings[perspective]?.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => template.perspectiveSettings[perspective]?.enabled && handlePerspectiveTabChange(perspectiveMap[perspective].index)}
                  disabled={!template.perspectiveSettings[perspective]?.enabled}
                >
                  {perspectiveMap[perspective].name}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Questions for Current Perspective */}
          <div className="mt-4">
            {activePerspectives.map(perspective => {
              const perspectiveIndex = perspectiveMap[perspective].index;
              const filteredQuestions = template.questions.filter(q => q.perspective === perspective);
              const questionsByCategory = groupQuestionsByCategory(filteredQuestions);
              
              return (
                <div key={perspective} className={perspectiveTab !== perspectiveIndex ? 'hidden' : ''}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">
                      {perspectiveMap[perspective].name}
                    </h3>
                    
                    <p className="text-sm text-gray-500">
                      {filteredQuestions.length} questions in this perspective
                    </p>
                  </div>
                  
                  {Object.keys(questionsByCategory).length === 0 ? (
                    <div className="bg-gray-50 p-6 text-center rounded-lg">
                      <p className="text-gray-600 mb-4">
                        No questions defined for this perspective yet.
                      </p>
                      <button
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center mx-auto"
                        onClick={() => {
                          setNewQuestion({
                            ...newQuestion,
                            perspective: perspective
                          });
                          setShowNewQuestionForm(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add First Question
                      </button>
                    </div>
                  ) : (
                    Object.entries(questionsByCategory).map(([category, categoryQuestions]) => (
                      <div key={category} className="mb-6">
                        <div className="flex items-center mb-2">
                          <h4 className="font-semibold text-gray-700">
                            {category}
                          </h4>
                          <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {categoryQuestions.length} questions
                          </span>
                        </div>
                        
                        <DragDropContext onDragEnd={handleDragEnd}>
                          <Droppable droppableId={`${perspective}-${category}`}>
                            {(provided) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="space-y-3"
                              >
                                {categoryQuestions.map((question, index) => (
                                  <Draggable
                                    key={question.id || question._id}
                                    draggableId={question.id || question._id}
                                    index={index}
                                  >
                                    {(provided) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
                                      >
                                        {editingQuestion && (editingQuestion.id === question.id || editingQuestion._id === question._id) ? (
                                          // Edit mode
                                          <div>
                                            <div className="mb-4">
                                              <label htmlFor="questionText" className="block text-sm font-medium text-gray-700 mb-1">
                                                Question Text
                                              </label>
                                              <textarea
                                                id="questionText"
                                                value={editingQuestion.text}
                                                onChange={(e) => setEditingQuestion({
                                                  ...editingQuestion,
                                                  text: e.target.value
                                                })}
                                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                rows={2}
                                              />
                                            </div>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                              <div>
                                                <label htmlFor="questionType" className="block text-sm font-medium text-gray-700 mb-1">
                                                  Question Type
                                                </label>
                                                <select
                                                  id="questionType"
                                                  value={editingQuestion.type}
                                                  onChange={(e) => setEditingQuestion({
                                                    ...editingQuestion,
                                                    type: e.target.value
                                                  })}
                                                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                >
                                                  <option value="rating">Rating Scale</option>
                                                  <option value="open_ended">Open Ended</option>
                                                  <option value="multiple_choice">Multiple Choice</option>
                                                </select>
                                              </div>
                                              
                                              <div>
                                                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                                                  Category
                                                </label>
                                                <select
                                                  id="category"
                                                  value={editingQuestion.category || ''}
                                                  onChange={(e) => {
                                                    const categoryValue = e.target.value;
                                                    setEditingQuestion({
                                                      ...editingQuestion,
                                                      category: categoryValue
                                                    });
                                                    
                                                    if (categoryValue && !categories.includes(categoryValue)) {
                                                      handleAddCategory(categoryValue);
                                                    }
                                                  }}
                                                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                >
                                                  <option value="">None</option>
                                                  {categories.map((cat) => (
                                                    <option key={cat} value={cat}>
                                                      {cat}
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>
                                              
                                              {editingQuestion.type === 'rating' && ratingScales.length > 0 && (
                                                <div>
                                                  <label htmlFor="ratingScale" className="block text-sm font-medium text-gray-700 mb-1">
                                                    Rating Scale
                                                  </label>
                                                  <select
                                                    id="ratingScale"
                                                    value={editingQuestion.ratingScaleId || ''}
                                                    onChange={(e) => setEditingQuestion({
                                                      ...editingQuestion,
                                                      ratingScaleId: e.target.value
                                                    })}
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                  >
                                                    <option value="">Default for Perspective</option>
                                                    {ratingScales.map((scale) => (
                                                      <option key={scale.id || scale._id} value={scale.id || scale._id}>
                                                        {scale.name}
                                                      </option>
                                                    ))}
                                                  </select>
                                                </div>
                                              )}
                                              
                                              <div className="flex items-center">
                                                <label className="relative inline-flex items-center cursor-pointer mt-5">
                                                  <input 
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={editingQuestion.required}
                                                    onChange={(e) => setEditingQuestion({
                                                      ...editingQuestion,
                                                      required: e.target.checked
                                                    })}
                                                  />
                                                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                                  <span className="ml-2 text-sm font-medium text-gray-900">Required</span>
                                                </label>
                                              </div>
                                            </div>
                                            
                                            <div className="flex justify-end mt-4">
                                              <button
                                                className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 mr-2"
                                                onClick={() => setEditingQuestion(null)}
                                              >
                                                Cancel
                                              </button>
                                              <button
                                                className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                                                onClick={handleSaveQuestion}
                                              >
                                                <Save className="h-4 w-4 mr-1" />
                                                Save
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          // View mode
                                          <div>
                                            <div className="flex justify-between">
                                              <div className="flex-1">
                                                <p className="text-gray-900 font-medium mb-2">
                                                  {question.text}
                                                </p>
                                                
                                                <div className="flex flex-wrap gap-2">
                                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                                    ${question.type === 'rating' ? 'bg-blue-100 text-blue-800' : 
                                                      question.type === 'open_ended' ? 'bg-green-100 text-green-800' : 
                                                      'bg-purple-100 text-purple-800'}`}
                                                  >
                                                    {question.type === 'rating' ? 'Rating Scale' : 
                                                     question.type === 'open_ended' ? 'Open Ended' : 
                                                     'Multiple Choice'}
                                                  </span>
                                                  
                                                  {question.category && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                      {question.category}
                                                    </span>
                                                  )}
                                                  
                                                  {question.required && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                                      Required
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              
                                              <div className="ml-4 flex-shrink-0">
                                                <button
                                                  className="text-gray-400 hover:text-blue-600 p-1"
                                                  onClick={() => handleEditQuestion(question)}
                                                >
                                                  <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                  className="text-gray-400 hover:text-red-600 p-1"
                                                  onClick={() => handleDeleteQuestion(question.id || question._id)}
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </DragDropContext>
                      </div>
                    ))
                  )}
                  
                  {/* Add Question Button for Non-Empty Perspective */}
                  {Object.keys(questionsByCategory).length > 0 && (
                    <div className="mt-6 text-center">
                      <button
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center mx-auto"
                        onClick={() => {
                          setNewQuestion({
                            ...newQuestion,
                            perspective: perspective
                          });
                          setShowNewQuestionForm(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Another Question
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* New Question Form */}
          {showNewQuestionForm && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <div className="border-l-4 border-green-500 pl-4 py-1 mb-4">
                <h3 className="text-lg font-medium">
                  Add New Question
                </h3>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="mb-4">
                  <label htmlFor="newQuestionText" className="block text-sm font-medium text-gray-700 mb-1">
                    Question Text <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="newQuestionText"
                    value={newQuestion.text}
                    onChange={(e) => setNewQuestion({
                      ...newQuestion,
                      text: e.target.value
                    })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    rows={2}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label htmlFor="newQuestionType" className="block text-sm font-medium text-gray-700 mb-1">
                      Question Type
                    </label>
                    <select
                      id="newQuestionType"
                      value={newQuestion.type}
                      onChange={(e) => setNewQuestion({
                        ...newQuestion,
                        type: e.target.value
                      })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="rating">Rating Scale</option>
                      <option value="open_ended">Open Ended</option>
                      <option value="multiple_choice">Multiple Choice</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="newQuestionPerspective" className="block text-sm font-medium text-gray-700 mb-1">
                      Perspective
                    </label>
                    <select
                      id="newQuestionPerspective"
                      value={newQuestion.perspective}
                      onChange={(e) => setNewQuestion({
                        ...newQuestion,
                        perspective: e.target.value
                      })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-gray-100"
                      disabled // Perspective is determined by current tab
                    >
                      {Object.keys(perspectiveMap).map(perspective => (
                        <option key={perspective} value={perspective}>
                          {perspectiveMap[perspective].name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="newCategory" className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      id="newCategory"
                      value={newQuestion.category}
                      onChange={(e) => {
                        const categoryValue = e.target.value;
                        setNewQuestion({
                          ...newQuestion,
                          category: categoryValue
                        });
                        
                        if (categoryValue && !categories.includes(categoryValue)) {
                          handleAddCategory(categoryValue);
                        }
                      }}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">None</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {newQuestion.type === 'rating' && ratingScales.length > 0 && (
                    <div>
                      <label htmlFor="newRatingScale" className="block text-sm font-medium text-gray-700 mb-1">
                        Rating Scale
                      </label>
                      <select
                        id="newRatingScale"
                        value={newQuestion.ratingScaleId || ''}
                        onChange={(e) => setNewQuestion({
                          ...newQuestion,
                          ratingScaleId: e.target.value
                        })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Default for Perspective</option>
                        {ratingScales.map((scale) => (
                          <option key={scale.id || scale._id} value={scale.id || scale._id}>
                            {scale.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <label className="relative inline-flex items-center cursor-pointer mt-5">
                      <input 
                        type="checkbox"
                        className="sr-only peer"
                        checked={newQuestion.required}
                        onChange={(e) => setNewQuestion({
                          ...newQuestion,
                          required: e.target.checked
                        })}
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ml-2 text-sm font-medium text-gray-900">Required</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end mt-4">
                  <button
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 mr-2"
                    onClick={() => setShowNewQuestionForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className={`px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center
                      ${!newQuestion.text.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={handleAddQuestion}
                    disabled={!newQuestion.text.trim()}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Question
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Floating action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex justify-between z-10">
        <button
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          onClick={() => navigate('/templates')}
        >
          Cancel
        </button>
        
        <div>
          <button
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 mr-2"
            onClick={handleSaveTemplate}
            disabled={savingTemplate}
          >
            Save Draft
          </button>
          
          <button
            className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center inline-flex
              ${(savingTemplate || template.questions.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => setConfirmDialogOpen(true)}
            disabled={savingTemplate || template.questions.length === 0}
          >
            {savingTemplate ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Approve Template
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Confirmation Dialog */}
      {confirmDialogOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setConfirmDialogOpen(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
  
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
  
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Approve Template</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to approve this template? Once approved, it will be available for use in feedback cycles.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleApproveTemplate}
                >
                  Approve
                </button>
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setConfirmDialogOpen(false)}
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

export default TemplateReview;