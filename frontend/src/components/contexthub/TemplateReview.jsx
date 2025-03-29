import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
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
  TextField,
  Typography,
  Alert,
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
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

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
    required: true,
  });
  const [showNewQuestionForm, setShowNewQuestionForm] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [categories, setCategories] = useState([]);

  // Fetch template data
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/templates/${id}`);
        setTemplate(response.data);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(
          response.data.questions
            .filter(q => q.category)
            .map(q => q.category)
        )];
        setCategories(uniqueCategories);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load template');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [id]);

  // Handle drag and drop reordering
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(template.questions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update order property
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index + 1
    }));
    
    setTemplate({
      ...template,
      questions: updatedItems
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
      q._id === editingQuestion._id ? editingQuestion : q
    );
    
    setTemplate({
      ...template,
      questions: updatedQuestions
    });
    
    setEditingQuestion(null);
  };

  // Handle deleting a question
  const handleDeleteQuestion = (questionId) => {
    const updatedQuestions = template.questions.filter(q => q._id !== questionId);
    
    // Reorder remaining questions
    const reorderedQuestions = updatedQuestions.map((q, index) => ({
      ...q,
      order: index + 1
    }));
    
    setTemplate({
      ...template,
      questions: reorderedQuestions
    });
  };

  // Handle adding a new question
  const handleAddQuestion = () => {
    if (!newQuestion.text.trim()) return;
    
    const questionToAdd = {
      ...newQuestion,
      _id: `temp_${Date.now()}`, // Temporary ID until saved to backend
      order: template.questions.length + 1
    };
    
    setTemplate({
      ...template,
      questions: [...template.questions, questionToAdd]
    });
    
    setNewQuestion({
      text: '',
      type: 'rating',
      category: newQuestion.category, // Keep the same category for convenience
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

  // Handle saving the template
  const handleSaveTemplate = async () => {
    try {
      setSavingTemplate(true);
      
      await axios.put(`/api/templates/${id}`, {
        name: template.name,
        description: template.description,
        questions: template.questions,
        status: template.status
      });
      
      // Navigate back to templates list
      navigate('/contexthub/templates');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Handle approving the template
  const handleApproveTemplate = async () => {
    try {
      setSavingTemplate(true);
      
      await axios.put(`/api/templates/${id}/approve`, {
        name: template.name,
        description: template.description,
        questions: template.questions
      });
      
      // Navigate back to templates list
      navigate('/contexthub/templates');
    } catch (err) {
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
          onClick={() => navigate('/contexthub/templates')}
        >
          Back to Templates
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ my: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Review Template
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="subtitle1" color="text.secondary">
              Generated from {template.documentType.replace('_', ' ')} documents
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
              onClick={() => navigate('/contexthub/templates')}
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
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Template Name"
              value={template.name}
              onChange={(e) => setTemplate({ ...template, name: e.target.value })}
              fullWidth
              sx={{ mb: 3 }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              label="Description"
              value={template.description || ''}
              onChange={(e) => setTemplate({ ...template, description: e.target.value })}
              fullWidth
              sx={{ mb: 3 }}
            />
          </Grid>
        </Grid>
      </Box>
      
      <Box sx={{ mb: 4 }}>
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
        
        {/* Questions List */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="questions">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {template.questions.map((question, index) => (
                  <Draggable
                    key={question._id}
                    draggableId={question._id}
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
                        {editingQuestion && editingQuestion._id === question._id ? (
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
                              <Grid item xs={12} sm={4}>
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
                              
                              <Grid item xs={12} sm={6}>
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
                                  onClick={() => handleDeleteQuestion(question._id)}
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
        
        {/* New Question Form */}
        {showNewQuestionForm && (
          <Paper elevation={1} sx={{ mb: 2, p: 2, borderLeft: '4px solid #4caf50' }}>
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
              <Grid item xs={12} sm={4}>
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
              
              <Grid item xs={12} sm={6}>
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
        
        {template.questions.length === 0 && !showNewQuestionForm && (
          <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              No questions have been added to this template yet.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={() => setShowNewQuestionForm(true)}
            >
              Add Your First Question
            </Button>
          </Paper>
        )}
      </Box>
      
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
          onClick={() => navigate('/contexthub/templates')}
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