import React, { useState, useEffect } from 'react';
import api from "../../services/api";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  CheckCircle,
  HourglassEmpty,
  ErrorOutline,
  ArrowRight,
} from 'lucide-react';

const DocumentList = ({ embedded = false }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      console.log('Fetching documents...');
      const response = await api.get('/documents');
      console.log('Documents response:', response.data);
      setDocuments(response.data.documents || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (document) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    try {
      await api.delete(`/documents/${documentToDelete.id}`);
      // Remove the deleted document from the list
      setDocuments(documents.filter(doc => doc.id !== documentToDelete.id));
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document. Please try again later.');
    }
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      uploaded: { color: 'default', label: 'Uploaded', icon: <CheckCircle size={16} /> },
      uploaded_to_ai: { color: 'info', label: 'Uploaded to AI', icon: <CheckCircle size={16} /> },
      analysis_in_progress: { color: 'warning', label: 'Analysis In Progress', icon: <HourglassEmpty size={16} /> },
      analysis_complete: { color: 'success', label: 'Analysis Complete', icon: <CheckCircle size={16} /> },
      analysis_failed: { color: 'error', label: 'Analysis Failed', icon: <ErrorOutline size={16} /> },
    };

    const config = statusConfig[status] || statusConfig.uploaded;

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

  // Format file size to readable format
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Container sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading documents...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button variant="outlined" sx={{ mt: 2 }} onClick={fetchDocuments}>
          Retry
        </Button>
      </Container>
    );
  }

  if (documents.length === 0) {
    // Show different empty state based on embedded mode
    return embedded ? (
      <Box className="py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <Typography variant="body1" gutterBottom>
          No documents have been uploaded yet.
        </Typography>
        <Typography variant="body2" color="text.secondary" className="mb-4">
          Upload organizational documents to get started.
        </Typography>
      </Box>
    ) : (
      <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
        <Typography variant="h6" gutterBottom>
          No Documents Found
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Upload organizational documents to get started.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => window.location.href = '/contexthub'}
        >
          Upload Documents
        </Button>
      </Paper>
    );
  }

  // Table content is the same for both modes
  const tableContent = (
    <>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Uploaded</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((document) => (
              <TableRow key={document.id} hover>
                <TableCell>
                  <Typography variant="body2" component="div">
                    {document.filename}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={formatDocumentType(document.documentType)}
                  />
                </TableCell>
                <TableCell>{formatFileSize(document.size)}</TableCell>
                <TableCell>
                  {new Date(document.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>{getStatusChip(document.status)}</TableCell>
                <TableCell align="right">
                  {document.status === 'analysis_complete' && document.associatedTemplateId && (
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => {
                        window.location.href = `/contexthub?tab=2`;
                        console.log("Navigating to templates tab");
                      }}
                      title="View Template"
                    >
                      <ArrowRight size={18} />
                    </IconButton>
                  )}
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() => handleDeleteClick(document)}
                    title="Delete Document"
                  >
                    <Delete size={18} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Document</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{documentToDelete?.filename}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );

  // Return appropriate wrapper based on embedded mode
  return embedded ? tableContent : (
    <Container>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Document Library
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your uploaded organizational documents
        </Typography>
      </Box>

      <Paper>
        {tableContent}
      </Paper>

      {documents.some(doc => doc.status === 'analysis_complete') && (
        <Box sx={{ mt: 3, textAlign: 'right' }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => window.location.href = '/contexthub?tab=2'}
          >
            View All Templates
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default DocumentList;