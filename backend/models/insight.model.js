// backend/models/insight.model.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Insight = sequelize.define('Insight', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  campaignId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'campaigns',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM,
    values: ['growth_blueprint', 'leadership_impact', 'team_synergy', 'collaboration_patterns', 'talent_landscape', 'culture_pulse', 'development_impact'],
    allowNull: false,
    comment: 'Type of insight report'
  },
  status: {
    type: DataTypes.ENUM,
    values: ['generating', 'completed', 'failed'],
    defaultValue: 'generating',
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Structured content of the insight'
  },
  aiAnalysis: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Raw AI analysis results'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional information about the insight'
  },
  visibilitySettings: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Settings for the three-tier visibility structure'
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