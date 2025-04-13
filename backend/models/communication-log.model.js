// backend/models/communication-log.model.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CommunicationLog = sequelize.define('CommunicationLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  campaignId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'campaigns', // Use lowercase table name, not model name
      key: 'id'
    }
  },
  participantId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'campaign_participants', // Use lowercase table name, not model name
      key: 'id'
    }
  },
  recipient: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Email address or identifier of recipient'
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Subject line of communication'
  },
  type: {
    type: DataTypes.ENUM,
    values: ['email', 'sms', 'notification'],
    defaultValue: 'email',
    comment: 'Type of communication'
  },
  communicationType: {
    type: DataTypes.ENUM,
    values: ['invitation', 'reminder', 'thank_you', 'instruction', 'other'],
    defaultValue: 'other',
    comment: 'Purpose of the communication'
  },
  status: {
    type: DataTypes.ENUM,
    values: ['sent', 'failed', 'pending', 'simulated'],
    defaultValue: 'pending',
    comment: 'Status of the communication'
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional details or error message'
  },
  sentAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
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
  tableName: 'communication_logs',
  timestamps: true
});

module.exports = CommunicationLog;