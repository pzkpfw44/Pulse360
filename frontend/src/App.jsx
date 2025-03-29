import React, { useState, useEffect } from "react";
import api from "./services/api";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Typography,
  Alert,
} from '@mui/material';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ContextHub from './pages/ContextHub';
import TemplateReview from './components/contexthub/TemplateReview';

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check API connection
    const checkApiStatus = async () => {
      try {
        await api.get('/health');
        setLoading(false);
      } catch (err) {
        console.error('API connection error:', err);
        setError('Failed to connect to API. Please make sure the backend is running.');
        setLoading(false);
      }
    };

    checkApiStatus();
  }, []);

  if (loading) {
    return (
      <Container sx={{ textAlign: 'center', mt: 10 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading Pulse360...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 10 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          variant="outlined" 
          sx={{ mt: 2 }}
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/contexthub" element={<ContextHub />} />
        <Route path="/contexthub/templates/:id" element={<TemplateReview />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Box>
  );
}

export default App;