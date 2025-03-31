// backend/models/index.js

const { sequelize, testConnection } = require('../config/database');
const User = require('./user.model');
const Document = require('./document.model');
const Employee = require('./employee.model');
const Campaign = require('./campaign.model');
const CampaignParticipant = require('./campaign-participant.model');
const Response = require('./response.model');
const EmailSettings = require('./email-settings.model');
const { Template, Question, SourceDocument, RatingScale } = require('./template.model');

// Define associations between models
User.hasMany(Document, { foreignKey: 'uploadedBy' });
Document.belongsTo(User, { foreignKey: 'uploadedBy' });

User.hasMany(Template, { foreignKey: 'createdBy' });
Template.belongsTo(User, { foreignKey: 'createdBy' });

Document.belongsTo(Template, { foreignKey: 'associatedTemplateId' });
Template.hasMany(Document, { foreignKey: 'associatedTemplateId' });

// Campaign associations
User.hasMany(Campaign, { foreignKey: 'createdBy', as: 'campaigns' });
Campaign.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Template.hasMany(Campaign, { foreignKey: 'templateId' });
Campaign.belongsTo(Template, { foreignKey: 'templateId', as: 'template' });

Employee.hasMany(Campaign, { foreignKey: 'targetEmployeeId', as: 'targetedCampaigns' });
Campaign.belongsTo(Employee, { foreignKey: 'targetEmployeeId', as: 'targetEmployee' });

// Campaign Participant associations
Campaign.hasMany(CampaignParticipant, { foreignKey: 'campaignId', as: 'participants' });
CampaignParticipant.belongsTo(Campaign, { foreignKey: 'campaignId' });

Employee.hasMany(CampaignParticipant, { foreignKey: 'employeeId', as: 'participations' });
CampaignParticipant.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

// Response associations
CampaignParticipant.hasMany(Response, { foreignKey: 'participantId', as: 'responses' });
Response.belongsTo(CampaignParticipant, { foreignKey: 'participantId' });

Question.hasMany(Response, { foreignKey: 'questionId' });
Response.belongsTo(Question, { foreignKey: 'questionId' });

// Email Settings associations
User.hasMany(EmailSettings, { foreignKey: 'updatedBy' });
EmailSettings.belongsTo(User, { foreignKey: 'updatedBy' });

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
  Employee,
  Template,
  Question,
  SourceDocument,
  RatingScale,
  Campaign,
  CampaignParticipant,
  Response,
  EmailSettings
};