// backend/models/branding-settings.model.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BrandingSettings = sequelize.define('BrandingSettings', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  industry: {
    type: DataTypes.STRING,
    allowNull: true
  },
  keyValues: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tone: {
    type: DataTypes.STRING,
    defaultValue: 'professional',
    allowNull: false
  },
  formality: {
    type: DataTypes.STRING,
    defaultValue: 'formal',
    allowNull: false
  },
  personality: {
    type: DataTypes.STRING,
    defaultValue: 'helpful',
    allowNull: false
  },
  primaryColor: {
    type: DataTypes.STRING,
    defaultValue: '#3B82F6', // Default blue color (matches current theme)
    allowNull: false
  },
  secondaryColor: {
    type: DataTypes.STRING,
    defaultValue: '#2563EB', // Slightly darker blue for gradient effects
    allowNull: true
  },
  userId: {
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
  tableName: 'branding_settings',
  timestamps: true
});

module.exports = BrandingSettings;