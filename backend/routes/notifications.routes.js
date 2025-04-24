// backend/routes/notifications.routes.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { 
  Response, 
  Campaign, 
  Template, 
  CampaignParticipant,
  Employee,
  sequelize 
} = require('../models');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all notifications
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = [];
    
    // Get real notifications from database based on recent events
    
    // 1. Recent feedback submissions (last 7 days)
    const [feedbackNotifications] = await sequelize.query(`
      SELECT 
        r.id,
        r.createdAt as time,
        cp.relationshipType,
        e.firstName || ' ' || e.lastName as employeeName,
        c.name as campaignName,
        c.id as campaignId
      FROM responses r
      JOIN campaign_participants cp ON r.participantId = cp.id
      JOIN campaigns c ON cp.campaignId = c.id
      JOIN employees e ON c.targetEmployeeId = e.id
      WHERE r.createdAt >= datetime('now', '-7 days')
      AND c.createdBy = ?
      GROUP BY cp.id
      ORDER BY r.createdAt DESC
      LIMIT 5
    `, {
      replacements: [userId]
    });
    
    // 2. Upcoming deadlines (campaigns ending in next 7 days)
    const [deadlineNotifications] = await sequelize.query(`
      SELECT 
        id,
        name,
        endDate as time,
        CAST(JULIANDAY(endDate) - JULIANDAY('now') AS INTEGER) as daysRemaining
      FROM campaigns
      WHERE status = 'active'
      AND endDate > datetime('now')
      AND endDate <= datetime('now', '+7 days')
      AND createdBy = ?
      ORDER BY endDate ASC
      LIMIT 5
    `, {
      replacements: [userId]
    });
    
    // 3. Template approvals (last 7 days)
    const [templateNotifications] = await sequelize.query(`
      SELECT 
        id,
        name,
        createdAt as time,
        status
      FROM templates
      WHERE (status = 'approved' OR status = 'active')
      AND createdAt >= datetime('now', '-7 days')
      AND createdBy = ?
      ORDER BY createdAt DESC
      LIMIT 5
    `, {
      replacements: [userId]
    });
    
    // Process feedback notifications
    feedbackNotifications.forEach(notification => {
      notifications.push({
        id: `feedback-${notification.id}`,
        type: 'feedback',
        title: 'New feedback submitted',
        message: `${notification.employeeName ? notification.employeeName : 'Someone'} completed their feedback for ${notification.campaignName}`,
        time: notification.time,
        read: false,
        campaignId: notification.campaignId
      });
    });
    
    // Process deadline notifications
    deadlineNotifications.forEach(notification => {
      notifications.push({
        id: `deadline-${notification.id}`,
        type: 'deadline',
        title: 'Campaign deadline approaching',
        message: `${notification.name} ends in ${notification.daysRemaining} days`,
        time: notification.time,
        read: false,
        campaignId: notification.id
      });
    });
    
    // Process template notifications
    templateNotifications.forEach(notification => {
      notifications.push({
        id: `template-${notification.id}`,
        type: 'template',
        title: 'Template approved',
        message: `${notification.name} template has been approved`,
        time: notification.time,
        read: false,
        templateId: notification.id
      });
    });
    
    // Sort by time (most recent first)
    notifications.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    // Add human-readable timeAgo
    notifications.forEach(notification => {
      notification.timeAgo = getTimeAgo(new Date(notification.time));
    });
    
    res.status(200).json({
      notifications
    });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ 
      message: 'Failed to get notifications', 
      error: error.message 
    });
  }
});

// Mark notification as read
router.put('/:id/read', (req, res) => {
  const { id } = req.params;
  
  // In a real implementation, you would update the read status in your database
  // For now, we just return success since the frontend handles the UI state change
  
  res.status(200).json({ 
    message: 'Notification marked as read',
    id
  });
});

// Mark all notifications as read
router.put('/read-all', (req, res) => {
  // In a real implementation, you would update all notifications for this user
  // For now, we just return success since the frontend handles the UI state change
  
  res.status(200).json({ 
    message: 'All notifications marked as read'
  });
});

// Helper to format time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 172800) return 'Yesterday';
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

module.exports = router;