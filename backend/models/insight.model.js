// backend/models/insight.model.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Insight = sequelize.define('Insight', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM,
    values: ['growth_blueprint', 'leadership_impact', 'team_synergy', 'collaboration_patterns', 
             'talent_landscape', 'culture_pulse', 'development_impact'],
    allowNull: false
  },
  targetEmployeeId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  campaignId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'campaigns',
      key: 'id'
    }
  },
  content: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Contains the full report content with all sections'
  },
  visibility: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      employeeVisible: true,
      managerOnly: true,
      hrOnly: true
    },
    comment: 'Controls which sections are visible to which audience'
  },
  originalAiContent: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Original AI-generated content for comparison'
  },
  status: {
    type: DataTypes.ENUM,
    values: ['draft', 'published', 'archived'],
    defaultValue: 'draft'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
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
  tableName: 'insights',
  timestamps: true
});

module.exports = Insight;