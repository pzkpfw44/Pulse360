// Save as backend/direct-email-test.js and run with: node direct-email-test.js

const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('./config/database');

// Replace these with your actual test values
const TEST_EMAIL = 'your-test-email@example.com'; // Replace with where you want to receive the test
const CAMPAIGN_ID = null;  // Optional: add a real campaign ID if needed
const PARTICIPANT_ID = null;  // Optional: add a real participant ID if needed

// SMTP Configuration - REPLACE WITH YOUR ACTUAL VALUES
const SMTP_CONFIG = {
  host: 'smtp.mailtrap.io',    // Replace with your SMTP server
  port: 2525,                  // Replace with your SMTP port
  secure: false,
  auth: {
    user: 'b289d0cc582731', // Replace with your actual SMTP username 
    pass: '715e6191515eb4'  // Replace with your actual SMTP password
  }
};

// Self-executing async function
(async () => {
  try {
    console.log('\n=== DIRECT EMAIL TEST ===');
    console.log(`Target email: ${TEST_EMAIL}`);
    
    // 1. Create a transporter directly
    console.log('Creating SMTP transporter with settings:', {
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: SMTP_CONFIG.secure,
      auth: SMTP_CONFIG.auth ? 'Credentials provided' : 'No credentials'
    });
    
    const transporter = nodemailer.createTransport(SMTP_CONFIG);
    
    // 2. Verify SMTP connection
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');
    
    // 3. Send test email
    console.log(`Sending test email to ${TEST_EMAIL}...`);
    const info = await transporter.sendMail({
      from: '"Pulse360 Test" <test@example.com>',
      to: TEST_EMAIL,
      subject: 'DIRECT TEST - Pulse360 Email Test',
      html: `
        <p><strong>This is a direct test email from Pulse360.</strong></p>
        <p>If you're receiving this, your SMTP configuration is working correctly!</p>
        <p>Time sent: ${new Date().toLocaleString()}</p>
      `
    });
    
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    
    if (info.messageUrl) {
      console.log('Preview URL:', info.messageUrl);
    }
    
    // 4. Log to communication_logs table
    try {
      console.log('Logging to communication_logs table...');
      
      // First check if the table exists
      const tableExists = await sequelize.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='communication_logs';",
        { type: sequelize.QueryTypes.SELECT }
      );
      
      if (tableExists.length === 0) {
        console.log('Table communication_logs doesn\'t exist, creating it...');
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS communication_logs (
            id TEXT PRIMARY KEY,
            campaignId TEXT,
            participantId TEXT,
            recipient TEXT NOT NULL,
            subject TEXT,
            type TEXT NOT NULL,
            communicationType TEXT NOT NULL,
            status TEXT NOT NULL,
            details TEXT,
            sentAt DATETIME NOT NULL,
            createdAt DATETIME NOT NULL,
            updatedAt DATETIME NOT NULL
          );
        `);
        console.log('✅ Table communication_logs created successfully');
      }
      
      // Log the email
      const id = uuidv4();
      const now = new Date().toISOString();
      
      await sequelize.query(
        `INSERT INTO communication_logs 
        (id, campaignId, participantId, recipient, subject, type, communicationType, status, details, sentAt, createdAt, updatedAt) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            id,
            CAMPAIGN_ID,
            PARTICIPANT_ID,
            TEST_EMAIL,
            'DIRECT TEST - Pulse360 Email Test',
            'email',
            'test',
            'sent',
            `Direct test Message ID: ${info.messageId}`,
            now,
            now,
            now
          ],
          type: sequelize.QueryTypes.INSERT
        }
      );
      
      console.log('✅ Communication log entry created successfully');
    } catch (logError) {
      console.error('❌ Error logging to database:', logError);
      console.log('Note: The email was still sent successfully even though logging failed.');
    }
    
    console.log('\n✅ TEST COMPLETED SUCCESSFULLY!');
    
    // Exit the process when done
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    console.error('\nTest failed. Check your SMTP settings and make sure your SMTP server is accessible.');
    process.exit(1);
  }
})();