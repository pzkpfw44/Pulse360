// backend/routes/communication-templates.routes.js

const express = require('express');
const router = express.Router();
const communicationTemplatesController = require('../controllers/communication-templates.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all templates
router.get('/', communicationTemplatesController.getAllTemplates);

// Get default templates (creates initial templates if none exist)
router.get('/defaults', communicationTemplatesController.getDefaultTemplates);

// Get template by ID
router.get('/:id', communicationTemplatesController.getTemplateById);

// Create new template
router.post('/', communicationTemplatesController.createTemplate);

// Generate AI template
router.post('/generate-ai', communicationTemplatesController.generateAiTemplates);

// Update template
router.put('/:id', communicationTemplatesController.updateTemplate);

// Delete template
router.delete('/:id', communicationTemplatesController.deleteTemplate);

module.exports = router;