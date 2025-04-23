// backend/scripts/fix-insights-table.js

const { sequelize } = require('../models');

async function fixInsightsTable() {
  try {
    console.log('Fixing insights table...');
    
    // Drop the existing table if it exists
    await sequelize.query("DROP TABLE IF EXISTS insights;");
    console.log('Dropped existing insights table');
    
    // Create the insights table with all required columns
    await sequelize.query(`
      CREATE TABLE insights (
        id CHAR(36) PRIMARY KEY,
        campaignId CHAR(36) NOT NULL,
        type VARCHAR(255) NOT NULL,
        status VARCHAR(255) NOT NULL DEFAULT 'generating',
        title VARCHAR(255) NOT NULL,
        content TEXT,
        aiAnalysis TEXT,
        metadata TEXT,
        visibilitySettings TEXT,
        targetEmployeeId CHAR(36),
        createdBy CHAR(36),
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (campaignId) REFERENCES campaigns(id) ON DELETE CASCADE,
        FOREIGN KEY (targetEmployeeId) REFERENCES employees(id) ON DELETE SET NULL,
        FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    
    console.log('Created new insights table with all required columns');
  } catch (error) {
    console.error('Error fixing insights table:', error);
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  fixInsightsTable()
    .then(() => {
      console.log('Table fix completed.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Table fix failed:', err);
      process.exit(1);
    });
}

module.exports = fixInsightsTable;