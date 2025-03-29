// Simple auth middleware for development
exports.authMiddleware = (req, res, next) => {
    // For development, we'll attach a dummy user to the request
    req.user = { id: '123456789012345678901234' }; // Mock MongoDB ObjectId
    next();
  };