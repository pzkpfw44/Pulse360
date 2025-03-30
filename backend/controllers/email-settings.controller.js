// backend/controllers/email-settings.controller.js

const emailService = require('../services/email.service');
const { EmailSettings } = require('../models');

// Get email settings
exports.getEmailSettings = async (req, res) => {
  try {
    const settings = await emailService.getSettings();
    
    // Don't send the password back to the client
    const sanitizedSettings = settings.toJSON();
    if (sanitizedSettings.password) {
      sanitizedSettings.password = '••••••••';
    }
    
    res.status(200).json({
      smtp: {
        host: sanitizedSettings.host || '',
        port: sanitizedSettings.port || '587',
        secure: sanitizedSettings.secure || false,
        requireAuth: sanitizedSettings.requireAuth !== false, // default to true
        username: sanitizedSettings.username || '',
        password: sanitizedSettings.password || '',
        fromEmail: sanitizedSettings.fromEmail || '',
        fromName: sanitizedSettings.fromName || 'Pulse360 Feedback',
        replyTo: sanitizedSettings.replyTo || ''
      },
      sendReminders: sanitizedSettings.sendReminders !== false, // default to true
      reminderFrequency: sanitizedSettings.reminderFrequency || 3,
      maxReminders: sanitizedSettings.maxReminders || 3,
      devMode: sanitizedSettings.devMode || false,
      lastTestSent: sanitizedSettings.lastTestSent,
      lastTestResult: sanitizedSettings.lastTestResult
    });
  } catch (error) {
    console.error('Error getting email settings:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve email settings', 
      error: error.message 
    });
  }
};

// Update email settings
exports.updateEmailSettings = async (req, res) => {
  try {
    const { smtp, sendReminders, reminderFrequency, maxReminders, devMode } = req.body;
    
    // Update email settings
    await emailService.updateSettings({
      host: smtp?.host,
      port: smtp?.port,
      secure: smtp?.secure || false,
      requireAuth: smtp?.requireAuth !== false, // default to true
      username: smtp?.username,
      password: smtp?.password, // If undefined, it will keep the existing password
      fromEmail: smtp?.fromEmail,
      fromName: smtp?.fromName || 'Pulse360 Feedback',
      replyTo: smtp?.replyTo,
      sendReminders: sendReminders !== false, // default to true
      reminderFrequency: reminderFrequency || 3,
      maxReminders: maxReminders || 3,
      devMode: devMode || false
    }, req.user.id);
    
    res.status(200).json({ message: 'Email settings updated successfully' });
  } catch (error) {
    console.error('Error updating email settings:', error);
    res.status(500).json({ 
      message: 'Failed to update email settings', 
      error: error.message 
    });
  }
};

// Test email connection
exports.testEmailConnection = async (req, res) => {
  try {
    // If we're updating settings before testing, apply them temporarily
    if (req.body.smtp) {
      const { smtp } = req.body;
      
      // Create temporary settings
      const tempSettings = {
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure || false,
        requireAuth: smtp.requireAuth !== false,
        username: smtp.username,
        fromEmail: smtp.fromEmail,
        fromName: smtp.fromName || 'Pulse360 Feedback',
        replyTo: smtp.replyTo
      };
      
      // Only include password if provided
      if (smtp.password) {
        tempSettings.password = smtp.password;
      }
      
      // Apply temporary settings
      await emailService.updateSettings(tempSettings, req.user.id);
    }
    
    // Test the connection
    const result = await emailService.testConnection();
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error testing email connection:', error);
    res.status(500).json({ 
      message: 'Failed to test email connection', 
      error: error.message 
    });
  }
};