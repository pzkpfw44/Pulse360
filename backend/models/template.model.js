const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Question model (to be used within Template)
const Question = sequelize.define('Question', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM,
    values: ['rating', 'open_ended', 'multiple_choice'],
    defaultValue: 'rating'
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  required: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  templateId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Templates',
      key: 'id'
    }
  }
}, {
  tableName: 'questions',
  timestamps: true
});

// SourceDocument model (to be used within Template)
const SourceDocument = sequelize.define('SourceDocument', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  fluxAiFileId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  documentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Documents',
      key: 'id'
    }
  },
  templateId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Templates',
      key: 'id'
    }
  }
}, {
  tableName: 'source_documents',
  timestamps: true
});

// Template model
const Template = sequelize.define('Template', {
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
  generatedBy: {
    type: DataTypes.ENUM,
    values: ['flux_ai', 'manual'],
    defaultValue: 'flux_ai'
  },
  status: {
    type: DataTypes.ENUM,
    values: ['pending_review', 'approved', 'archived'],
    defaultValue: 'pending_review'
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
  tableName: 'templates',
  timestamps: true
});

// Define associations
Template.hasMany(Question, { 
  as: 'questions',
  foreignKey: 'templateId',
  onDelete: 'CASCADE'
});
Question.belongsTo(Template, { foreignKey: 'templateId' });

Template.hasMany(SourceDocument, { 
  as: 'sourceDocuments',
  foreignKey: 'templateId',
  onDelete: 'CASCADE'
});
SourceDocument.belongsTo(Template, { foreignKey: 'templateId' });

module.exports = {
  Template,
  Question,
  SourceDocument
};