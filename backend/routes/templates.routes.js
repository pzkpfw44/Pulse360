const express = require('express');
const router = express.Router();
const templatesController = require('../controllers/templates.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Template routes
router.get('/', templatesController.getAllTemplates);
router.post('/generate-configured', templatesController.generateConfiguredTemplate);
router.get('/:id', templatesController.getTemplateById);
router.post('/', templatesController.createTemplate);
router.put('/:id', templatesController.updateTemplate);
router.put('/:id/approve', templatesController.approveTemplate);
router.post('/:id/reanalyze', templatesController.reAnalyzeTemplate);
router.delete('/:id', templatesController.deleteTemplate);

module.exports = router;