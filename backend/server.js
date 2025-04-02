const app = require('./app');
const { testConnection, syncDatabase } = require('./models');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Initialize the database and start the server
const startServer = async () => {
  try {
    // Test database connection
    const isConnected = await testConnection();
    
    if (isConnected) {
      // Sync database models (set force to true to reset database in development)
      const force = false;
      await syncDatabase(force);
      
      // Start the server
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    } else {
      console.error('Database connection failed. Cannot start server.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();