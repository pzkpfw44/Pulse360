// backend/routes/email-settings.routes.js

const express = require('express');
const router = express.Router();
const emailSettingsController = require('../controllers/email-settings.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get email settings
router.get('/', emailSettingsController.getEmailSettings);

// Update email settings
router.put('/', emailSettingsController.updateEmailSettings);

// Test email connection
router.post('/test', emailSettingsController.testEmailConnection);

module.exports = router;