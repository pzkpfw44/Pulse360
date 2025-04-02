const express = require('express');
const router = express.Router();
const documentsController = require('../controllers/documents.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all documents
router.get('/', documentsController.getAllDocuments);

// Get document by ID
router.get('/:id', documentsController.getDocumentById);

// Upload documents
router.post('/upload', upload.array('files'), documentsController.uploadDocuments);

// Delete document
router.delete('/:id', documentsController.deleteDocument);

router.get('/test-flux-api', documentsController.testFluxAiApi);

module.exports = router;