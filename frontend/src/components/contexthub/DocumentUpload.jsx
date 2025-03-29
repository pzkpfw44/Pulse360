import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CircularProgress, 
  Container, 
  Divider, 
  FormControl, 
  Grid, 
  InputLabel, 
  MenuItem, 
  Select, 
  Typography, 
  Alert,
  Snackbar
} from '@mui/material';
import { CloudUpload, Check, ErrorOutline } from '@mui/icons-material';
import api from '../../../services/api';

const DocumentUpload = () => {
  const [files, setFiles] = useState([]);
  const [documentType, setDocumentType] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  const handleFileChange = (event) => {
    setFiles(Array.from(event.target.files));
  };

  const handleDocumentTypeChange = (event) => {
    setDocumentType(event.target.value);
  };

  const handleUpload = async () => {
    if (files.length === 0 || !documentType) {
      setUploadStatus({
        success: false,
        message: 'Please select files and document type'
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('documentType', documentType);

    try {
      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadStatus({
        success: true,
        message: `Successfully uploaded ${files.length} document(s)`,
        data: response.data
      });
      
      // Reset form after successful upload
      setFiles([]);
      setDocumentType('');
    } catch (error) {
      console.error('Error uploading documents:', error);
      
      // Extract detailed error message if available
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Error uploading documents';
      
      setUploadStatus({
        success: false,
        message: errorMessage
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle drag and drop
  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      setFiles(Array.from(event.dataTransfer.files));
    }
  };

  // Handle closing the alert
  const handleAlertClose = () => {
    setUploadStatus(null);
  };

  return (
    <Container maxWidth="md">
      <Card sx={{ p: 4, mt: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Upload Organization Documents
        </Typography>
        
        <Typography color="textSecondary" sx={{ mb: 3 }}>
          Upload your organization's documents to help AI generate relevant feedback questions.
        </Typography>
        
        <Divider sx={{ mb: 4 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>Document Type</InputLabel>
              <Select
                value={documentType}
                onChange={handleDocumentTypeChange}
                label="Document Type"
              >
                <MenuItem value="leadership_model">Leadership Model</MenuItem>
                <MenuItem value="job_description">Job Description</MenuItem>
                <MenuItem value="competency_framework">Competency Framework</MenuItem>
                <MenuItem value="company_values">Company Values</MenuItem>
                <MenuItem value="performance_criteria">Performance Criteria</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <Box
              sx={{
                border: '2px dashed #ccc',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.02)'
                }
              }}
              onClick={() => document.getElementById('file-input').click()}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                id="file-input"
                type="file"
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.txt"
              />
              <CloudUpload sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Drag and drop files here or click to browse
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Supported formats: PDF, Word, Text (max 10MB per file)
              </Typography>
              
              {files.length > 0 && (
                <Box sx={{ mt: 2, textAlign: 'left' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Selected files ({files.length}):
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {files.map((file, index) => (
                      <li key={index}>
                        <Typography variant="body2">{file.name}</Typography>
                      </li>
                    ))}
                  </ul>
                </Box>
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleUpload}
              disabled={isUploading || files.length === 0 || !documentType}
              startIcon={isUploading ? <CircularProgress size={20} color="inherit" /> : <CloudUpload />}
              fullWidth
            >
              {isUploading ? 'Uploading...' : 'Upload Documents'}
            </Button>
          </Grid>
          
          {uploadStatus && (
            <Grid item xs={12}>
              <Alert 
                severity={uploadStatus.success ? 'success' : 'error'}
                icon={uploadStatus.success ? <Check /> : <ErrorOutline />}
                onClose={handleAlertClose}
              >
                {uploadStatus.message}
                
                {!uploadStatus.success && (
                  <Typography variant="caption" component="div" sx={{ mt: 1 }}>
                    Note: In development mode, the system will generate mock questions without using the Flux AI API.
                  </Typography>
                )}
              </Alert>
            </Grid>
          )}
        </Grid>
      </Card>
      
      {uploadStatus?.success && (
        <Card sx={{ p: 4, mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Next Steps
          </Typography>
          <Typography paragraph>
            Your documents have been uploaded successfully. 
            {process.env.NODE_ENV === 'development' ? 
              ' In development mode, mock questions will be generated automatically.' : 
              ' Our AI is now analyzing them to generate relevant feedback questions.'}
            {' '}You'll be able to review the generated template once the analysis is complete.
          </Typography>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={() => window.location.href = '/contexthub?tab=1'}
          >
            View Document Library
          </Button>
        </Card>
      )}
    </Container>
  );
};

export default DocumentUpload;