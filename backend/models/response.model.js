// backend/models/response.model.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Response = sequelize.define('Response', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  participantId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'CampaignParticipants',
      key: 'id'
    }
  },
  questionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Questions',
      key: 'id'
    }
  },
  ratingValue: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Numeric rating value for rating questions'
  },
  textResponse: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Text response for open-ended questions'
  },
  aiAnalysis: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'AI analysis of the response (sentiment, themes, etc.)'
  },
  aiSuggestions: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'AI-generated suggestions for improving the response'
  },
  aiInteractions: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Record of AI interactions during response drafting'
  },
  draftHistory: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'History of response drafts'
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
  tableName: 'responses',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['participantId', 'questionId']
    }
  ]
});

module.exports = Response;