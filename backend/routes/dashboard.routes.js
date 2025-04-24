// backend/routes/dashboard.routes.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { sequelize } = require('../models');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get raw dashboard stats directly from database
router.get('/raw-stats', async (req, res) => {
  try {
    const results = {};
    
    // Get raw participant counts - EXACT DATA
    const [participantsResult] = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT CP.id) as activeCount,
        COUNT(DISTINCT CP.campaignId) as cycleCount
      FROM campaign_participants CP
      JOIN campaigns C ON CP.campaignId = C.id
      WHERE C.status = 'active'
    `);
    
    // Get raw response counts - EXACT DATA
    const [responsesResult] = await sequelize.query(`
      SELECT 
        COUNT(*) as count,
        CASE 
          WHEN (SELECT COUNT(*) FROM campaign_participants) > 0 
          THEN (SELECT COUNT(*) FROM campaign_participants WHERE status = 'completed') * 100.0 / 
               (SELECT COUNT(*) FROM campaign_participants)
          ELSE 0 
        END as completionRate
      FROM responses
    `);
    
    // Get template counts - EXACT DATA
    const [templatesResult] = await sequelize.query(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) as activeCount,
        COALESCE(SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END), 0) as pendingCount
      FROM templates
    `);
    
    // Get report/insight counts - EXACT DATA
    const [reportsResult] = await sequelize.query(`
      SELECT COALESCE(COUNT(*), 0) as count
      FROM insights
      WHERE createdAt >= datetime('now', '-30 days')
    `);
    
    // Get upcoming deadlines - EXACT DATA
    const [deadlinesResult] = await sequelize.query(`
      SELECT 
        id,
        name,
        CAST(JULIANDAY(endDate) - JULIANDAY('now') AS INTEGER) as daysRemaining,
        CASE
          WHEN JULIANDAY(endDate) - JULIANDAY('now') <= 3 THEN 'high'
          WHEN JULIANDAY(endDate) - JULIANDAY('now') <= 7 THEN 'medium'
          ELSE 'low'
        END as priority
      FROM campaigns
      WHERE status = 'active' AND endDate > datetime('now')
      ORDER BY endDate ASC
      LIMIT 5
    `);
    
    // Get recent activity data - Include IDs for navigation
    // New template in the last 7 days
    const [templatesActivity] = await sequelize.query(`
      SELECT id, name, createdAt
      FROM templates
      WHERE createdAt >= datetime('now', '-7 days')
      ORDER BY createdAt DESC
      LIMIT 1
    `);
    
    // Participants added in the last 7 days
    const [participantsActivity] = await sequelize.query(`
      SELECT 
        C.id as campaignId,
        C.name as campaignName,
        COUNT(CP.id) as participantCount,
        MAX(CP.createdAt) as createdAt
      FROM campaign_participants CP
      JOIN campaigns C ON CP.campaignId = C.id
      WHERE CP.createdAt >= datetime('now', '-7 days')
      GROUP BY C.id
      ORDER BY MAX(CP.createdAt) DESC
      LIMIT 1
    `);
    
    // Reports generated in the last 7 days
    const [reportsActivity] = await sequelize.query(`
      SELECT 
        C.id as campaignId,
        C.name as campaignName,
        COUNT(I.id) as reportCount,
        MAX(I.createdAt) as createdAt
      FROM insights I
      JOIN campaigns C ON I.campaignId = C.id
      WHERE I.createdAt >= datetime('now', '-7 days')
      GROUP BY C.id
      ORDER BY MAX(I.createdAt) DESC
      LIMIT 1
    `);
    
    // Compile all the raw data
    results.participants = participantsResult[0] || { activeCount: 0, cycleCount: 0 };
    results.responses = responsesResult[0] || { count: 0, completionRate: 0 };
    results.templates = templatesResult[0] || { activeCount: 0, pendingCount: 0 };
    results.reports = reportsResult[0] || { count: 0 };
    results.deadlines = deadlinesResult;
    
    // Process activities with navigation IDs
    const activities = [];
    
    if (templatesActivity.length > 0) {
      const template = templatesActivity[0];
      const createdDate = new Date(template.createdAt);
      activities.push({
        type: 'template',
        id: template.id, // Add ID for navigation
        title: 'New template added',
        description: template.name,
        timeAgo: getTimeAgo(createdDate)
      });
    }
    
    if (participantsActivity.length > 0) {
      const participantData = participantsActivity[0];
      const createdDate = new Date(participantData.createdAt);
      activities.push({
        type: 'participants',
        campaignId: participantData.campaignId, // Add ID for navigation
        title: `${participantData.participantCount} users added to cycle`,
        description: participantData.campaignName,
        timeAgo: getTimeAgo(createdDate)
      });
    }
    
    if (reportsActivity.length > 0) {
      const reportData = reportsActivity[0];
      const createdDate = new Date(reportData.createdAt);
      activities.push({
        type: 'report',
        campaignId: reportData.campaignId, // Add ID for navigation
        title: `${reportData.reportCount} reports generated`,
        description: reportData.campaignName,
        timeAgo: getTimeAgo(createdDate)
      });
    }
    
    results.activities = activities;
    
    // Add raw query info to help with debugging
    if (process.env.NODE_ENV === 'development') {
      results._debug = {
        rawParticipants: participantsResult,
        rawResponses: responsesResult,
        rawTemplates: templatesResult,
        rawReports: reportsResult
      };
    }
    
    res.status(200).json(results);
  } catch (error) {
    console.error('Error getting raw dashboard stats:', error);
    res.status(500).json({ 
      message: 'Failed to get dashboard data', 
      error: error.message 
    });
  }
});

// Helper to format time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 172800) return 'Yesterday';
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

module.exports = router;