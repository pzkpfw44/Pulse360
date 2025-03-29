import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Grid,
  TextField,
  MenuItem,
  CircularProgress
} from '@mui/material';
import { Upload, BookOpen, FileText, Search, Filter } from 'lucide-react';
import DocumentUpload from '../components/contexthub/DocumentUpload';
import DocumentList from '../components/contexthub/DocumentList';

const ContextHub = () => {
  return (
    <Box>
      <Box className="mb-6">
        <Typography variant="h4" component="h1" className="font-bold">
          ContextHub
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage organizational documents and feedback templates
        </Typography>
      </Box>

      {/* Document Upload Section */}
      <Paper className="p-6 mb-6">
        <Box className="flex justify-between items-center mb-4">
          <Box>
            <Typography variant="h6" className="font-medium">
              Upload Organization Documents
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload your organization's documents to help AI generate relevant feedback questions.
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<Upload size={18} />}
            href="/contexthub?tab=0"
          >
            Upload Documents
          </Button>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <TextField
              select
              label="Document Type"
              fullWidth
              defaultValue=""
            >
              <MenuItem value="">Select document type</MenuItem>
              <MenuItem value="leadership_model">Leadership Model</MenuItem>
              <MenuItem value="job_description">Job Description</MenuItem>
              <MenuItem value="competency_framework">Competency Framework</MenuItem>
              <MenuItem value="company_values">Company Values</MenuItem>
              <MenuItem value="performance_criteria">Performance Criteria</MenuItem>
            </TextField>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Box 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex items-center justify-center text-center"
              sx={{ height: '100%', minHeight: '120px' }}
            >
              <Box>
                <Upload className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                <Typography variant="body1" className="font-medium">
                  Drag and drop files here or click to browse
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Supported formats: PDF, Word, Text (max 10MB per file)
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Document Library Section */}
      <Paper className="p-6">
        <Box className="flex justify-between items-center mb-4">
          <Box>
            <Typography variant="h6" className="font-medium">
              Document Library
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage and view your uploaded documents
            </Typography>
          </Box>
          
          <Box className="flex items-center gap-3">
            <Box className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search documents..." 
                className="pl-10 pr-3 py-2 border rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Box>
            <Button 
              variant="outlined" 
              startIcon={<Filter size={16} />}
              size="small"
            >
              Filter
            </Button>
          </Box>
        </Box>
        
        {/* Document List Table */}
        <DocumentList embedded={true} />
      </Paper>
    </Box>
  );
};

export default ContextHub;