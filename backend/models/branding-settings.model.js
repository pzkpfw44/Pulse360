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