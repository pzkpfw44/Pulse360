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

// Add the missing columns to the responses table
const addResponseTableColumns = async () => {
  try {
    console.log('Checking for missing columns in responses table...');
    
    // Check if responses table exists
    const tablesResult = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='responses';",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    if (tablesResult.length === 0) {
      console.log('Responses table does not exist yet, will be created during sync');
      return;
    }
    
    // Check existing columns
    const columnsResult = await sequelize.query(
      "PRAGMA table_info(responses);",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    const columnNames = columnsResult.map(col => col.name);
    
    // Add targetEmployeeId if missing
    if (!columnNames.includes('targetEmployeeId')) {
      console.log('Adding targetEmployeeId column to responses table...');
      await sequelize.query(
        "ALTER TABLE responses ADD COLUMN targetEmployeeId TEXT REFERENCES employees(id);",
        { type: sequelize.QueryTypes.RAW }
      );
      console.log('targetEmployeeId column added successfully!');
    }
    
    // Add campaignId if missing
    if (!columnNames.includes('campaignId')) {
      console.log('Adding campaignId column to responses table...');
      await sequelize.query(
        "ALTER TABLE responses ADD COLUMN campaignId TEXT REFERENCES campaigns(id);",
        { type: sequelize.QueryTypes.RAW }
      );
      console.log('campaignId column added successfully!');
    }
    
    // Add aiAnalysis if missing
    if (!columnNames.includes('aiAnalysis')) {
      console.log('Adding aiAnalysis column to responses table...');
      await sequelize.query(
        "ALTER TABLE responses ADD COLUMN aiAnalysis JSON;",
        { type: sequelize.QueryTypes.RAW }
      );
      console.log('aiAnalysis column added successfully!');
    }
    
    // Add aiSuggestions if missing
    if (!columnNames.includes('aiSuggestions')) {
      console.log('Adding aiSuggestions column to responses table...');
      await sequelize.query(
        "ALTER TABLE responses ADD COLUMN aiSuggestions TEXT;",
        { type: sequelize.QueryTypes.RAW }
      );
      console.log('aiSuggestions column added successfully!');
    }
    
    // Add aiInteractions if missing
    if (!columnNames.includes('aiInteractions')) {
      console.log('Adding aiInteractions column to responses table...');
      await sequelize.query(
        "ALTER TABLE responses ADD COLUMN aiInteractions JSON;",
        { type: sequelize.QueryTypes.RAW }
      );
      console.log('aiInteractions column added successfully!');
    }
    
    // Add draftHistory if missing
    if (!columnNames.includes('draftHistory')) {
      console.log('Adding draftHistory column to responses table...');
      await sequelize.query(
        "ALTER TABLE responses ADD COLUMN draftHistory JSON;",
        { type: sequelize.QueryTypes.RAW }
      );
      console.log('draftHistory column added successfully!');
    }
    
  } catch (error) {
    console.error('Error checking/adding columns to responses table:', error);
    // Continue even if this fails - it's not critical
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
      
      // Add the missing columns to responses table
      await addResponseTableColumns();
      
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