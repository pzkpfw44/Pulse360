const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

// Route to fix database issues
router.get('/fix-responses', async (req, res) => {
  try {
    // Step 1: Check the real table names
    const tables = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table';",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    const tableNames = tables.map(t => t.name);
    console.log('Available tables:', tableNames);
    
    // Step 2: Rename or recreate the responses table without foreign key constraints
    await sequelize.query("DROP TABLE IF EXISTS responses_old;");
    await sequelize.query("ALTER TABLE responses RENAME TO responses_old;");
    
    // Create new responses table without foreign key constraints
    await sequelize.query(`
      CREATE TABLE responses (
        id CHAR(36) PRIMARY KEY,
        participantId CHAR(36) NOT NULL,
        questionId CHAR(36) NOT NULL,
        ratingValue INTEGER,
        textResponse TEXT,
        aiAnalysis TEXT,
        aiSuggestions TEXT,
        aiInteractions TEXT,
        draftHistory TEXT,
        targetEmployeeId CHAR(36),
        campaignId CHAR(36),
        createdAt DATETIME,
        updatedAt DATETIME
      );
    `);
    
    console.log('Recreated responses table without foreign key constraints');
    
    // Step 3: Try inserting a test record
    const testId = uuidv4();
    
    // Get actual IDs from the database
    const participant = await sequelize.query(
      "SELECT id FROM campaign_participants LIMIT 1;",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    const question = await sequelize.query(
      "SELECT id FROM questions LIMIT 1;",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    const campaign = await sequelize.query(
      "SELECT id FROM campaigns WHERE id = 'e390fa00-ae6c-4c23-a186-fb64727dd8fa';",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    if (participant.length > 0 && question.length > 0 && campaign.length > 0) {
      await sequelize.query(`
        INSERT INTO responses 
        (id, participantId, questionId, ratingValue, textResponse, campaignId, createdAt, updatedAt)
        VALUES (?, ?, ?, 5, 'Test response', ?, datetime('now'), datetime('now'));
      `, {
        replacements: [testId, participant[0].id, question[0].id, campaign[0].id],
        type: sequelize.QueryTypes.INSERT
      });
      
      console.log('Successfully inserted test record');
    }
    
    // Step 4: Verify the fix worked
    const inserted = await sequelize.query(
      "SELECT * FROM responses;",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    return res.status(200).json({
      message: 'Database has been fixed!',
      tables: tableNames,
      inserted: inserted
    });
  } catch (error) {
    console.error('Database fix failed:', error);
    return res.status(500).json({
      message: 'Database fix failed',
      error: error.message
    });
  }
});

module.exports = router;