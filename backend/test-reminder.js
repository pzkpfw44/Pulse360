// Create this file as backend/test-reminder.js

// Test script to directly send reminders
const fetch = require('node-fetch');

const participantId = 'REPLACE_WITH_ACTUAL_PARTICIPANT_ID'; // Replace with the participant ID you're trying to remind

// Get the token from your localStorage or browser cookies
const token = 'REPLACE_WITH_YOUR_TOKEN'; // Replace with your actual token

(async () => {
  try {
    console.log('Sending direct test reminder...');
    
    const response = await fetch('http://localhost:5000/api/campaigns/send-reminders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        participantIds: [participantId]
      })
    });
    
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
})();