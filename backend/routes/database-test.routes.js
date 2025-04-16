const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

// Route to check if responses table exists and test direct insert
router.get('/test-responses', async (req, res) => {
  try {
    // 1. Check if foreign keys are enabled
    const fkResult = await sequelize.query(
      "PRAGMA foreign_keys;", 
      { type: sequelize.QueryTypes.SELECT }
    );
    
    // 2. Check for responses table
    const tableCheck = await sequelize.query(
      "SELECT name, sql FROM sqlite_master WHERE type='table' AND name='responses';",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    // 3. Count all responses in the database
    let responseCount = 0;
    try {
      const countResult = await sequelize.query(
        "SELECT COUNT(*) as count FROM responses;", 
        { type: sequelize.QueryTypes.SELECT }
      );
      responseCount = countResult[0].count;
    } catch (err) {
      console.error('Error counting responses:', err);
    }
    
    // 4. Try to force-create the table if it doesn't exist properly
    let tableCreated = false;
    if (tableCheck.length === 0) {
      try {
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS responses (
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
            createdAt DATETIME NOT NULL,
            updatedAt DATETIME NOT NULL
          );
        `);
        tableCreated = true;
      } catch (createErr) {
        console.error('Error creating table:', createErr);
      }
    }
    
    // 5. Try a direct insert
    let insertResult = null;
    try {
      const testId = uuidv4();
      
      // Get an actual participant ID from the database
      const participant = await sequelize.query(
        "SELECT id FROM campaign_participants LIMIT 1;",
        { type: sequelize.QueryTypes.SELECT }
      );
      
      // Get an actual question ID from the database
      const question = await sequelize.query(
        "SELECT id FROM questions LIMIT 1;",
        { type: sequelize.QueryTypes.SELECT }
      );
      
      // Get the campaign ID
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
        
        // Verify the insert
        const inserted = await sequelize.query(
          "SELECT * FROM responses WHERE id = ?;",
          { 
            replacements: [testId],
            type: sequelize.QueryTypes.SELECT 
          }
        );
        
        insertResult = inserted;
      }
    } catch (insertErr) {
      console.error('Error inserting test record:', insertErr);
      insertResult = { error: insertErr.message };
    }
    
    // 6. Enable foreign keys if they're not enabled
    try {
      await sequelize.query("PRAGMA foreign_keys = ON;");
    } catch (pragmaErr) {
      console.error('Error enabling foreign keys:', pragmaErr);
    }
    
    return res.status(200).json({
      foreignKeysEnabled: fkResult[0].foreign_keys === 1,
      tableExists: tableCheck.length > 0,
      tableSchema: tableCheck.length > 0 ? tableCheck[0].sql : null,
      tableCreated,
      responseCount,
      insertResult
    });
  } catch (error) {
    console.error('Database test failed:', error);
    return res.status(500).json({
      message: 'Database test failed',
      error: error.message
    });
  }
});

module.exports = router;