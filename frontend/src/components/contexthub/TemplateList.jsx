import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  Paper,
  Typography,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import {
  Delete,
  Edit,
  FileCopy,
  Visibility,
  CheckCircle,
  Error as ErrorIcon,
  HourglassEmpty,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const TemplateList = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/templates');
      setTemplates(response.data.templates || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTemplate = (templateId) => {
    navigate(`/contexthub/templates/${templateId}`);
  };

  const handleDeleteClick = (template) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    try {
      await axios.delete(`/api/templates/${templateToDelete._id}`);
      // Remove the deleted template from the list
      setTemplates(templates.filter(t => t._id !== templateToDelete._id));
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Failed to delete template. Please try again later.');
    }
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      pending_review: { color: 'warning', label: 'Pending Review', icon: <HourglassEmpty fontSize="small" /> },
      approved: { color: 'success', label: 'Approved', icon: <CheckCircle fontSize="small" /> },
      archived: { color: 'default', label: 'Archived', icon: <FileCopy fontSize="small" /> },
    };

    const config = statusConfig[status] || statusConfig.pending_review;

    return (
      <Chip
        size="small"
        color={config.color}
        icon={config.icon}
        label={config.label}
      />
    );
  };

  const formatDocumentType = (type) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <Container sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading templates...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button variant="outlined" sx={{ mt: 2 }} onClick={fetchTemplates}>
          Retry
        </Button>
      </Container>
    );
  }

  if (templates.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
        <Typography variant="h6" gutterBottom>
          No Templates Found
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Upload documents to generate feedback templates, or create templates manually.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/contexthub')}
        >
          Upload Documents
        </Button>
      </Paper>
    );
  }

  return (
    <Container>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Feedback Templates
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Review and manage feedback templates generated from your documents
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {templates.map((template) => (
          <Grid item xs={12} md={6} lg={4} key={template._id}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" component="h3" noWrap>
                    {template.name}
                  </Typography>
                  {getStatusChip(template.status)}
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Chip
                    size="small"
                    label={formatDocumentType(template.documentType)}
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    size="small"
                    label={`${template.questions?.length || 0} Questions`}
                    variant="outlined"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {template.description || 'No description provided.'}
                </Typography>

                <Typography variant="caption" color="text.secondary" display="block">
                  Created: {new Date(template.createdAt).toLocaleDateString()}
                </Typography>
              </CardContent>
              
              <CardActions>
                <Button
                  size="small"
                  startIcon={<Visibility />}
                  onClick={() => handleViewTemplate(template._id)}
                >
                  View
                </Button>
                {template.status === 'pending_review' && (
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    onClick={() => handleViewTemplate(template._id)}
                  >
                    Edit
                  </Button>
                )}
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteClick(template)}
                  sx={{ ml: 'auto' }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TemplateList;