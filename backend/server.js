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

startServer();