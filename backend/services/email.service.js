// backend/services/email.service.js

const nodemailer = require('nodemailer');
const { EmailSettings } = require('../models');

/**
 * Email service for Pulse360
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.settings = null;
    this.initialized = false;
  }

  /**
   * Initialize the email service with settings from the database
   */
  async initialize() {
    try {
      // Get settings from database
      const settings = await this.getSettings();
      
      if (!settings) {
        console.warn('Email settings not found in database');
        return false;
      }
      
      console.log('Initializing email service with settings:', {
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        requireAuth: settings.requireAuth,
        fromEmail: settings.fromEmail,
        fromName: settings.fromName,
        devMode: settings.devMode
      });
      
      // Create transporter
      this.transporter = nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        auth: settings.requireAuth ? {
          user: settings.username,
          pass: settings.password
        } : undefined
      });
      
      this.settings = settings;
      this.initialized = true;
      
      // Test connection
      try {
        await this.transporter.verify();
        console.log('Email service initialized successfully with working SMTP connection');
        return true;
      } catch (verifyError) {
        console.error('Email service initialized but SMTP connection failed:', verifyError.message);
        // Still return true because we did initialize with settings
        return true;
      }
    } catch (error) {
      console.error('Error initializing email service:', error);
      return false;
    }
  }

  /**
   * Get email settings from database
   */
  async getSettings() {
    try {
      // Try to find existing settings
      let settings = await EmailSettings.findOne();
      
      // If no settings exist, create default settings
      if (!settings) {
        settings = await EmailSettings.create({
          host: '',
          port: '587',
          secure: false,
          requireAuth: true,
          username: '',
          password: '',
          fromEmail: '',
          fromName: 'Pulse360 Feedback',
          sendReminders: true,
          reminderFrequency: 3,
          maxReminders: 3,
          devMode: true // Default to dev mode for safety
        });
        
        console.log('Created default email settings');
      }
      
      return settings;
    } catch (error) {
      console.error('Error getting email settings:', error);
      return null;
    }
  }

  /**
   * Update email settings
   * @param {Object} newSettings - New settings to apply
   * @param {string} userId - ID of user updating settings
   */
  async updateSettings(newSettings, userId) {
    try {
      console.log('Updating email settings with:', {
        ...newSettings,
        password: newSettings.password ? '******' : undefined
      });
      
      // Try to find existing settings
      let settings = await EmailSettings.findOne();
      
      // If no settings exist, create new settings
      if (!settings) {
        settings = await EmailSettings.create({
          ...newSettings,
          updatedBy: userId
        });
        console.log('Created new email settings');
      } else {
        // Update existing settings
        // For password, only update if provided (not undefined)
        if (newSettings.password === undefined) {
          delete newSettings.password;
        }
        
        await settings.update({
          ...newSettings,
          updatedBy: userId
        });
        console.log('Updated existing email settings');
      }
      
      // Explicitly log the dev mode setting
      console.log(`Dev mode is set to: ${settings.devMode}`);
      
      // Reinitialize email service with new settings
      this.initialized = false;
      await this.initialize();
      
      return settings;
    } catch (error) {
      console.error('Error updating email settings:', error);
      throw error;
    }
  }

  /**
   * Test email connection
   */
  async testConnection() {
    try {
      // Make sure service is initialized
      if (!this.initialized) {
        const success = await this.initialize();
        if (!success) {
          return {
            success: false,
            message: 'Failed to initialize email service with current settings'
          };
        }
      }
      
      // Try to verify connection
      await this.transporter.verify();
      
      // Update last test result
      const settings = await EmailSettings.findOne();
      if (settings) {
        await settings.update({
          lastTestSent: new Date(),
          lastTestResult: { success: true, message: 'Connection verified successfully' }
        });
      }
      
      return {
        success: true,
        message: 'Email connection test successful'
      };
    } catch (error) {
      console.error('Error testing email connection:', error);
      
      // Update last test result
      const settings = await EmailSettings.findOne();
      if (settings) {
        await settings.update({
          lastTestSent: new Date(),
          lastTestResult: { 
            success: false, 
            message: error.message || 'Unknown error occurred' 
          }
        });
      }
      
      return {
        success: false,
        message: `Email connection test failed: ${error.message}`
      };
    }
  }

  /**
   * Send an email
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.text - Plain text content
   * @param {string} options.html - HTML content
   * @returns {Promise<Object>} - Result of sending email
   */
  async sendEmail(options) {
    try {
      // Make sure service is initialized
      if (!this.initialized) {
        const success = await this.initialize();
        if (!success) {
          console.error('Failed to initialize email service before sending');
          throw new Error('Email service not initialized');
        }
      }
      
      // Re-check settings from database to ensure we have the latest
      const freshSettings = await EmailSettings.findOne();
      const devMode = freshSettings ? freshSettings.devMode : this.settings.devMode;
      
      console.log(`Attempting to send email to ${options.to}, dev mode: ${devMode}`);
      
      // Check for dev mode
      if (devMode) {
        console.log('DEV MODE: Email not sent. Details:');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Content: ${options.text || options.html.substring(0, 100)}...`);
        
        // Log this communication in the database
        await this.logCommunication({
          recipient: options.to,
          subject: options.subject,
          type: 'email',
          status: 'simulated',
          details: 'Email not sent due to dev mode'
        });
        
        return { sent: false, devMode: true };
      }
      
      // Prepare email options
      const mailOptions = {
        from: `"${this.settings.fromName}" <${this.settings.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      };
      
      // Add reply-to if configured
      if (this.settings.replyTo) {
        mailOptions.replyTo = this.settings.replyTo;
      }
      
      // Send the email
      console.log(`Sending email to ${options.to}...`);
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${options.to}, message ID: ${info.messageId}`);
      
      // Log this communication in the database
      await this.logCommunication({
        recipient: options.to,
        subject: options.subject,
        type: 'email',
        status: 'sent',
        details: `Message ID: ${info.messageId}`
      });
      
      return { sent: true, messageId: info.messageId };
    } catch (error) {
      console.error(`Error sending email to ${options.to}:`, error);
      
      // Log the failed communication
      await this.logCommunication({
        recipient: options.to,
        subject: options.subject,
        type: 'email',
        status: 'failed',
        details: `Error: ${error.message}`
      }).catch(logError => {
        console.error('Failed to log communication error:', logError);
      });
      
      throw error;
    }
  }

  /**
   * Log communication to database
   */
  async logCommunication(data) {
    try {
      // Import the controller dynamically to avoid circular dependencies
      const communicationLogController = require('../controllers/communication-log.controller');
      
      // Log via the controller
      const result = await communicationLogController.logCommunication(data);
      
      if (result) {
        console.log('Communication logged successfully:', {
          recipient: data.recipient,
          status: data.status,
          type: data.type || 'email'
        });
      } else {
        console.warn('Failed to log communication');
      }
      
      return result !== null;
    } catch (error) {
      console.error('Error logging communication:', error);
      return false;
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;