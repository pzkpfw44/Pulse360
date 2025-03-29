import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, FilePlus, FileText, PieChart, BarChart, 
  MessageSquare, Users, Database, Settings
} from 'lucide-react';

// Sidebar navigation item component
const SidebarNavItem = ({ href, icon: Icon, title, badge, isActive }) => {
  return (
    <Link
      to={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
        isActive 
          ? "bg-white/20 text-white" 
          : "text-white/90 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="flex-1">{title}</span>
      {badge && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-semibold text-blue-600">
          {badge}
        </span>
      )}
    </Link>
  );
};

export function MainLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      const sidebar = document.getElementById('sidebar-container');
      if (sidebar && !sidebar.contains(event.target) && window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center bg-white shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-4">
          {/* Mobile menu button */}
          <button
            onClick={toggleSidebar}
            className="rounded-md p-2 text-gray-500 md:hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Logo for desktop (hidden on mobile) */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
              <span className="text-xl font-bold">P</span>
            </div>
            <span className="text-xl font-bold pulse360-logo">Pulse360</span>
          </div>
          
          {/* User menu */}
          <div className="flex items-center">
            <div className="relative">
              <button className="flex items-center space-x-2 rounded-full bg-gray-100 p-2">
                <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <span className="text-sm font-medium">JD</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside 
          id="sidebar-container"
          className={`fixed inset-y-0 left-0 z-20 flex w-64 flex-col pt-16 transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 bg-gradient-to-b from-blue-500 to-blue-700`}
        >
          <div className="flex-1 overflow-auto py-6 px-4">
            <nav className="flex flex-col gap-1">
              <SidebarNavItem 
                href="/" 
                icon={Home} 
                title="Dashboard" 
                isActive={location.pathname === '/'} 
              />
              
              <div className="mt-6 mb-2 px-3 text-xs uppercase tracking-wider text-white/60">ContextHub</div>
              <SidebarNavItem 
                href="/contexthub" 
                icon={FilePlus} 
                title="Content Management" 
                isActive={location.pathname.includes('/contexthub')} 
              />
              <SidebarNavItem 
                href="/templates" 
                icon={FileText} 
                title="Manage Templates" 
                isActive={location.pathname.includes('/templates')} 
              />
              
              <div className="mt-6 mb-2 px-3 text-xs uppercase tracking-wider text-white/60">ControlHub</div>
              <SidebarNavItem 
                href="/cycles" 
                icon={PieChart} 
                title="Feedback Cycles" 
                isActive={location.pathname.includes('/cycles')} 
              />
              <SidebarNavItem 
                href="/reports" 
                icon={BarChart} 
                title="Reports" 
                badge={2}
                isActive={location.pathname.includes('/reports')} 
              />
              
              <div className="mt-6 mb-2 px-3 text-xs uppercase tracking-wider text-white/60">FeedbackHub</div>
              <SidebarNavItem 
                href="/feedback" 
                icon={MessageSquare} 
                title="Provide Feedback" 
                isActive={location.pathname.includes('/feedback')} 
              />
              <SidebarNavItem 
                href="/team" 
                icon={Users} 
                title="Team Management" 
                isActive={location.pathname.includes('/team')} 
              />
              
              <div className="mt-6 mb-2 px-3 text-xs uppercase tracking-wider text-white/60">System</div>
              <SidebarNavItem 
                href="/integration" 
                icon={Database} 
                title="Integration" 
                isActive={location.pathname.includes('/integration')} 
              />
              <SidebarNavItem 
                href="/settings" 
                icon={Settings} 
                title="Settings" 
                isActive={location.pathname.includes('/settings')} 
              />
            </nav>
          </div>
          
          <div className="mt-auto border-t border-white/10 p-4">
            <div className="rounded-lg bg-white/10 p-3 mb-4">
              <h4 className="mb-1 text-sm font-medium text-white">Need Help?</h4>
              <p className="text-xs text-white/80 mb-2">
                Access our knowledge base or contact support.
              </p>
              <button className="w-full bg-white text-blue-600 hover:bg-white/90 rounded-md px-3 py-1.5 text-sm font-medium">
                Support Center
              </button>
            </div>
            
            {/* FluxAI Branding */}
            <div className="flex items-center justify-center text-white/80 text-xs">
              <span className="mr-1">AI powered by</span>
              <a href="https://runonflux.com" target="_blank" rel="noopener noreferrer" className="flex items-center">
                <span className="font-semibold text-white ml-1">Flux</span>
              </a>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 md:ml-64 pt-4">
          <div className="container mx-auto px-4 py-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}