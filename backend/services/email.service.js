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
      console.log('\n=== SENDING EMAIL ===');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Campaign ID: ${options.campaignId || 'Not provided'}`);
  
      // Make sure service is initialized
      if (!this.initialized) {
        console.log('Email service not initialized, initializing now...');
        const success = await this.initialize();
        if (!success) {
          console.error('Failed to initialize email service before sending');
          throw new Error('Email service not initialized');
        }
        console.log('Email service initialized successfully');
      }
      
      // Re-check settings from database to ensure we have the latest
      const freshSettings = await EmailSettings.findOne();
      if (!freshSettings) {
        console.error('No email settings found in database!');
        throw new Error('Email settings not found');
      }
      
      // Allow for explicitly passing devMode to override settings
      // This is a critical change - check if devMode is explicitly set in options
      const devMode = options.devMode !== undefined ? options.devMode : freshSettings.devMode;
      console.log(`Using devMode: ${devMode} (${options.devMode !== undefined ? 'from parameter' : 'from settings'})`);
      
      // Check for dev mode
      if (devMode) {
        console.log('DEV MODE is enabled but we will still send the actual email');
        // Continue execution and don't return early
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
      console.log(`Sending actual email to ${options.to}...`);
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully! Message ID: ${info.messageId}`);
      
      // Log this communication in the database using direct SQL
      try {
        // Use raw query to directly insert
        const { sequelize } = require('../config/database');
        const { v4: uuidv4 } = require('uuid');
        const id = uuidv4();
        const now = new Date().toISOString();
        
        await sequelize.query(
          `INSERT INTO communication_logs 
          (id, campaignId, participantId, recipient, subject, type, communicationType, status, details, sentAt, createdAt, updatedAt) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          {
            replacements: [
              id,
              options.campaignId || null,
              options.participantId || null,
              options.to,
              options.subject || null,
              'email',
              options.communicationType || 'other',
              'sent',
              `Message ID: ${info.messageId}`,
              now,
              now,
              now
            ],
            type: sequelize.QueryTypes.INSERT
          }
        );
        
        console.log('Created log entry for sent email');
      } catch (logError) {
        console.error('Error logging sent email:', logError);
      }
      
      return { sent: true, messageId: info.messageId };
    } catch (error) {
      console.error(`Error sending email to ${options.to}:`, error);
      
      // Log the failed communication
      try {
        // Use raw query to directly insert error
        const { sequelize } = require('../config/database');
        const { v4: uuidv4 } = require('uuid');
        const id = uuidv4();
        const now = new Date().toISOString();
        
        await sequelize.query(
          `INSERT INTO communication_logs 
          (id, campaignId, participantId, recipient, subject, type, communicationType, status, details, sentAt, createdAt, updatedAt) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          {
            replacements: [
              id,
              options.campaignId || null,
              options.participantId || null,
              options.to,
              options.subject || null,
              'email',
              options.communicationType || 'other',
              'failed',
              `Error: ${error.message}`,
              now,
              now,
              now
            ],
            type: sequelize.QueryTypes.INSERT
          }
        );
        
        console.log('Created log entry for failed email');
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
      
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
      
      // First try logging with just the essential fields in case there are reference issues
      const essentialData = {
        recipient: data.recipient,
        subject: data.subject,
        type: data.type || 'email',
        status: data.status,
        details: data.details,
        communicationType: data.communicationType || 'other'
      };
      
      // Only add IDs if they are provided to prevent foreign key errors
      if (data.campaignId) {
        essentialData.campaignId = data.campaignId;
      }
      
      if (data.participantId) {
        essentialData.participantId = data.participantId;
      }
      
      // Log via the controller
      const result = await communicationLogController.logCommunication(essentialData);
      
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