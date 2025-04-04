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

// Mark documents as ready for template creation (development shortcut)
router.post('/mark-ready', documentsController.markDocumentsReady);

module.exports = router;