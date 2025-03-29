import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { templatesApi } from '../../services/api';
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
  Alert,
  Tooltip,
  FormControl,
  InputLabel,
  FormHelperText,
  LinearProgress,
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  Save,
  ArrowUpward,
  ArrowDownward,
  Check,
  Close,
  Launch,
  Refresh,
  Settings,
  Description,
  Scale,
  People,
  Help,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

// TabPanel component for perspective tabs
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`perspective-tabpanel-${index}`}
      aria-labelledby={`perspective-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
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
    <Box>
      {!editMode ? (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Rating Scales</Typography>
            <Button 
              variant="contained" 
              startIcon={<Add />}
              onClick={handleCreateScale}
            >
              Add Scale
            </Button>
          </Box>
          
          {scales.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
              <Typography variant="body1" gutterBottom>
                No rating scales defined yet.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreateScale}
              >
                Create Default Scale
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {scales.map(scale => (
                <Grid item xs={12} md={6} key={scale.id}>
                  <Paper sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1">{scale.name}</Typography>
                      <Box>
                        <IconButton size="small" onClick={() => handleEditScale(scale)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error" 
                          onClick={() => handleDeleteScale(scale.id)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Scale: {scale.minValue} to {scale.maxValue}
                    </Typography>
                    
                    <Box sx={{ mt: 1 }}>
                      {scale.defaultForPerspective && (
                        <Chip 
                          size="small" 
                          label={scale.defaultForPerspective === 'all' 
                            ? 'Default for All Perspectives' 
                            : `Default for ${scale.defaultForPerspective.charAt(0).toUpperCase() + scale.defaultForPerspective.slice(1)} Perspective`} 
                          color="primary" 
                          variant="outlined"
                        />
                      )}
                    </Box>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Typography variant="body2" color="text.secondary">
                      Rating Labels:
                    </Typography>
                    
                    <Box sx={{ mt: 1 }}>
                      {scale.labels && Object.entries(scale.labels).map(([value, label]) => (
                        <Box key={value} sx={{ display: 'flex', mb: 0.5 }}>
                          <Chip size="small" label={value} sx={{ mr: 1, minWidth: '30px' }} />
                          <Typography variant="body2">{label}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      ) : (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {currentScale.id ? 'Edit Rating Scale' : 'Create New Rating Scale'}
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Scale Name"
                value={currentScale.name}
                onChange={(e) => setCurrentScale({...currentScale, name: e.target.value})}
                fullWidth
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Minimum Value"
                type="number"
                value={currentScale.minValue}
                onChange={(e) => {
                  const minValue = parseInt(e.target.value);
                  setCurrentScale({...currentScale, minValue});
                }}
                fullWidth
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Maximum Value"
                type="number"
                value={currentScale.maxValue}
                onChange={(e) => {
                  const maxValue = parseInt(e.target.value);
                  setCurrentScale({...currentScale, maxValue});
                }}
                fullWidth
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Default For Perspective</InputLabel>
                <Select
                  value={currentScale.defaultForPerspective || 'all'}
                  onChange={(e) => setCurrentScale({...currentScale, defaultForPerspective: e.target.value})}
                  label="Default For Perspective"
                >
                  <MenuItem value="all">All Perspectives</MenuItem>
                  <MenuItem value="manager">Manager Perspective</MenuItem>
                  <MenuItem value="peer">Peer Perspective</MenuItem>
                  <MenuItem value="direct_report">Direct Report Perspective</MenuItem>
                  <MenuItem value="self">Self Assessment</MenuItem>
                  <MenuItem value="external">External Stakeholder</MenuItem>
                </Select>
                <FormHelperText>
                  This scale will be the default for questions in the selected perspective
                </FormHelperText>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Rating Labels
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                {Array.from({ length: currentScale.maxValue - currentScale.minValue + 1 }).map((_, i) => {
                  const value = currentScale.minValue + i;
                  return (
                    <Box key={value} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Chip label={value} sx={{ mr: 2, minWidth: '40px' }} />
                      <TextField
                        label={`Label for ${value}`}
                        value={currentScale.labels?.[value] || ''}
                        onChange={(e) => handleLabelChange(value, e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Box>
                  );
                })}
              </Paper>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="outlined" 
              onClick={() => {
                setEditMode(false);
                setCurrentScale(null);
                if (onCancel) onCancel();
              }}
              sx={{ mr: 2 }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleSaveScale}
              startIcon={<Save />}
            >
              Save Scale
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
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
  const handleSettingsTabChange = (event, newValue) => {
    setSettingsTab(newValue);
  };

  // Handle perspective tab changes
  const handlePerspectiveTabChange = (event, newValue) => {
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
      <Container sx={{ my: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading template...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ my: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          variant="outlined" 
          sx={{ mt: 2 }}
          onClick={() => navigate('/contexthub?tab=2')}
        >
          Back to Templates
        </Button>
      </Container>
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
    <Container maxWidth="lg" sx={{ my: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {showSettings ? 'Template Settings' : 'Review Template'}
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="subtitle1" color="text.secondary">
              {template.documentType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Template
            </Typography>
            <Chip 
              label={template.status === 'pending_review' ? 'Pending Review' : 'Approved'} 
              color={template.status === 'pending_review' ? 'warning' : 'success'}
              size="small"
              sx={{ mt: 1 }}
            />
          </Box>
          
          <Box>
            <Button 
              variant="outlined" 
              sx={{ mr: 2 }}
              onClick={() => navigate('/contexthub?tab=2')}
            >
              Cancel
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              onClick={() => setConfirmDialogOpen(true)}
              disabled={savingTemplate || template.questions.length === 0}
              startIcon={savingTemplate ? <CircularProgress size={20} /> : <Check />}
            >
              Approve Template
            </Button>
          </Box>
        </Box>
        
        <Divider sx={{ mb: 4 }} />
        
        {/* Template Base Info */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Template Name"
              value={template.name}
              onChange={(e) => setTemplate({ ...template, name: e.target.value })}
              fullWidth
              sx={{ mb: 2 }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              label="Department / Function"
              value={template.department || ''}
              onChange={(e) => setTemplate({ ...template, department: e.target.value })}
              fullWidth
              sx={{ mb: 2 }}
              placeholder="e.g., Finance, Engineering, Marketing"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              label="Template Purpose"
              value={template.purpose || ''}
              onChange={(e) => setTemplate({ ...template, purpose: e.target.value })}
              fullWidth
              sx={{ mb: 2 }}
              placeholder="e.g., 360 Assessment for Finance Controller Manager"
              multiline
              rows={2}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              label="Description"
              value={template.description || ''}
              onChange={(e) => setTemplate({ ...template, description: e.target.value })}
              fullWidth
              sx={{ mb: 3 }}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
        
        {/* Template Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, mb: 4 }}>
          <Button
            variant="outlined"
            startIcon={<Settings />}
            onClick={() => setShowSettings(!showSettings)}
          >
            {showSettings ? 'Back to Questions' : 'Template Settings'}
          </Button>
          
          {!showSettings && (
            <Button
              variant="outlined"
              startIcon={reAnalyzing ? <CircularProgress size={20} /> : <Refresh />}
              onClick={handleReAnalyze}
              disabled={reAnalyzing}
            >
              Re-analyze with AI
            </Button>
          )}
        </Box>
        
        {/* Re-analysis Result Alert */}
        {reAnalysisResult && (
          <Alert 
            severity={reAnalysisResult.success ? 'success' : 'error'} 
            sx={{ mb: 3 }}
            onClose={() => setReAnalysisResult(null)}
          >
            {reAnalysisResult.message}
          </Alert>
        )}
      </Box>
      
      {showSettings ? (
        /* Settings Content */
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={settingsTab} 
              onChange={handleSettingsTabChange}
              aria-label="template settings tabs"
            >
              <Tab icon={<People />} label="Perspectives" />
              <Tab icon={<Scale />} label="Rating Scales" />
              <Tab icon={<Description />} label="Documents" />
            </Tabs>
          </Box>
          
          {/* Perspectives Tab */}
          <TabPanel value={settingsTab} index={0}>
            <Typography variant="h6" gutterBottom>
              Perspective Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Configure which perspectives are included in this assessment and how many questions each should have.
            </Typography>
            
            <Paper sx={{ p: 3, mb: 3 }}>
              <Grid container spacing={3}>
                {Object.keys(perspectiveMap).map(perspective => (
                  <Grid item xs={12} sm={6} md={4} key={perspective}>
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        opacity: template.perspectiveSettings[perspective]?.enabled ? 1 : 0.6 
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1">
                          {perspectiveMap[perspective].name}
                        </Typography>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={template.perspectiveSettings[perspective]?.enabled || false}
                              onChange={(e) => handlePerspectiveSettingChange(
                                perspective, 
                                'enabled', 
                                e.target.checked
                              )}
                              size="small"
                            />
                          }
                          label=""
                        />
                      </Box>
                      
                      <TextField
                        label="Question Count"
                        type="number"
                        value={template.perspectiveSettings[perspective]?.questionCount || 0}
                        onChange={(e) => handlePerspectiveSettingChange(
                          perspective,
                          'questionCount',
                          parseInt(e.target.value) || 0
                        )}
                        disabled={!template.perspectiveSettings[perspective]?.enabled}
                        fullWidth
                        size="small"
                        margin="dense"
                        InputProps={{ inputProps: { min: 0, max: 50 } }}
                      />
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Current: {template.questions.filter(q => q.perspective === perspective).length} questions
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </TabPanel>
          
          {/* Rating Scales Tab */}
          <TabPanel value={settingsTab} index={1}>
            <RatingScaleEditor
              scales={ratingScales}
              setScales={setRatingScales}
            />
          </TabPanel>
          
          {/* Documents Tab */}
          <TabPanel value={settingsTab} index={2}>
            <Typography variant="h6" gutterBottom>
              Source Documents
            </Typography>
            
            {template.sourceDocuments && template.sourceDocuments.length > 0 ? (
              <Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  These documents were used to generate the template questions. You can re-analyze them to generate additional questions.
                </Typography>
                
                <Paper sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1">
                      Source Documents ({template.sourceDocuments.length})
                    </Typography>
                    
                    <Button
                      variant="outlined"
                      startIcon={reAnalyzing ? <CircularProgress size={20} /> : <Refresh />}
                      onClick={handleReAnalyze}
                      disabled={reAnalyzing}
                    >
                      Re-analyze with AI
                    </Button>
                  </Box>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  {template.lastAnalysisDate && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Last analyzed: {new Date(template.lastAnalysisDate).toLocaleString()}
                    </Typography>
                  )}
                  
                  <Grid container spacing={2}>
                    {template.sourceDocuments.map((doc, index) => (
                      <Grid item xs={12} key={doc.id || index}>
                        <Paper variant="outlined" sx={{ p: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Description color="primary" sx={{ mr: 1.5 }} />
                            <Typography variant="body2">
                              {doc.documentId ? `Document ID: ${doc.documentId}` : 'External document'}
                            </Typography>
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Box>
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  No source documents attached to this template.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => navigate('/contexthub?tab=0')}
                >
                  Upload Documents
                </Button>
              </Paper>
            )}
          </TabPanel>
        </Box>
      ) : (
        /* Questions Content */
        <Box sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h5" component="h2">
              Questions ({template.questions.length})
            </Typography>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={() => setShowNewQuestionForm(true)}
            >
              Add Question
            </Button>
          </Box>
          
          {/* Perspective Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs 
              value={perspectiveTab} 
              onChange={handlePerspectiveTabChange}
              aria-label="perspective tabs"
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
            >
              {activePerspectives.map(perspective => (
                <Tab 
                  key={perspective}
                  label={perspectiveMap[perspective].name} 
                  value={perspectiveMap[perspective].index}
                  disabled={!template.perspectiveSettings[perspective]?.enabled}
                />
              ))}
            </Tabs>
          </Box>
          
          {/* Questions for Current Perspective */}
          <Box sx={{ mt: 3 }}>
            {activePerspectives.map(perspective => {
              const perspectiveIndex = perspectiveMap[perspective].index;
              const filteredQuestions = template.questions.filter(q => q.perspective === perspective);
              const questionsByCategory = groupQuestionsByCategory(filteredQuestions);
              
              return (
                <TabPanel key={perspective} value={perspectiveTab} index={perspectiveIndex}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6">
                      {perspectiveMap[perspective].name}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary">
                      {filteredQuestions.length} questions in this perspective
                    </Typography>
                  </Box>
                  
                  {Object.keys(questionsByCategory).length === 0 ? (
                    <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        No questions defined for this perspective yet.
                      </Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Add />}
                        onClick={() => {
                          setNewQuestion({
                            ...newQuestion,
                            perspective: perspective
                          });
                          setShowNewQuestionForm(true);
                        }}
                      >
                        Add First Question
                      </Button>
                    </Paper>
                  ) : (
                    Object.entries(questionsByCategory).map(([category, categoryQuestions]) => (
                      <Box key={category} sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ 
                          mb: 1, 
                          fontWeight: 'bold',
                          color: 'text.secondary',
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          {category}
                          <Chip 
                            label={`${categoryQuestions.length} questions`} 
                            size="small" 
                            sx={{ ml: 1 }}
                            variant="outlined"
                          />
                        </Typography>
                        
                        <DragDropContext onDragEnd={handleDragEnd}>
                          <Droppable droppableId={`${perspective}-${category}`}>
                            {(provided) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                              >
                                {categoryQuestions.map((question, index) => (
                                  <Draggable
                                    key={question.id || question._id}
                                    draggableId={question.id || question._id}
                                    index={index}
                                  >
                                    {(provided) => (
                                      <Paper
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        elevation={1}
                                        sx={{ mb: 2, p: 2 }}
                                      >
                                        {editingQuestion && (editingQuestion.id === question.id || editingQuestion._id === question._id) ? (
                                          // Edit mode
                                          <Box>
                                            <TextField
                                              label="Question Text"
                                              value={editingQuestion.text}
                                              onChange={(e) => setEditingQuestion({
                                                ...editingQuestion,
                                                text: e.target.value
                                              })}
                                              fullWidth
                                              multiline
                                              rows={2}
                                              sx={{ mb: 2 }}
                                            />
                                            
                                            <Grid container spacing={2}>
                                              <Grid item xs={12} sm={3}>
                                                <TextField
                                                  select
                                                  label="Question Type"
                                                  value={editingQuestion.type}
                                                  onChange={(e) => setEditingQuestion({
                                                    ...editingQuestion,
                                                    type: e.target.value
                                                  })}
                                                  fullWidth
                                                >
                                                  <MenuItem value="rating">Rating Scale</MenuItem>
                                                  <MenuItem value="open_ended">Open Ended</MenuItem>
                                                  <MenuItem value="multiple_choice">Multiple Choice</MenuItem>
                                                </TextField>
                                              </Grid>
                                              
                                              <Grid item xs={12} sm={4}>
                                                <TextField
                                                  label="Category"
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
                                                  select={categories.length > 0}
                                                  fullWidth
                                                >
                                                  {categories.map((category) => (
                                                    <MenuItem key={category} value={category}>
                                                      {category}
                                                    </MenuItem>
                                                  ))}
                                                  {categories.length > 0 && (
                                                    <MenuItem value="">
                                                      <em>None</em>
                                                    </MenuItem>
                                                  )}
                                                </TextField>
                                              </Grid>
                                              
                                              {editingQuestion.type === 'rating' && ratingScales.length > 0 && (
                                                <Grid item xs={12} sm={3}>
                                                  <TextField
                                                    select
                                                    label="Rating Scale"
                                                    value={editingQuestion.ratingScaleId || ''}
                                                    onChange={(e) => setEditingQuestion({
                                                      ...editingQuestion,
                                                      ratingScaleId: e.target.value
                                                    })}
                                                    fullWidth
                                                  >
                                                    {ratingScales.map((scale) => (
                                                      <MenuItem key={scale.id || scale._id} value={scale.id || scale._id}>
                                                        {scale.name}
                                                      </MenuItem>
                                                    ))}
                                                    <MenuItem value="">
                                                      <em>Default for Perspective</em>
                                                    </MenuItem>
                                                  </TextField>
                                                </Grid>
                                              )}
                                              
                                              <Grid item xs={12} sm={2}>
                                                <FormControlLabel
                                                  control={
                                                    <Switch
                                                      checked={editingQuestion.required}
                                                      onChange={(e) => setEditingQuestion({
                                                        ...editingQuestion,
                                                        required: e.target.checked
                                                      })}
                                                    />
                                                  }
                                                  label="Required"
                                                />
                                              </Grid>
                                            </Grid>
                                            
                                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                              <Button
                                                variant="outlined"
                                                onClick={() => setEditingQuestion(null)}
                                                sx={{ mr: 2 }}
                                              >
                                                Cancel
                                              </Button>
                                              <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={handleSaveQuestion}
                                                startIcon={<Save />}
                                              >
                                                Save
                                              </Button>
                                            </Box>
                                          </Box>
                                        ) : (
                                          // View mode
                                          <Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <Box sx={{ flex: 1 }}>
                                                <Typography variant="subtitle1" component="div">
                                                  {question.text}
                                                </Typography>
                                                
                                                <Box sx={{ display: 'flex', mt: 1 }}>
                                                  <Chip
                                                    label={question.type === 'rating' ? 'Rating Scale' : 
                                                          question.type === 'open_ended' ? 'Open Ended' : 
                                                          'Multiple Choice'}
                                                    size="small"
                                                    color={question.type === 'rating' ? 'primary' : 
                                                          question.type === 'open_ended' ? 'success' : 
                                                          'secondary'}
                                                    sx={{ mr: 1 }}
                                                  />
                                                  
                                                  {question.category && (
                                                    <Chip
                                                      label={question.category}
                                                      size="small"
                                                      variant="outlined"
                                                      sx={{ mr: 1 }}
                                                    />
                                                  )}
                                                  
                                                  {question.required && (
                                                    <Chip
                                                      label="Required"
                                                      size="small"
                                                      variant="outlined"
                                                      color="error"
                                                    />
                                                  )}
                                                </Box>
                                              </Box>
                                              
                                              <Box>
                                                <IconButton
                                                  color="primary"
                                                  onClick={() => handleEditQuestion(question)}
                                                  size="small"
                                                >
                                                  <Edit />
                                                </IconButton>
                                                <IconButton
                                                  color="error"
                                                  onClick={() => handleDeleteQuestion(question.id || question._id)}
                                                  size="small"
                                                >
                                                  <Delete />
                                                </IconButton>
                                              </Box>
                                            </Box>
                                          </Box>
                                        )}
                                      </Paper>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </DragDropContext>
                      </Box>
                    ))
                  )}
                  
                  {/* Add Question Button for Empty Perspective */}
                  {Object.keys(questionsByCategory).length > 0 && (
                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                      <Button
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={() => {
                          setNewQuestion({
                            ...newQuestion,
                            perspective: perspective
                          });
                          setShowNewQuestionForm(true);
                        }}
                      >
                        Add Another Question
                      </Button>
                    </Box>
                  )}
                </TabPanel>
              );
            })}
          </Box>
          
          {/* New Question Form */}
          {showNewQuestionForm && (
            <Paper elevation={1} sx={{ mb: 4, p: 2, borderLeft: '4px solid #4caf50' }}>
              <Typography variant="subtitle1" component="div" sx={{ mb: 2 }}>
                Add New Question
              </Typography>
              
              <TextField
                label="Question Text"
                value={newQuestion.text}
                onChange={(e) => setNewQuestion({
                  ...newQuestion,
                  text: e.target.value
                })}
                fullWidth
                multiline
                rows={2}
                sx={{ mb: 2 }}
              />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={3}>
                  <TextField
                    select
                    label="Question Type"
                    value={newQuestion.type}
                    onChange={(e) => setNewQuestion({
                      ...newQuestion,
                      type: e.target.value
                    })}
                    fullWidth
                  >
                    <MenuItem value="rating">Rating Scale</MenuItem>
                    <MenuItem value="open_ended">Open Ended</MenuItem>
                    <MenuItem value="multiple_choice">Multiple Choice</MenuItem>
                  </TextField>
                </Grid>
                
                <Grid item xs={12} sm={3}>
                  <TextField
                    select
                    label="Perspective"
                    value={newQuestion.perspective}
                    onChange={(e) => setNewQuestion({
                      ...newQuestion,
                      perspective: e.target.value
                    })}
                    fullWidth
                    disabled // Perspective is determined by current tab
                  >
                    {Object.keys(perspectiveMap).map(perspective => (
                      <MenuItem key={perspective} value={perspective}>
                        {perspectiveMap[perspective].name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Category"
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
                    select={categories.length > 0}
                    fullWidth
                  >
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                    {categories.length > 0 && (
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                    )}
                  </TextField>
                </Grid>
                
                {newQuestion.type === 'rating' && ratingScales.length > 0 && (
                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      label="Rating Scale"
                      value={newQuestion.ratingScaleId || ''}
                      onChange={(e) => setNewQuestion({
                        ...newQuestion,
                        ratingScaleId: e.target.value
                      })}
                      fullWidth
                    >
                      {ratingScales.map((scale) => (
                        <MenuItem key={scale.id || scale._id} value={scale.id || scale._id}>
                          {scale.name}
                        </MenuItem>
                      ))}
                      <MenuItem value="">
                        <em>Default for Perspective</em>
                      </MenuItem>
                    </TextField>
                  </Grid>
                )}
                
                <Grid item xs={12} sm={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={newQuestion.required}
                        onChange={(e) => setNewQuestion({
                          ...newQuestion,
                          required: e.target.checked
                        })}
                      />
                    }
                    label="Required"
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => setShowNewQuestionForm(false)}
                  sx={{ mr: 2 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAddQuestion}
                  disabled={!newQuestion.text.trim()}
                  startIcon={<Add />}
                >
                  Add Question
                </Button>
              </Box>
            </Paper>
          )}
        </Box>
      )}
      
      {/* Floating action bar */}
      <Paper
        elevation={3}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          p: 2,
          backgroundColor: 'background.paper',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'space-between'
        }}
      >
        <Button
          variant="outlined"
          onClick={() => navigate('/contexthub?tab=2')}
        >
          Cancel
        </Button>
        
        <Box>
          <Button
            variant="outlined"
            sx={{ mr: 2 }}
            onClick={handleSaveTemplate}
            disabled={savingTemplate}
          >
            Save Draft
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            onClick={() => setConfirmDialogOpen(true)}
            disabled={savingTemplate || template.questions.length === 0}
            startIcon={savingTemplate ? <CircularProgress size={20} /> : <Check />}
          >
            Approve Template
          </Button>
        </Box>
      </Paper>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Approve Template</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to approve this template? Once approved, it will be available for use in feedback cycles.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleApproveTemplate} color="primary" autoFocus>
            Approve
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TemplateReview;