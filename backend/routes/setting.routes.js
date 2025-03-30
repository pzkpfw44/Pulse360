
const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get current settings
router.get('/', settingsController.getSettings);

// Update settings
router.put('/', settingsController.updateSettings);

// Get Flux AI models
router.get('/flux/models', settingsController.getFluxModels);

// Get Flux AI balance
router.get('/flux/balance', settingsController.getFluxBalance);

module.exports = router;