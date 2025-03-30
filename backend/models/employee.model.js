// backend/models/employee.model.js

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  employeeId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Company employee identifier'
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  jobTitle: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mainFunction: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Primary department or function (e.g., Finance, IT, Marketing)'
  },
  subFunction: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Specialized area within the main function'
  },
  levelIdentification: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Grade, band, or qualitative level (e.g., Director, Manager)'
  },
  managerId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Direct manager employee ID'
  },
  secondLevelManagerId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Second level manager employee ID'
  },
  status: {
    type: DataTypes.ENUM,
    values: ['active', 'inactive'],
    defaultValue: 'active'
  },
  importedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  lastUpdatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  importBatch: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Reference to the import operation that created/updated this record'
  }
}, {
  tableName: 'employees',
  timestamps: true,
  hooks: {
    beforeUpdate: (employee) => {
      employee.lastUpdatedAt = new Date();
    }
  }
});

module.exports = Employee;