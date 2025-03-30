// backend/app.js

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { router: authRoutes } = require('./routes/auth.routes');
const documentsRoutes = require('./routes/documents.routes');
const templatesRoutes = require('./routes/templates.routes');
const settingsRoutes = require('./routes/settings.routes');
const employeesRoutes = require('./routes/employees.routes');
const emailSettingsRoutes = require('./routes/email-settings.routes');
const documentsController = require('./controllers/documents.controller');
const upload = require('./middleware/upload.middleware');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/settings/email', emailSettingsRoutes);
app.use('/api/campaigns', require('./routes/campaigns.routes'));

// Add direct endpoint for document upload
app.post('/api/documents/upload', upload.array('files'), documentsController.uploadDocuments);

app.get('/api/test', (req, res) => {
  res.status(200).json({ message: 'API is working!' });
});

app.post('/api/test/upload', (req, res) => {
  res.status(200).json({ 
    message: 'Upload test endpoint is working!',
    body: req.body,
    files: req.files,
    headers: req.headers
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = app;