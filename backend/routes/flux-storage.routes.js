// backend/routes/flux-storage.routes.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { 
  getStorageInfo, 
  listFluxAiFiles, 
  deleteFluxAiFile 
} = require('../services/flux-ai.service');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get storage info
router.get('/storage', async (req, res) => {
  try {
    const storageInfo = await getStorageInfo();
    if (storageInfo.success) {
      res.status(200).json(storageInfo);
    } else {
      res.status(400).json({ message: 'Failed to fetch storage info', error: storageInfo.error });
    }
  } catch (error) {
    console.error('Error getting storage info:', error);
    res.status(500).json({ message: 'Server error fetching storage info' });
  }
});

// List all files
router.get('/files', async (req, res) => {
  try {
    const result = await listFluxAiFiles();
    if (result.success) {
      res.status(200).json({ files: result.files });
    } else {
      res.status(400).json({ message: 'Failed to list files', error: result.error });
    }
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ message: 'Server error listing files' });
  }
});

// Delete a file
router.delete('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteFluxAiFile(id);
    
    if (result.success) {
      res.status(200).json({ message: 'File deleted successfully' });
    } else {
      res.status(400).json({ message: 'Failed to delete file', error: result.error });
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'Server error deleting file' });
  }
});

// Clean up all files
router.post('/cleanup', async (req, res) => {
  try {
    // First, get all files
    const files = await listFluxAiFiles();
    
    if (!files.success) {
      return res.status(400).json({ message: 'Failed to list files', error: files.error });
    }
    
    // Delete each file
    const deleteResults = [];
    for (const file of files.files) {
      const result = await deleteFluxAiFile(file.id);
      deleteResults.push({
        fileId: file.id,
        success: result.success,
        error: result.error
      });
    }
    
    const successCount = deleteResults.filter(r => r.success).length;
    
    res.status(200).json({
      message: `Deleted ${successCount} of ${files.files.length} files`,
      details: deleteResults
    });
  } catch (error) {
    console.error('Error cleaning up files:', error);
    res.status(500).json({ message: 'Server error cleaning up files' });
  }
});

module.exports = router;