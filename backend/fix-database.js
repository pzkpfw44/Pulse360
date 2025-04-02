// backend/fix-database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to your SQLite database file
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Starting database repair...');

// Run pragma to check foreign keys
db.get('PRAGMA foreign_keys=OFF', [], (err) => {
  if (err) {
    console.error('Error disabling foreign keys:', err);
    return;
  }
  
  console.log('Foreign keys disabled temporarily');
  
  // First check if campaign_participants table exists
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='campaign_participants'", [], (err, table) => {
    if (err) {
      console.error('Error checking table:', err);
      return;
    }
    
    if (!table) {
      console.log('Creating missing campaign_participants table...');
      // Create a minimal empty version of the table to satisfy constraints
      db.run(`
        CREATE TABLE IF NOT EXISTS campaign_participants (
          id TEXT PRIMARY KEY,
          campaignId TEXT,
          employeeId TEXT,
          relationshipType TEXT,
          status TEXT,
          createdAt DATETIME,
          updatedAt DATETIME
        )
      `, [], (err) => {
        if (err) {
          console.error('Error creating table:', err);
          return;
        }
        console.log('Empty campaign_participants table created successfully');
      });
    } else {
      console.log('Table campaign_participants already exists');
    }
    
    // Now try to clear the template deletion queue
    // First get all templates
    db.all("SELECT id FROM templates", [], (err, templates) => {
      if (err) {
        console.error('Error fetching templates:', err);
        return;
      }
      
      console.log(`Found ${templates.length} templates`);
      
      // Process each template
      templates.forEach(template => {
        // Delete related questions directly
        db.run("DELETE FROM questions WHERE templateId = ?", [template.id], function(err) {
          if (err) {
            console.error(`Error deleting questions for template ${template.id}:`, err);
          } else {
            console.log(`Deleted ${this.changes} questions for template ${template.id}`);
          }
        });
      });
      
      console.log('Database repair completed');
      console.log('You should now be able to delete templates normally.');
      console.log('Re-enabling foreign keys...');
      
      // Re-enable foreign keys when done
      db.get('PRAGMA foreign_keys=ON', [], (err) => {
        if (err) console.error('Error re-enabling foreign keys:', err);
        db.close();
      });
    });
  });
});