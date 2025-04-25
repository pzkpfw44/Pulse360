import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import axios from 'axios';

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);
  const intervalRef = useRef(null);
  
  useEffect(() => {
    // Initial fetch
    fetchNotifications();
    
    // Set up refresh based on settings
    setupRefreshInterval();
    
    // Listen for settings changes
    window.addEventListener('notificationSettingsChanged', handleSettingsChange);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('resetNotificationTimer', setupRefreshInterval);
    
    // Click outside listener
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    
    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('notificationSettingsChanged', handleSettingsChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('resetNotificationTimer', setupRefreshInterval);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Handle settings changes from custom event
  const handleSettingsChange = (event) => {
    console.log('Notification settings changed:', event.detail);
    setupRefreshInterval();
  };
  
  // Handle localStorage changes
  const handleStorageChange = (event) => {
    if (event.key === 'notificationSettings') {
      console.log('Notification settings changed in localStorage');
      setupRefreshInterval();
    }
  };
  
  // Setup refresh interval based on current settings
  const setupRefreshInterval = () => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Check localStorage for settings
    try {
      const settingsStr = localStorage.getItem('notificationSettings');
      let settings = { refreshEnabled: true, refreshInterval: 120000 }; // Default settings
      
      if (settingsStr) {
        settings = JSON.parse(settingsStr);
      } else {
        // Save default settings if none exist
        localStorage.setItem('notificationSettings', JSON.stringify(settings));
      }
      
      console.log('Current notification settings:', settings);
      
      // Only set up interval if refresh is enabled
      if (settings.refreshEnabled) {
        console.log(`Setting up notification refresh every ${settings.refreshInterval}ms`);
        intervalRef.current = setInterval(fetchNotifications, settings.refreshInterval);
      } else {
        console.log('Notification auto-refresh is disabled');
      }
    } catch (err) {
      console.error('Error setting up notification refresh:', err);
    }
  };

  // Function to fetch notifications from server
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // Get real notifications from backend
      const response = await axios.get(`${API_URL}/notifications`);
      
      if (response.data && Array.isArray(response.data.notifications)) {
        // Get previously read notifications from localStorage
        const readIds = JSON.parse(localStorage.getItem('readNotificationIds') || '[]');
        
        // Process the notifications
        const notificationsData = response.data.notifications.map(notification => ({
          ...notification,
          // Mark as read if it was previously read
          read: notification.read || readIds.includes(notification.id),
          // Format the time if it's not already in a human-readable format
          timeAgo: notification.timeAgo || formatTimeAgo(notification.time || notification.createdAt)
        }));
        
        setNotifications(notificationsData);
        
        // Count unread notifications
        const unread = notificationsData.filter(n => !n.read).length;
        setUnreadCount(unread);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const toggleNotifications = () => {
    setIsOpen(!isOpen);
    
    // When opening, refresh notifications
    if (!isOpen) {
      fetchNotifications();
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      // Mark read locally first
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id ? { ...notification, read: true } : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Call API to mark notification as read
      await axios.put(`${API_URL}/notifications/${id}/mark-read`);
      
      // Add to local storage to remember it was read
      const readIds = JSON.parse(localStorage.getItem('readNotificationIds') || '[]');
      if (!readIds.includes(id)) {
        readIds.push(id);
        localStorage.setItem('readNotificationIds', JSON.stringify(readIds));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Mark all read locally first
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      
      // Reset unread count
      setUnreadCount(0);
      
      // Then call API to mark all notifications as read
      await axios.put(`${API_URL}/notifications/mark-all-read`);
      
      // Add all IDs to local storage
      const allIds = notifications.map(n => n.id);
      const readIds = JSON.parse(localStorage.getItem('readNotificationIds') || '[]');
      const uniqueIds = [...new Set([...readIds, ...allIds])];
      localStorage.setItem('readNotificationIds', JSON.stringify(uniqueIds));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 172800) return 'Yesterday';
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Based on notification type, get appropriate icon
  const getNotificationIcon = (type) => {
    const iconMap = {
      'feedback': (
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
      ),
      'deadline': (
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
      ),
      'template': (
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </div>
      ),
      'default': (
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
      )
    };
    
    return iconMap[type] || iconMap.default;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        className="relative p-1 text-gray-700 hover:bg-gray-100 rounded-full"
        onClick={toggleNotifications}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-72 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">
                <p>{error}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`p-3 border-b border-gray-100 hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex">
                    {getNotificationIcon(notification.type)}
                    <div className="ml-3 flex-1">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <span className="text-xs text-gray-500">
                          {notification.timeAgo}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-2 border-t border-gray-200 text-center">
            <a href="/notifications" className="block text-xs text-blue-600 hover:text-blue-800">
              View all notifications
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;