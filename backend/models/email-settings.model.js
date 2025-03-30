// backend/models/email-settings.model.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EmailSettings = sequelize.define('EmailSettings', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // SMTP settings
  host: {
    type: DataTypes.STRING,
    allowNull: true
  },
  port: {
    type: DataTypes.STRING,
    allowNull: true
  },
  secure: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  requireAuth: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fromEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fromName: {
    type: DataTypes.STRING,
    defaultValue: 'Pulse360 Feedback'
  },
  replyTo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Reminder settings
  sendReminders: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  reminderFrequency: {
    type: DataTypes.INTEGER,
    defaultValue: 3 // days
  },
  maxReminders: {
    type: DataTypes.INTEGER,
    defaultValue: 3
  },
  // Development mode
  devMode: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'If true, emails are logged but not sent'
  },
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  lastTestSent: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastTestResult: {
    type: DataTypes.JSON,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'email_settings',
  timestamps: true
});

module.exports = EmailSettings;