const express = require('express');
const router = express.Router();
const templatesController = require('../controllers/templates.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Template routes
router.get('/', templatesController.getAllTemplates);
router.get('/:id', templatesController.getTemplateById);
router.post('/', templatesController.createTemplate);
router.put('/:id', templatesController.updateTemplate);
router.put('/:id/approve', templatesController.approveTemplate);
router.delete('/:id', templatesController.deleteTemplate);

module.exports = router;