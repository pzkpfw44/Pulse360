// backend/fix-campaigns.js

const { Campaign, sequelize } = require('./models');

async function fixCampaigns() {
  try {
    console.log('Connecting to database...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection successful');
    
    console.log('Looking for campaigns to fix...');
    
    // Find all active campaigns with 100% completion rate
    const campaigns = await Campaign.findAll({
      where: {
        status: 'active',
        completionRate: 100
      }
    });
    
    console.log(`Found ${campaigns.length} campaigns to fix`);
    
    if (campaigns.length > 0) {
      // Update all found campaigns to completed status
      for (const campaign of campaigns) {
        console.log(`Fixing campaign: ${campaign.id} - ${campaign.name}`);
        
        campaign.status = 'completed';
        await campaign.save();
        
        console.log(`Campaign ${campaign.id} fixed, status set to 'completed'`);
      }
      
      console.log('All campaigns fixed successfully');
    } else {
      console.log('No campaigns need to be fixed');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error fixing campaigns:', error);
    process.exit(1);
  }
}

// Run the function
fixCampaigns();