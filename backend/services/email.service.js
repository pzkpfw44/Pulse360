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
      return true;
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
      // Try to find existing settings
      let settings = await EmailSettings.findOne();
      
      // If no settings exist, create new settings
      if (!settings) {
        settings = await EmailSettings.create({
          ...newSettings,
          updatedBy: userId
        });
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
      }
      
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
      const verifyResult = await this.transporter.verify();
      
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
   */
  async sendEmail(options) {
    try {
      // Make sure service is initialized
      if (!this.initialized) {
        const success = await this.initialize();
        if (!success) {
          throw new Error('Email service not initialized');
        }
      }
      
      // Check for dev mode
      if (this.settings.devMode) {
        console.log('DEV MODE: Email not sent. Details:');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Content: ${options.text || options.html}`);
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
      const info = await this.transporter.sendMail(mailOptions);
      
      return { sent: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;