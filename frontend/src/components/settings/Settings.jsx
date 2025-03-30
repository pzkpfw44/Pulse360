import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Alert,
  IconButton,
  InputAdornment
} from '@mui/material';
import { Save, Refresh, Visibility, VisibilityOff } from '@mui/icons-material';
import api from '../../services/api';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [apiCredit, setApiCredit] = useState(null);
  
  // Fetch current settings and available models
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        
        // Get current settings
        const settingsResponse = await api.get('/settings');
        if (settingsResponse.data) {
          const settings = settingsResponse.data;
          // Mask the API key by default
          setApiKey(settings.fluxApiKey || '');
          setSelectedModel(settings.fluxAiModel || '');
        }
        
        // Get available models (in production, this would come from the Flux API)
        try {
          const modelsResponse = await api.get('/settings/flux/models');
          if (modelsResponse.data && modelsResponse.data.data) {
            setAvailableModels(modelsResponse.data.data);
          } else {
            // Fallback for development - predefined list
            setAvailableModels([
              { nickname: "Llama 3.1", model_name: "Llama 3.1" },
              { nickname: "DeepSeek", model_name: "DeepSeek" },
              { nickname: "Mistral", model_name: "Mistral" }
            ]);
          }
        } catch (modelError) {
          console.warn('Could not fetch models, using hardcoded list:', modelError);
          // Fallback for when API isn't connected
          setAvailableModels([
            { nickname: "Llama 3.1", model_name: "Llama 3.1" },
            { nickname: "DeepSeek", model_name: "DeepSeek" },
            { nickname: "Mistral", model_name: "Mistral" }
          ]);
        }
        
        // Get API credit balance
        try {
          const balanceResponse = await api.get('/settings/flux/balance');
          if (balanceResponse.data && balanceResponse.data.api_credit) {
            setApiCredit(balanceResponse.data.api_credit);
          }
        } catch (balanceError) {
          console.warn('Could not fetch API balance:', balanceError);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError('Failed to load settings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      setSaveLoading(true);
      setSuccess(null);
      setError(null);
      
      const response = await api.put('/settings', {
        fluxApiKey: apiKey,
        fluxAiModel: selectedModel
      });
      
      if (response.status === 200) {
        setSuccess('Settings saved successfully');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again later.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleClearApiKey = () => {
    setApiKey('');
  };

  const handleToggleShowApiKey = () => {
    setShowApiKey(!showApiKey);
  };

  const handleRefreshBalance = async () => {
    try {
      const balanceResponse = await api.get('/settings/flux/balance');
      if (balanceResponse.data && balanceResponse.data.api_credit) {
        setApiCredit(balanceResponse.data.api_credit);
        setSuccess('Balance refreshed successfully');
      }
    } catch (err) {
      console.error('Error refreshing balance:', err);
      setError('Failed to refresh balance. Please try again later.');
    }
  };

  if (loading) {
    return (
      <Container sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading settings...</Typography>
      </Container>
    );
  }

  return (
    <Box>
      <Box className="mb-6">
        <Typography variant="h4" component="h1" fontWeight="bold">
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure your Pulse360 application settings
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Flux AI Integration
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Configure your connection to the Flux AI platform for AI-assisted 360-degree feedback.
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              label="Flux AI API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              fullWidth
              type={showApiKey ? 'text' : 'password'}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleToggleShowApiKey} edge="end">
                      {showApiKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              helperText="Your Flux AI API key. Keep this secure."
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>AI Model</InputLabel>
              <Select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                label="AI Model"
              >
                {availableModels.map((model) => (
                  <MenuItem key={model.model_name} value={model.model_name}>
                    {model.nickname}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            color="error"
            onClick={handleClearApiKey}
          >
            Clear API Key
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveSettings}
            disabled={saveLoading}
            startIcon={saveLoading ? <CircularProgress size={20} color="inherit" /> : <Save />}
          >
            Save Settings
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Account Status
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                API Credit Balance
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h4" component="div">
                  {apiCredit !== null ? `${apiCredit}` : 'Not available'}
                </Typography>
                <Button
                  startIcon={<Refresh />}
                  onClick={handleRefreshBalance}
                  size="small"
                >
                  Refresh
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default Settings;