const { sequelize, testConnection } = require('../config/database');
const User = require('./user.model');
const Document = require('./document.model');
const { Template, Question, SourceDocument, RatingScale } = require('./template.model');

// Define associations between models
User.hasMany(Document, { foreignKey: 'uploadedBy' });
Document.belongsTo(User, { foreignKey: 'uploadedBy' });

User.hasMany(Template, { foreignKey: 'createdBy' });
Template.belongsTo(User, { foreignKey: 'createdBy' });

Document.belongsTo(Template, { foreignKey: 'associatedTemplateId' });
Template.hasMany(Document, { foreignKey: 'associatedTemplateId' });

// Function to sync all models with the database
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log('Database synchronized successfully');
    
    // Create a default admin user if none exists
    if (force || (await User.count()) === 0) {
      await User.create({
        name: 'Admin User',
        email: 'admin@pulse360.com',
        password: 'adminpassword',
        role: 'admin'
      });
      console.log('Default admin user created');
    }
    
    return true;
  } catch (error) {
    console.error('Error synchronizing database:', error);
    return false;
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase,
  User,
  Document,
  Template,
  Question,
  SourceDocument,
  RatingScale
};