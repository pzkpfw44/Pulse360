const jwt = require('jsonwebtoken');
const { User } = require('../models');
require('dotenv').config();

// Authentication middleware for production use
exports.authMiddlewareProduction = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    // Check if no token
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by ID
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Simple auth middleware for development
exports.authMiddleware = (req, res, next) => {
  // For development, we'll create or use a dummy user
  const setupDummyUser = async () => {
    try {
      // Try to find admin user
      let user = await User.findOne({ where: { email: 'admin@pulse360.com' } });
      
      // If no admin user exists, create one
      if (!user) {
        user = await User.create({
          name: 'Admin User',
          email: 'admin@pulse360.com',
          password: 'adminpassword',
          role: 'admin'
        });
        console.log('Created dummy admin user for development');
      }
      
      // Set user in request
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      };
      
      next();
    } catch (error) {
      console.error('Error setting up dummy user:', error);
      // If database isn't connected yet, use hardcoded ID
      req.user = { id: '123e4567-e89b-12d3-a456-426614174000' };
      next();
    }
  };
  
  setupDummyUser();
};