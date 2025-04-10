// backend/models/index.js

const { sequelize, testConnection } = require('../config/database');
const { Op } = require('sequelize');
const User = require('./user.model');
const Document = require('./document.model');
const Employee = require('./employee.model');
const Campaign = require('./campaign.model');
const CampaignParticipant = require('./campaign-participant.model');
const Response = require('./response.model');
const EmailSettings = require('./email-settings.model');
const CommunicationTemplate = require('./communication-template.model');
const { Template, Question, SourceDocument, RatingScale } = require('./template.model');

// Define associations between models
User.hasMany(Document, { foreignKey: 'uploadedBy' });
Document.belongsTo(User, { foreignKey: 'uploadedBy' });

User.hasMany(Template, { foreignKey: 'createdBy' });
Template.belongsTo(User, { foreignKey: 'createdBy' });

Document.belongsTo(Template, { foreignKey: 'associatedTemplateId' });
Template.hasMany(Document, { foreignKey: 'associatedTemplateId', onDelete: 'CASCADE' });

// Campaign associations
User.hasMany(Campaign, { foreignKey: 'createdBy', as: 'campaigns' });
Campaign.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

User.hasMany(CommunicationTemplate, { foreignKey: 'createdBy' });
CommunicationTemplate.belongsTo(User, { foreignKey: 'createdBy' });

// Updated: Add onDelete: 'SET NULL' to Template-Campaign association
Template.hasMany(Campaign, { 
  foreignKey: 'templateId',
  onDelete: 'SET NULL'  // This makes it so deleting a template won't fail if campaigns exist
});
Campaign.belongsTo(Template, { 
  foreignKey: 'templateId', 
  as: 'template',
  onDelete: 'SET NULL'
});

Employee.hasMany(Campaign, { foreignKey: 'targetEmployeeId', as: 'targetedCampaigns' });
Campaign.belongsTo(Employee, { foreignKey: 'targetEmployeeId', as: 'targetEmployee' });

// Campaign Participant associations
Campaign.hasMany(CampaignParticipant, { foreignKey: 'campaignId', as: 'participants', onDelete: 'CASCADE' });
CampaignParticipant.belongsTo(Campaign, { foreignKey: 'campaignId' });

Employee.hasMany(CampaignParticipant, { foreignKey: 'employeeId', as: 'participations' });
CampaignParticipant.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

// Response associations
CampaignParticipant.hasMany(Response, { foreignKey: 'participantId', as: 'responses', onDelete: 'CASCADE' });
Response.belongsTo(CampaignParticipant, { foreignKey: 'participantId' });

Question.hasMany(Response, { foreignKey: 'questionId' });
Response.belongsTo(Question, { foreignKey: 'questionId' });

// Email Settings associations
User.hasMany(EmailSettings, { foreignKey: 'updatedBy' });
EmailSettings.belongsTo(User, { foreignKey: 'updatedBy' });

// Function to sync all models with the database - improved with better logging
const syncDatabase = async (force = false) => {
  try {
    // Add logging to see what's happening
    console.log(`Synchronizing database (force: ${force})...`);
    
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
  Employee,
  Template,
  Question,
  SourceDocument,
  RatingScale,
  Campaign,
  CampaignParticipant,
  Response,
  EmailSettings,
  CommunicationTemplate,
  Op 
};