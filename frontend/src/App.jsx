import React, { useState, useEffect } from "react";
import api from "./services/api";
import {
  CircularProgress,
  Container,
  Typography,
  Alert,
  Button,
} from '@mui/material';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ContextHub from './pages/ContextHub';
import TemplateReview from './components/contexthub/TemplateReview';
import { MainLayout } from './components/layout/MainLayout';
import WorkInProgress from './components/WorkInProgress';

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
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/contexthub" element={<ContextHub />} />
        <Route path="/contexthub/templates/:id" element={<TemplateReview />} />
        <Route path="/templates" element={<WorkInProgress title="Manage Templates" />} />
        <Route path="/cycles" element={<WorkInProgress title="Feedback Cycles" />} />
        <Route path="/reports" element={<WorkInProgress title="Reports" />} />
        <Route path="/feedback" element={<WorkInProgress title="Provide Feedback" />} />
        <Route path="/team" element={<WorkInProgress title="Team Management" />} />
        <Route path="/integration" element={<WorkInProgress title="Integration" />} />
        <Route path="/settings" element={<WorkInProgress title="Settings" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}

export default App;