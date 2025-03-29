import React, { useState } from 'react';
import { Box, Container, Tabs, Tab, Typography } from '@mui/material';
import DocumentUpload from '../components/contexthub/DocumentUpload';
import DocumentList from '../components/contexthub/DocumentList';
import TemplateList from '../components/contexthub/TemplateList';

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
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ContextHub = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          ContextHub
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage organizational documents and feedback templates
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="contexthub tabs">
          <Tab label="Upload Documents" />
          <Tab label="Document Library" />
          <Tab label="Templates" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <DocumentUpload />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <DocumentList />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <TemplateList />
      </TabPanel>
    </Container>
  );
};

export default ContextHub;