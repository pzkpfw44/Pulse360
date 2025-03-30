import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Button, Container } from '@mui/material';
import { Upload, FileText } from 'lucide-react';
import DocumentUpload from '../components/contexthub/DocumentUpload';
import DocumentList from '../components/contexthub/DocumentList';
import { useNavigate } from 'react-router-dom';

const ContextHub = () => {
  // State to control auto-refresh when a document is uploaded
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();

  // Function to be called after successful document upload
  const handleDocumentUploaded = () => {
    // Increment trigger to cause DocumentList to refresh
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Box>
      <Box className="mb-6">
        <Typography variant="h4" component="h1" fontWeight="bold">
          ContextHub
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage organizational documents and feedback templates
        </Typography>
      </Box>

      {/* Action buttons section */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<FileText size={18} />}
          onClick={() => navigate('/templates')}
          sx={{ ml: 2 }}
        >
          Manage Templates
        </Button>
      </Box>

      {/* Document Library Section (Top) */}
      <Paper sx={{ mb: 4, p: 0, overflow: 'hidden' }}>
        <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0', bgcolor: '#f9f9f9' }}>
          <Typography variant="h5" component="h2" fontWeight="bold">
            Document Library
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your uploaded organizational documents
          </Typography>
        </Box>
        <Box>
          <DocumentList key={refreshTrigger} /> {/* Key prop ensures re-render on upload */}
        </Box>
      </Paper>

      {/* Upload Documents Section (Bottom) */}
      <Paper sx={{ p: 0, overflow: 'hidden' }}>
        <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0', bgcolor: '#f9f9f9' }}>
          <Typography variant="h5" component="h2" fontWeight="bold">
            Upload Documents
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload organizational documents to generate feedback templates
          </Typography>
        </Box>
        <Box>
          <DocumentUpload onDocumentUploaded={handleDocumentUploaded} />
        </Box>
      </Paper>
    </Box>
  );
};

export default ContextHub;