import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, Upload, FileText, PieChart, 
  BarChart2, MessageSquare, Users, Database, Settings,
  Menu, X, Bell, User
} from 'lucide-react';
import fluxLogo from "../../../assets/Flux_white_symbol.png";

// Sidebar navigation item component
const SidebarNavItem = ({ href, icon: Icon, title, badge }) => {
  const location = useLocation();
  const isActive = location.pathname === href || 
    (href !== '/' && location.pathname.includes(href));

  return (
    <Link
      to={href}
      className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
        isActive 
          ? 'bg-white/20 text-white' 
          : 'text-white/90 hover:bg-white/10 hover:text-white'
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
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside 
        id="sidebar-container"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gradient-to-b from-blue-500 to-blue-600 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0 md:z-0`}
      >
        <div className="flex h-16 items-center border-b border-white/10 px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-500">
              <span className="text-lg font-bold">P</span>
            </div>
            <span className="text-xl font-bold text-white">Pulse360</span>
          </Link>
        </div>
        
        <div className="flex-1 overflow-auto py-6 px-4">
          <nav className="flex flex-col gap-1">
            <SidebarNavItem href="/" icon={Home} title="Dashboard" />
            
            <div className="mt-6 mb-2 px-3 text-xs uppercase tracking-wider text-white/60">
              ContextHub
            </div>
            <SidebarNavItem href="/contexthub" icon={Upload} title="Content Management" />
            <SidebarNavItem href="/templates" icon={FileText} title="Manage Templates" />
            
            <div className="mt-6 mb-2 px-3 text-xs uppercase tracking-wider text-white/60">
              ControlHub
            </div>
            <SidebarNavItem href="/cycles" icon={PieChart} title="Feedback Cycles" />
            <SidebarNavItem href="/reports" icon={BarChart2} title="Reports" badge={2} />
            
            <div className="mt-6 mb-2 px-3 text-xs uppercase tracking-wider text-white/60">
              FeedbackHub
            </div>
            <SidebarNavItem href="/feedback" icon={MessageSquare} title="Provide Feedback" />
            <SidebarNavItem href="/team" icon={Users} title="Team Management" />
            
            <div className="mt-6 mb-2 px-3 text-xs uppercase tracking-wider text-white/60">
              System
            </div>
            <SidebarNavItem href="/integration" icon={Database} title="Integration" />
            <SidebarNavItem href="/settings" icon={Settings} title="Settings" />
          </nav>
        </div>
        
        {/* Flux AI branding footer */}
        <div className="mt-auto border-t border-white/10 p-4 flex justify-center items-center">
          <div className="text-white/80 text-sm flex items-center">
            <span className="mr-2">AI powered by</span>
            <a href="https://runonflux.com" target="_blank" rel="noopener noreferrer" className="flex items-center">
              <img src={fluxLogo} alt="Flux" className="h-6 w-auto" />
            </a>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 md:ml-64">
        {/* Header for mobile */}
        <header className="sticky top-0 z-40 flex h-16 items-center bg-white shadow-sm md:hidden">
          <div className="flex items-center justify-between w-full px-4">
            <button
              onClick={toggleSidebar}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
            >
              {isSidebarOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
            
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <span className="text-lg font-bold">P</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                Pulse360
              </span>
            </div>

            <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full">
              <Bell className="h-6 w-6" />
              <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                3
              </span>
            </button>
          </div>
        </header>

        {/* Desktop header */}
        <header className="hidden md:flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
          <h1 className="text-lg font-semibold text-gray-800">
            {/* This would be dynamic based on current page */}
          </h1>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                3
              </span>
            </button>
            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
              <User className="h-5 w-5" />
            </div>
          </div>
        </header>
        
        <main className="flex-1 px-4 py-6 md:px-6">
          {children}
        </main>
      </div>
      
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}