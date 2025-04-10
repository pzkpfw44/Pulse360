// backend/routes/branding-settings.routes.js

const express = require('express');
const router = express.Router();
const brandingSettingsController = require('../controllers/branding-settings.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get branding settings
router.get('/', brandingSettingsController.getBrandingSettings);

// Update branding settings
router.put('/', brandingSettingsController.updateBrandingSettings);

module.exports = router;