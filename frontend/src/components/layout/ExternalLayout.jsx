// frontend/src/components/layout/ExternalLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';

export const ExternalLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm py-4 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-medium text-blue-600">Pulse360 Feedback</h1>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
        <Outlet />
      </main>
      
      <footer className="bg-white py-4 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Pulse360. All rights reserved.
        </div>
      </footer>
    </div>
  );
};