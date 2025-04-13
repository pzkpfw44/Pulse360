// backend/controllers/communication-log.controller.js

const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Get communication logs for a campaign
exports.getCampaignLogs = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    if (!campaignId) {
      return res.status(400).json({ message: 'Campaign ID is required' });
    }
    
    // Use raw query to avoid model issues
    const logs = await sequelize.query(
      `SELECT * FROM communication_logs WHERE campaignId = ? ORDER BY sentAt DESC`,
      {
        replacements: [campaignId],
        type: sequelize.QueryTypes.SELECT
      }
    );
    
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
    
    // Use raw query to insert log
    const id = uuidv4();
    const now = new Date().toISOString();
    
    await sequelize.query(
      `INSERT INTO communication_logs 
      (id, campaignId, participantId, recipient, subject, type, communicationType, status, details, sentAt, createdAt, updatedAt) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          id,
          campaignId || null,
          participantId || null,
          recipient,
          subject || null,
          type || 'email',
          communicationType || 'other',
          status,
          details || null,
          now,
          now,
          now
        ],
        type: sequelize.QueryTypes.INSERT
      }
    );
    
    res.status(201).json({ 
      id, 
      campaignId, 
      participantId,
      recipient,
      subject,
      type: type || 'email',
      communicationType: communicationType || 'other',
      status,
      details,
      sentAt: now,
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    console.error('Error creating communication log entry:', error);
    res.status(500).json({ 
      message: 'Failed to create log entry', 
      error: error.message 
    });
  }
};

// Helper function to log communications programmatically - directly using SQL
exports.logCommunication = async (data) => {
  try {
    console.log('Logging communication for:', data.recipient);
    
    if (!data.recipient || !data.status) {
      console.error('Cannot log communication: missing required fields');
      return null;
    }
    
    // Generate UUID and date
    const id = uuidv4();
    const now = new Date().toISOString();
    
    try {
      // Insert directly with SQL to avoid model issues
      await sequelize.query(
        `INSERT INTO communication_logs 
        (id, campaignId, participantId, recipient, subject, type, communicationType, status, details, sentAt, createdAt, updatedAt) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            id,
            data.campaignId || null,
            data.participantId || null,
            data.recipient,
            data.subject || null,
            data.type || 'email',
            data.communicationType || 'other',
            data.status,
            data.details || null,
            now,
            now,
            now
          ],
          type: sequelize.QueryTypes.INSERT
        }
      );
      
      console.log(`Created log entry with ID: ${id}`);
      
      return {
        id,
        recipient: data.recipient,
        status: data.status,
        sentAt: now
      };
    } catch (insertError) {
      console.error('Error inserting communication log:', insertError);
      
      // If there's a table issue, try to create the table first
      if (insertError.message.includes('no such table')) {
        try {
          console.log('Attempting to create communication_logs table...');
          await sequelize.query(`
            CREATE TABLE IF NOT EXISTS communication_logs (
              id TEXT PRIMARY KEY,
              campaignId TEXT,
              participantId TEXT,
              recipient TEXT NOT NULL,
              subject TEXT,
              type TEXT NOT NULL,
              communicationType TEXT NOT NULL,
              status TEXT NOT NULL,
              details TEXT,
              sentAt DATETIME NOT NULL,
              createdAt DATETIME NOT NULL,
              updatedAt DATETIME NOT NULL
            );
          `);
          
          // Try insertion again
          await sequelize.query(
            `INSERT INTO communication_logs 
            (id, recipient, subject, type, communicationType, status, details, sentAt, createdAt, updatedAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            {
              replacements: [
                id,
                data.recipient,
                data.subject || null,
                data.type || 'email',
                data.communicationType || 'other',
                data.status,
                data.details || null,
                now,
                now,
                now
              ],
              type: sequelize.QueryTypes.INSERT
            }
          );
          
          console.log(`Created log entry with ID: ${id} after creating table`);
          return { id, recipient: data.recipient, status: data.status, sentAt: now };
        } catch (tableCreateError) {
          console.error('Failed to create table:', tableCreateError);
          return null;
        }
      }
      
      return null;
    }
  } catch (error) {
    console.error('Unexpected error in logCommunication:', error);
    return null;
  }
};