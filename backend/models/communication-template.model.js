// backend/models/communication-template.model.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CommunicationTemplate = sequelize.define('CommunicationTemplate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  templateType: {
    type: DataTypes.ENUM,
    values: ['invitation', 'reminder', 'thank_you', 'instruction'],
    allowNull: false
  },
  recipientType: {
    type: DataTypes.ENUM,
    values: ['manager', 'peer', 'direct_report', 'self', 'external', 'all'],
    allowNull: false
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isAiGenerated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
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
  tableName: 'communication_templates',
  timestamps: true
});

module.exports = CommunicationTemplate;