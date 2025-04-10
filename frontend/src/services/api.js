import axios from 'axios';

// Read the API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create main axios instance for general API calls
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token from local storage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Specialized API services
const documentsApi = {
  getAll: () => api.get('/documents'),
  getById: (id) => api.get(`/documents/${id}`),
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  delete: (id) => api.delete(`/documents/${id}`),
  markReady: (documentIds) => api.post('/documents/mark-ready', { documentIds })
};

const templatesApi = {
  getAll: () => api.get('/templates'),
  getById: (id) => api.get(`/templates/${id}`),
  create: (data) => api.post('/templates', data),
  update: (id, data) => api.put(`/templates/${id}`, data),
  approve: (id, data) => api.put(`/templates/${id}/approve`, data),
  delete: (id) => api.delete(`/templates/${id}`),
  generateConfigured: (data) => api.post('/templates/generate-configured', data)
};

const employeesApi = {
  getAll: () => api.get('/employees'),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  import: (formData) => api.post('/employees/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
};

const communicationTemplatesApi = {
  getAll: () => api.get('/communication-templates'),
  getDefaults: () => api.get('/communication-templates/defaults'),
  getById: (id) => api.get(`/communication-templates/${id}`),
  create: (data) => api.post('/communication-templates', data),
  update: (id, data) => api.put(`/communication-templates/${id}`, data),
  delete: (id) => api.delete(`/communication-templates/${id}`),
  generateAi: (data) => api.post('/communication-templates/generate-ai', data)
};

const settingsApi = {
  getAll: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  getEmailSettings: () => api.get('/settings/email'),
  updateEmailSettings: (data) => api.put('/settings/email', data),
  testEmailConnection: (data) => api.post('/settings/email/test', data),
  getFluxModels: () => api.get('/settings/flux/models'),
  getFluxBalance: () => api.get('/settings/flux/balance'),
  
  // Danger Zone operations
  dangerZone: {
    disableAiForAllCampaigns: () => api.post('/settings/danger-zone/disable-ai-for-all-campaigns')
  }
};

const campaignsApi = {
  getAll: () => api.get('/campaigns'),
  getById: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  launch: (id) => api.post(`/campaigns/${id}/launch`),
  cancel: (id) => api.post(`/campaigns/${id}/cancel`),
  delete: (id) => api.delete(`/campaigns/${id}`),
  suggestAssessors: (data) => api.post('/campaigns/suggest-assessors', data)
};

// Export all API services
export { documentsApi, templatesApi, employeesApi, settingsApi, campaignsApi, communicationTemplatesApi };

// Default export for backward compatibility
export default api;