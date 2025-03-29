const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');

// Temporary controller functions
const templatesController = {
  getAllTemplates: (req, res) => res.json({ message: 'All templates endpoint' }),
  getTemplateById: (req, res) => res.json({ message: `Getting template ${req.params.id}` }),
  createTemplate: (req, res) => res.json({ message: 'Create template endpoint' }),
  updateTemplate: (req, res) => res.json({ message: `Updating template ${req.params.id}` }),
  approveTemplate: (req, res) => res.json({ message: `Approving template ${req.params.id}` }),
  deleteTemplate: (req, res) => res.json({ message: `Deleting template ${req.params.id}` })
};

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