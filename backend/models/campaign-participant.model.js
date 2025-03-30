// backend/models/campaign-participant.model.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CampaignParticipant = sequelize.define('CampaignParticipant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  campaignId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Campaigns',
      key: 'id'
    }
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Employees',
      key: 'id'
    },
    comment: 'The employee who will provide feedback'
  },
  relationshipType: {
    type: DataTypes.ENUM,
    values: ['manager', 'peer', 'direct_report', 'self', 'external'],
    allowNull: false,
    comment: 'Relationship to the target employee'
  },
  status: {
    type: DataTypes.ENUM,
    values: ['pending', 'invited', 'in_progress', 'completed', 'declined'],
    defaultValue: 'pending'
  },
  invitationToken: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  lastInvitedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  reminderCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  customMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Custom message for this participant'
  },
  aiSuggested: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this participant was suggested by AI'
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
  tableName: 'campaign_participants',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['campaignId', 'employeeId']
    }
  ]
});

module.exports = CampaignParticipant;