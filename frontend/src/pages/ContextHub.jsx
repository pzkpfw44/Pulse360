import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Paper } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import DocumentUpload from '../components/contexthub/DocumentUpload';
import DocumentList from '../components/contexthub/DocumentList';
import TemplateList from '../components/contexthub/TemplateList';
import { Upload, Book, FileText } from 'lucide-react';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`contexthub-tabpanel-${index}`}
      aria-labelledby={`contexthub-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ContextHub = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  // Check URL for tab parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam !== null) {
      setTabValue(parseInt(tabParam, 10));
    }
  }, [location]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    // Update URL with tab parameter
    navigate(`/contexthub?tab=${newValue}`);
  };

  return (
    <Box>
      <Box className="page-title">
        <Typography variant="h4" component="h1" fontWeight="bold">
          ContextHub
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage organizational documents and feedback templates
        </Typography>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="contexthub tabs"
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              minHeight: '56px',
              textTransform: 'none',
              fontSize: '0.9rem',
              fontWeight: 500
            }
          }}
        >
          <Tab 
            icon={<Upload size={18} />} 
            iconPosition="start" 
            label="Upload Documents" 
          />
          <Tab 
            icon={<Book size={18} />} 
            iconPosition="start" 
            label="Document Library" 
          />
          <Tab 
            icon={<FileText size={18} />} 
            iconPosition="start" 
            label="Templates" 
          />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <DocumentUpload />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <DocumentList />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <TemplateList />
      </TabPanel>
    </Box>
  );
};

export default ContextHub;