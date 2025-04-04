// In backend/models/template.model.js

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
  perspective: {
    type: DataTypes.ENUM,
    values: ['manager', 'peer', 'direct_report', 'self', 'external'],
    defaultValue: 'peer',
    allowNull: false
  },
  required: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  ratingScaleId: {
    type: DataTypes.UUID,
    allowNull: true
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

// Rating Scale model
const RatingScale = sequelize.define('RatingScale', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  minValue: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  maxValue: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5
  },
  labels: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'JSON object mapping scale values to labels, e.g. {"1": "Poor", "5": "Outstanding"}'
  },
  defaultForPerspective: {
    type: DataTypes.ENUM,
    values: ['manager', 'peer', 'direct_report', 'self', 'external', 'all'],
    allowNull: true
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
  tableName: 'rating_scales',
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
  purpose: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Purpose of the template, e.g. "360 Assessment for Finance Controller Manager"'
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Department or function this template is for'
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
  perspectiveSettings: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      manager: { questionCount: 10, enabled: true },
      peer: { questionCount: 10, enabled: true },
      direct_report: { questionCount: 10, enabled: true },
      self: { questionCount: 10, enabled: true },
      external: { questionCount: 5, enabled: false }
    },
    comment: 'Settings for each perspective including question counts and enabled status'
  },
  lastAnalysisDate: {
    type: DataTypes.DATE,
    allowNull: true
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

Template.hasMany(RatingScale, {
  as: 'ratingScales',
  foreignKey: 'templateId',
  onDelete: 'CASCADE'
});
RatingScale.belongsTo(Template, { foreignKey: 'templateId' });

Template.hasMany(SourceDocument, { 
  as: 'sourceDocuments',
  foreignKey: 'templateId',
  onDelete: 'CASCADE'
});
SourceDocument.belongsTo(Template, { foreignKey: 'templateId' });

// Questions can have a specific rating scale
Question.belongsTo(RatingScale, { foreignKey: 'ratingScaleId', as: 'ratingScale' });
RatingScale.hasMany(Question, { foreignKey: 'ratingScaleId', as: 'questions' });

module.exports = {
  Template,
  Question,
  SourceDocument,
  RatingScale
};