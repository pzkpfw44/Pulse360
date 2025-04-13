// backend/disable-dev-mode.js

const { sequelize } = require('./config/database');
const { EmailSettings } = require('./models');

(async () => {
  try {
    console.log('Checking email settings...');
    
    // Get current settings
    const settings = await EmailSettings.findOne();
    
    if (!settings) {
      console.log('No email settings found, creating default settings with devMode=false');
      
      await EmailSettings.create({
        host: 'smtp.mailtrap.io',
        port: '2525',
        secure: false,
        requireAuth: true,
        username: settings ? settings.username : '',
        password: settings ? settings.password : '',
        fromEmail: settings ? settings.fromEmail : 'from@example.com',
        fromName: 'Pulse360 Feedback',
        sendReminders: true,
        reminderFrequency: 3,
        maxReminders: 3,
        devMode: false
      });
      
      console.log('Created new settings with devMode=false');
    } else {
      console.log('Current settings:');
      console.log({
        host: settings.host,
        port: settings.port,
        fromEmail: settings.fromEmail,
        devMode: settings.devMode
      });
      
      // Force update devMode to false directly in database
      if (settings.devMode) {
        console.log('Forcing devMode to false...');
        
        // Use direct SQL update to ensure it works
        await sequelize.query('UPDATE email_settings SET devMode = 0;');
        
        console.log('DevMode disabled via direct SQL update');
        
        // Verify the change
        const updated = await EmailSettings.findOne();
        console.log(`Verification - devMode is now: ${updated.devMode}`);
      } else {
        console.log('DevMode is already false, no changes needed');
      }
    }
    
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();