// scripts/add-color-columns.js

const { sequelize } = require('../config/database');

async function addColorColumns() {
  try {
    console.log('Adding color columns to branding_settings table...');
    
    // Check if columns already exist
    try {
      await sequelize.query("SELECT primaryColor FROM branding_settings LIMIT 1");
      console.log('Color columns already exist');
      return;
    } catch (error) {
      // Columns don't exist, proceed with adding them
    }
    
    // Add primaryColor column
    await sequelize.query(
      "ALTER TABLE branding_settings ADD COLUMN primaryColor VARCHAR(255) DEFAULT '#3B82F6'"
    );
    
    // Add secondaryColor column
    await sequelize.query(
      "ALTER TABLE branding_settings ADD COLUMN secondaryColor VARCHAR(255) DEFAULT '#2563EB'"
    );
    
    console.log('Color columns added successfully!');
  } catch (error) {
    console.error('Error adding color columns:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the migration
addColorColumns();