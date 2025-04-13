// backend/sync-database.js
// Run this script to forcefully create the missing tables

const { sequelize, syncDatabase } = require('./models');

(async () => {
  try {
    console.log('Starting database sync...');
    
    // Only use force: true in development!
    const success = await syncDatabase(true);
    
    if (success) {
      console.log('Database synced successfully!');
    } else {
      console.error('Failed to sync database');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error syncing database:', error);
    process.exit(1);
  }
})();