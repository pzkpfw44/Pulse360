// frontend/src/services/api.js

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor for auth
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response || error);
    return Promise.reject(error);
  }
);

// API endpoints for documents
export const documentsApi = {
  getAll: () => api.get('/documents'),
  getById: (id) => api.get(`/documents/${id}`),
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  delete: (id) => api.delete(`/documents/${id}`),
};

// API endpoints for templates
export const templatesApi = {
  getAll: () => api.get('/templates'),
  getById: (id) => api.get(`/templates/${id}`),
  create: (data) => api.post('/templates', data),
  update: (id, data) => api.put(`/templates/${id}`, data),
  approve: (id, data) => api.put(`/templates/${id}/approve`, data),
  reanalyze: (id) => api.post(`/templates/${id}/reanalyze`),
  delete: (id) => api.delete(`/templates/${id}`),
};

// API endpoints for employees
export const employeesApi = {
  getAll: (params) => api.get('/employees', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  import: (formData) => api.post('/employees/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  purge: (confirmation) => api.delete('/employees', { 
    data: { confirmation } 
  }),
};

// API endpoints for auth
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
};

// API endpoints for campaigns
export const campaignsApi = {
  getAll: () => api.get('/campaigns'),
  getById: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  launch: (id) => api.post(`/campaigns/${id}/launch`),
  cancel: (id) => api.post(`/campaigns/${id}/cancel`),
  delete: (id) => api.delete(`/campaigns/${id}`),
  suggestAssessors: (data) => api.post('/campaigns/suggest-assessors', data),
  generateEmailTemplates: () => api.post('/campaigns/generate-email-templates')
};

export default api;