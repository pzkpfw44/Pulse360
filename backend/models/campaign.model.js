// backend/models/campaign.model.js

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
  status: {
    type: DataTypes.ENUM,
    values: ['draft', 'active', 'paused', 'completed', 'canceled'],
    defaultValue: 'draft'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reminderFrequency: {
    type: DataTypes.INTEGER,
    defaultValue: 7, // Default to weekly reminders
    comment: 'Reminder frequency in days'
  },
  templateId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Templates',
      key: 'id'
    }
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  lastReminderSent: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completionRate: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  targetEmployeeId: {
    type: DataTypes.UUID,
    allowNull: true, // Change this from false to true
    references: {
      model: 'Employees',
      key: 'id'
    },
    comment: 'The employee who is the subject of the 360 feedback'
  },
  settings: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional campaign settings (e.g., anonymity level, custom messaging)'
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