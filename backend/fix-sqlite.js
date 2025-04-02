// fix-sqlite.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database.sqlite');

console.log(`Opening database at: ${dbPath}`);
const db = new sqlite3.Database(dbPath);

// Disable foreign keys and fix the issues
db.serialize(() => {
  // Disable foreign keys
  db.run('PRAGMA foreign_keys = OFF;', [], err => {
    if (err) console.error('Error disabling foreign keys:', err);
    else console.log('Foreign keys disabled');
  });
  
  // Create or recreate campaign_participants table
  console.log('Ensuring campaign_participants table exists...');
  db.run(`
    CREATE TABLE IF NOT EXISTS campaign_participants (
      id TEXT PRIMARY KEY,
      campaignId TEXT,
      employeeId TEXT, 
      relationshipType TEXT,
      status TEXT,
      invitationToken TEXT,
      lastInvitedAt DATETIME,
      completedAt DATETIME,
      reminderCount INTEGER,
      customMessage TEXT,
      aiSuggested BOOLEAN,
      createdAt DATETIME,
      updatedAt DATETIME
    )
  `, [], err => {
    if (err) {
      console.error('Error creating/updating table:', err);
    } else {
      console.log('Table campaign_participants ready');
      
      // Create empty response table if needed
      db.run(`
        CREATE TABLE IF NOT EXISTS responses (
          id TEXT PRIMARY KEY,
          participantId TEXT,
          questionId TEXT,
          ratingValue INTEGER,
          textResponse TEXT,
          aiAnalysis TEXT,
          aiSuggestions TEXT,
          aiInteractions TEXT,
          draftHistory TEXT,
          createdAt DATETIME,
          updatedAt DATETIME
        )
      `, [], err => {
        if (err) {
          console.error('Error creating responses table:', err);
        } else {
          console.log('Responses table ready');
          
          // Re-enable foreign keys
          db.run('PRAGMA foreign_keys = ON;', [], err => {
            if (err) console.error('Error enabling foreign keys:', err);
            else console.log('Foreign keys re-enabled');
            
            console.log('Database fix complete. Try restarting your server and deleting templates.');
            db.close();
          });
        }
      });
    }
  });
});