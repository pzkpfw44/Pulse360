// backend/services/email.service.js

const nodemailer = require('nodemailer');
const { EmailSettings } = require('../models');
const fs = require('fs');
const path = require('path');

// Create a logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Email service singleton
const emailService = {
  transporter: null,
  settings: null,
  initialized: false,
  
  // Initialize the email service
  async init() {
    try {
      // Get the email settings from the database
      const settings = await EmailSettings.findOne();
      
      // If no settings exist yet, create default settings
      if (!settings) {
        this.settings = await EmailSettings.create({
          host: '',
          port: '587',
          secure: false,
          requireAuth: true,
          username: '',
          password: '',
          fromEmail: '',
          fromName: 'Pulse360 Feedback',
          replyTo: '',
          sendReminders: true,
          reminderFrequency: 3,
          maxReminders: 3,
          devMode: true // Default to dev mode for safety
        });
      } else {
        this.settings = settings;
      }
      
      // Only create the transporter if we have all required settings
      if (this.settings.host && this.settings.port && this.settings.fromEmail) {
        // Create nodemailer transporter
        this.transporter = nodemailer.createTransport({
          host: this.settings.host,
          port: this.settings.port,
          secure: this.settings.secure, // true for 465, false for other ports
          auth: this.settings.requireAuth ? {
            user: this.settings.username,
            pass: this.settings.password,
          } : undefined,
        });
      }
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      return false;
    }
  },
  
  // Update email settings
  async updateSettings(newSettings, userId) {
    try {
      // Get the current settings
      let settings = await EmailSettings.findOne();
      
      // If no settings exist, create new settings
      if (!settings) {
        settings = await EmailSettings.create({
          ...newSettings,
          updatedBy: userId
        });
      } else {
        // Update existing settings
        await settings.update({
          ...newSettings,
          updatedBy: userId
        });
      }
      
      // Update the service's settings
      this.settings = settings;
      
      // Recreate the transporter with new settings
      if (settings.host && settings.port && settings.fromEmail) {
        this.transporter = nodemailer.createTransport({
          host: settings.host,
          port: settings.port,
          secure: settings.secure,
          auth: settings.requireAuth ? {
            user: settings.username,
            pass: settings.password,
          } : undefined,
        });
      } else {
        this.transporter = null;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to update email settings:', error);
      throw error;
    }
  },
  
  // Send an email
  async sendEmail(options) {
    try {
      // Initialize if not already initialized
      if (!this.initialized) {
        await this.init();
      }
      
      // Create email options
      const mailOptions = {
        from: this.settings.fromName 
          ? `"${this.settings.fromName}" <${this.settings.fromEmail}>`
          : this.settings.fromEmail,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      };
      
      // Add CC if provided
      if (options.cc) {
        mailOptions.cc = options.cc;
      }
      
      // Add reply-to if configured
      if (this.settings.replyTo) {
        mailOptions.replyTo = this.settings.replyTo;
      }
      
      // Add attachments if provided
      if (options.attachments) {
        mailOptions.attachments = options.attachments;
      }
      
      // If in development mode, log the email instead of sending it
      if (this.settings.devMode) {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const logPath = path.join(logsDir, `email_${timestamp}.json`);
        
        fs.writeFileSync(
          logPath,
          JSON.stringify(mailOptions, null, 2),
          'utf8'
        );
        
        console.log(`[DEV MODE] Email would be sent to ${options.to}. Logged to ${logPath}`);
        return { messageId: `dev-mode-${timestamp}` };
      }
      
      // Check if we have a transporter
      if (!this.transporter) {
        throw new Error('Email service not properly configured');
      }
      
      // Send the email
      const info = await this.transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  },
  
  // Test the email configuration
  async testConnection() {
    try {
      // Initialize if not already initialized
      if (!this.initialized) {
        await this.init();
      }
      
      // If no configuration, return error
      if (!this.settings.host || !this.settings.port || !this.settings.fromEmail) {
        return { 
          success: false, 
          message: 'Email service not properly configured. Please check your settings.' 
        };
      }
      
      // Check if we have a transporter
      if (!this.transporter) {
        throw new Error('Email service not properly configured');
      }
      
      // Test the SMTP connection
      await this.transporter.verify();
      
      // Update the last test timestamp
      await this.settings.update({
        lastTestSent: new Date(),
        lastTestResult: { success: true }
      });
      
      return { 
        success: true, 
        message: 'Email connection test successful! Your SMTP settings are working correctly.' 
      };
    } catch (error) {
      console.error('Email connection test failed:', error);
      
      // Update the last test timestamp and result
      if (this.settings) {
        await this.settings.update({
          lastTestSent: new Date(),
          lastTestResult: { 
            success: false, 
            error: error.message 
          }
        });
      }
      
      return { 
        success: false, 
        message: `Email connection test failed: ${error.message}` 
      };
    }
  },
  
  // Get the current settings
  async getSettings() {
    // Initialize if not already initialized
    if (!this.initialized) {
      await this.init();
    }
    
    return this.settings;
  }
};

module.exports = emailService;