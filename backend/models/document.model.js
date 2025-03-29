const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  contentType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false
  },
  documentType: {
    type: DataTypes.ENUM,
    values: [
      'leadership_model', 
      'job_description', 
      'competency_framework', 
      'company_values', 
      'performance_criteria'
    ],
    allowNull: false
  },
  fluxAiFileId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM,
    values: [
      'uploaded', 
      'uploaded_to_ai', 
      'analysis_in_progress', 
      'analysis_complete', 
      'analysis_failed'
    ],
    defaultValue: 'uploaded'
  },
  analysisError: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  associatedTemplateId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Templates',
      key: 'id'
    }
  },
  uploadedBy: {
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
  tableName: 'documents',
  timestamps: true
});

module.exports = Document;