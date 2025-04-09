// backend/models/campaign.model.js
// Add this field to the Campaign model schema

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Campaign = sequelize.define('Campaign', {
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
  startDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM,
    values: ['draft', 'active', 'completed', 'canceled'],
    defaultValue: 'draft'
  },
  templateId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Templates',
      key: 'id'
    }
  },
  targetEmployeeId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Employees',
      key: 'id'
    }
  },
  completionRate: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  lastReminderSent: {
    type: DataTypes.DATE,
    allowNull: true
  },
  settings: {
    type: DataTypes.JSON,
    allowNull: true
  },
  // New field for AI support preference
  useFullAiSupport: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
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
  tableName: 'campaigns',
  timestamps: true
});

module.exports = Campaign;