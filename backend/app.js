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
const dangerZoneRoutes = require('./routes/danger-zone.routes'); // Add this line
const documentsController = require('./controllers/documents.controller');
const upload = require('./middleware/upload.middleware');
const communicationTemplatesRoutes = require('./routes/communication-templates.routes');
const databaseTestRoutes = require('./routes/database-test.routes');
const fixDatabaseRoutes = require('./routes/fix-database.routes');
const brandingSettingsRoutes = require('./routes/branding-settings.routes');
const insightsRoutes = require('./routes/insights.routes');

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
app.use('/api/settings/danger-zone', dangerZoneRoutes); 
app.use('/api/campaigns', require('./routes/campaigns.routes'));
app.use('/api/feedback', require('./routes/feedback.routes'));
app.use('/api/communication-templates', communicationTemplatesRoutes);
app.use('/api/communication-logs', require('./routes/communication-log.routes'));
app.use('/api/results', require('./routes/results.routes'));
app.use('/api/db-test', databaseTestRoutes);
app.use('/api/fix-db', fixDatabaseRoutes);
app.use('/api/insights', require('./routes/insights.routes'));
app.use('/api/insights', insightsRoutes);

const testRoutes = require('./routes/test.routes');
app.use('/api/flux-test', testRoutes);  // Using a different path to avoid conflicts

// Direct endpoint for document upload
app.post('/api/documents/upload', upload.array('files'), documentsController.uploadDocuments);

app.use('/api/settings/branding', brandingSettingsRoutes);

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