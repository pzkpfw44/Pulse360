// backend/create-log-table.js
// This script will create just the communication_logs table without touching other tables

const { sequelize } = require('./config/database');

(async () => {
  try {
    console.log('Creating communication_logs table...');
    
    // Create the table directly using SQL
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS communication_logs (
        id UUID PRIMARY KEY,
        campaignId UUID,
        participantId UUID,
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
    
    console.log('Communication logs table created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating table:', error);
    process.exit(1);
  }
})();