// backend/migrations/add-useFullAiSupport-column.js

const { sequelize } = require('../config/database');

async function addColumnIfNotExists() {
  try {
    console.log('Starting migration: Adding useFullAiSupport column to campaigns table');
    
    // Check if column exists
    const checkResult = await sequelize.query(
      "PRAGMA table_info(campaigns);",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    // Look for the column in results
    const columnExists = checkResult.some(column => column.name === 'useFullAiSupport');
    
    if (!columnExists) {
      console.log('Column does not exist. Adding it...');
      
      // Add the column
      await sequelize.query(
        "ALTER TABLE campaigns ADD COLUMN useFullAiSupport BOOLEAN DEFAULT 1;",
        { type: sequelize.QueryTypes.RAW }
      );
      
      console.log('Column added successfully!');
    } else {
      console.log('Column already exists. Skipping migration.');
    }
    
    return { success: true, message: 'Migration completed' };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error };
  }
}

// If this file is run directly
if (require.main === module) {
  addColumnIfNotExists()
    .then(result => {
      console.log(result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Unexpected error:', err);
      process.exit(1);
    });
}

module.exports = addColumnIfNotExists;