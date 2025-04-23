const { sequelize } = require('../models');

async function createInsightsTable() {
  try {
    console.log('Creating insights table...');
    
    // Check if table already exists
    const tableCheck = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='insights';",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    if (tableCheck.length > 0) {
      console.log('Insights table already exists.');
      return;
    }
    
    // Create the insights table
    await sequelize.query(`
      CREATE TABLE insights (
        id CHAR(36) PRIMARY KEY,
        campaignId CHAR(36) NOT NULL,
        targetEmployeeId CHAR(36),
        type VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        originalAiContent TEXT,
        status VARCHAR(255) NOT NULL DEFAULT 'draft',
        visibility TEXT,
        createdBy CHAR(36) NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        FOREIGN KEY (campaignId) REFERENCES campaigns(id) ON DELETE CASCADE,
        FOREIGN KEY (targetEmployeeId) REFERENCES employees(id) ON DELETE SET NULL,
        FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    
    console.log('Insights table created successfully.');
  } catch (error) {
    console.error('Error creating insights table:', error);
  }
}

// Run the function if this file is executed directly
if (require.main === module) {
  createInsightsTable()
    .then(() => {
      console.log('Script completed.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Script failed:', err);
      process.exit(1);
    });
}

module.exports = createInsightsTable;