// frontend/src/components/layout/ExternalLayout.jsx
import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import api from '../../services/api';

export const ExternalLayout = () => {
  const [brandingSettings, setBrandingSettings] = useState(null);
  
  // Fetch branding settings
  useEffect(() => {
    const fetchBrandingSettings = async () => {
      try {
        // First try to get from localStorage for faster initial load
        const cachedSettings = localStorage.getItem('brandingSettings');
        if (cachedSettings) {
          const parsed = JSON.parse(cachedSettings);
          setBrandingSettings(parsed);
          
          // Apply colors
          document.documentElement.style.setProperty('--primary-color', parsed.primaryColor || '#3B82F6');
          document.documentElement.style.setProperty('--secondary-color', parsed.secondaryColor || '#2563EB');
        }
        
        // Then fetch from API to ensure we have latest data
        const response = await api.get('/settings/branding');
        if (response.data) {
          setBrandingSettings(response.data);
          
          // Apply colors
          document.documentElement.style.setProperty('--primary-color', response.data.primaryColor || '#3B82F6');
          document.documentElement.style.setProperty('--secondary-color', response.data.secondaryColor || '#2563EB');
          
          // Update cache
          localStorage.setItem('brandingSettings', JSON.stringify(response.data));
        }
      } catch (error) {
        console.error('Error fetching branding settings:', error);
      }
    };
    
    fetchBrandingSettings();
  }, []);

  // Get company name for display
  const companyName = brandingSettings?.companyName || '';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm py-4 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-medium text-blue-600">{companyName} Feedback</h1>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
        <Outlet />
      </main>
      
      <footer className="bg-white py-4 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
        </div>
      </footer>
    </div>
  );
};