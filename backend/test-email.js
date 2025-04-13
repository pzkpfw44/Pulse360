// Create this file as backend/test-email.js
// This is a standalone script that bypasses all the Pulse360 code and directly tests SMTP

const nodemailer = require('nodemailer');

(async () => {
  try {
    console.log('Testing SMTP connection directly...');
    
    // Create a test SMTP transporter - use your actual settings
    const transporter = nodemailer.createTransport({
      host: 'smtp.mailtrap.io',  // Replace with your SMTP server
      port: 2525,                // Replace with your SMTP port
      secure: false,
      auth: {
        user: 'REPLACE_WITH_YOUR_USERNAME',  // Replace with your SMTP username
        pass: 'REPLACE_WITH_YOUR_PASSWORD'   // Replace with your SMTP password
      }
    });
    
    // Verify connection
    await transporter.verify();
    console.log('SMTP Connection verified successfully!');
    
    // Send test email
    const info = await transporter.sendMail({
      from: '"Test Sender" <from@example.com>',  // Replace with your from address
      to: 'test@example.com',                     // Replace with a test email
      subject: 'Direct SMTP Test',
      html: '<p>This is a direct SMTP test that bypasses the Pulse360 code.</p>'
    });
    
    console.log('Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    
  } catch (error) {
    console.error('SMTP Error:', error);
  }
})();