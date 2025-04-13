// backend/controllers/communication-log.controller.js

const { CommunicationLog, CampaignParticipant, Employee } = require('../models');

// Get communication logs for a campaign
exports.getCampaignLogs = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    if (!campaignId) {
      return res.status(400).json({ message: 'Campaign ID is required' });
    }
    
    const logs = await CommunicationLog.findAll({
      where: { campaignId },
      order: [['sentAt', 'DESC']],
      include: [
        {
          model: CampaignParticipant,
          as: 'participant',
          include: [
            { model: Employee, as: 'employee' }
          ]
        }
      ]
    });
    
    res.status(200).json({
      count: logs.length,
      logs
    });
  } catch (error) {
    console.error('Error fetching communication logs:', error);
    res.status(500).json({ 
      message: 'Failed to fetch communication logs', 
      error: error.message 
    });
  }
};

// Create a new communication log entry
exports.createLogEntry = async (req, res) => {
  try {
    const { 
      campaignId, 
      participantId, 
      recipient, 
      subject, 
      type, 
      communicationType, 
      status, 
      details 
    } = req.body;
    
    if (!recipient || !status) {
      return res.status(400).json({ 
        message: 'Recipient and status are required' 
      });
    }
    
    const logEntry = await CommunicationLog.create({
      campaignId,
      participantId,
      recipient,
      subject,
      type: type || 'email',
      communicationType: communicationType || 'other',
      status,
      details,
      sentAt: new Date()
    });
    
    res.status(201).json(logEntry);
  } catch (error) {
    console.error('Error creating communication log entry:', error);
    res.status(500).json({ 
      message: 'Failed to create log entry', 
      error: error.message 
    });
  }
};

// Helper function to log communications programmatically
exports.logCommunication = async (data) => {
  try {
    if (!data.recipient || !data.status) {
      console.error('Cannot log communication: missing required fields');
      return null;
    }
    
    const logEntry = await CommunicationLog.create({
      campaignId: data.campaignId,
      participantId: data.participantId,
      recipient: data.recipient,
      subject: data.subject,
      type: data.type || 'email',
      communicationType: data.communicationType || 'other',
      status: data.status,
      details: data.details,
      sentAt: new Date()
    });
    
    return logEntry;
  } catch (error) {
    console.error('Error logging communication:', error);
    return null;
  }
};