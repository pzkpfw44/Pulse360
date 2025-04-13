// Save this as debug-email.js in the backend folder
const emailService = require('./services/email.service');
const { EmailSettings } = require('./models');

// Self-executing async function
(async () => {
  try {
    console.log('Starting email debug script...');
    
    // Get the current email settings
    const settings = await EmailSettings.findOne();
    console.log('Current email settings:');
    console.log({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      username: settings.username ? '(set)' : '(not set)',
      fromEmail: settings.fromEmail || '(not set)',
      fromName: settings.fromName || '(not set)',
      devMode: settings.devMode
    });
    
    // Check if devMode is enabled
    if (settings.devMode) {
      console.log('\n⚠️ WARNING: DEV MODE IS ENABLED - EMAILS WILL NOT BE SENT');
      console.log('Updating devMode to false...');
      
      await settings.update({ devMode: false });
      console.log('devMode updated to false');
    }
    
    // Verify email service can initialize
    console.log('\nInitializing email service...');
    const initialized = await emailService.initialize();
    console.log(`Email service initialized: ${initialized}`);
    
    // Try sending a test email
    if (initialized) {
      console.log('\nAttempting to send test email...');
      try {
        const result = await emailService.sendEmail({
          to: settings.fromEmail || 'test@example.com', // Send to self as test
          subject: 'Pulse360 Test Email',
          html: '<p>This is a test email to verify the email service is working.</p>',
          communicationType: 'test'
        });
        console.log('Test email result:', result);
      } catch (emailError) {
        console.error('Error sending test email:', emailError.message);
      }
    }
    
    console.log('\nEmail debug complete');
    process.exit(0);
  } catch (error) {
    console.error('Error in debug script:', error);
    process.exit(1);
  }
})();