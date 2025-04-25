// backend/controllers/notifications.controller.js

const { sequelize } = require('../models');

// Get notifications for the current user
exports.getNotifications = async (req, res) => {
  try {
    // Get user ID from the authenticated user
    const userId = req.user.id;
    
    // Query notifications from the database
    const [notifications] = await sequelize.query(`
      SELECT n.id, n.title, n.message, n.type, n.read, n.createdAt
      FROM notifications n
      WHERE n.userId = :userId
      ORDER BY n.createdAt DESC
      LIMIT 20
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });
    
    res.status(200).json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ 
      message: 'Failed to fetch notifications', 
      error: error.message 
    });
  }
};

// Mark a notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Update the notification read status
    await sequelize.query(`
      UPDATE notifications
      SET read = 1
      WHERE id = :id AND userId = :userId
    `, {
      replacements: { id, userId },
      type: sequelize.QueryTypes.UPDATE
    });
    
    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ 
      message: 'Failed to mark notification as read', 
      error: error.message 
    });
  }
};

// Mark all notifications as read for the current user
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Update all unread notifications for this user
    await sequelize.query(`
      UPDATE notifications
      SET read = 1
      WHERE userId = :userId AND read = 0
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.UPDATE
    });
    
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ 
      message: 'Failed to mark all notifications as read', 
      error: error.message 
    });
  }
};