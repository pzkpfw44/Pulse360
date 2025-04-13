// backend/server.js
const app = require('./app');
const { testConnection, syncDatabase } = require('./models');
const { sequelize } = require('./config/database');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Safe function to add the useFullAiSupport column
const addColumnIfMissing = async () => {
  try {
    console.log('Checking for useFullAiSupport column...');
    
    // Check if column exists
    const checkResult = await sequelize.query(
      "PRAGMA table_info(campaigns);",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    // Look for the column in results
    const columnExists = checkResult.some(column => column.name === 'useFullAiSupport');
    
    if (!columnExists) {
      console.log('Column does not exist. Adding it...');
      
      // Add the column - MUCH safer than alter:true
      await sequelize.query(
        "ALTER TABLE campaigns ADD COLUMN useFullAiSupport BOOLEAN DEFAULT 1;",
        { type: sequelize.QueryTypes.RAW }
      );
      
      console.log('Column added successfully!');
    } else {
      console.log('Column already exists. No changes needed.');
    }
  } catch (error) {
    console.error('Error checking/adding column:', error);
    // We'll continue even if this fails - it's not critical
  }
};

// Initialize the database and start the server
const startServer = async () => {
  try {
    // Test database connection
    const isConnected = await testConnection();
    
    if (isConnected) {
      // Add our column safely without altering tables
      await addColumnIfMissing();
      
      // Create communication_logs table if it doesn't exist
      await createCommunicationLogsTable();
      
      // Normal sync without force or alter
      await syncDatabase(false);
      
      // Start the server
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    } else {
      console.error('Database connection failed. Cannot start server.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

// Safe function to create the communication_logs table if it doesn't exist
const createCommunicationLogsTable = async () => {
  try {
    console.log('Checking for communication_logs table...');
    
    // Check if table exists
    const checkResult = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='communication_logs';",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    // If table doesn't exist, create it
    if (checkResult.length === 0) {
      console.log('Creating communication_logs table...');
      
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS communication_logs (
          id TEXT PRIMARY KEY,
          campaignId TEXT,
          participantId TEXT,
          recipient TEXT NOT NULL,
          subject TEXT,
          type TEXT DEFAULT 'email',
          communicationType TEXT DEFAULT 'other',
          status TEXT NOT NULL,
          details TEXT,
          sentAt DATETIME NOT NULL,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL
        );
      `);
      
      console.log('communication_logs table created successfully!');
    } else {
      console.log('communication_logs table already exists. No changes needed.');
    }
  } catch (error) {
    console.error('Error checking/creating communication_logs table:', error);
    // Continue even if this fails - it's not critical
  }
};

startServer();