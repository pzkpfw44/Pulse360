import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, Upload, BookOpen, FileText, PieChart, 
  BarChart, MessageSquare, Users, Database, Settings 
} from 'lucide-react';

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
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header for mobile */}
      <header className="sticky top-0 z-30 flex h-16 items-center bg-white shadow-sm md:hidden">
        <div className="flex items-center justify-between w-full px-4">
          <button
            onClick={toggleSidebar}
            className="rounded-md p-2 text-gray-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white">
              <span className="text-xl font-bold">P</span>
            </div>
            <span 
              className="text-xl font-bold"
              style={{
                background: "linear-gradient(90deg, #0ea5e9, #0284c7)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}
            >
              Pulse360
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside 
          id="sidebar-container"
          className={`fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-gradient-to-b from-blue-450 to-blue-550 transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0`}
        >
          <div className="flex h-16 items-center border-b border-white/10 px-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-500">
                <span className="text-xl font-bold">P</span>
              </div>
              <span className="text-xl font-bold text-white">Pulse360</span>
            </Link>
          </div>
          
          <div className="flex-1 overflow-auto pt-6 px-4">
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
              <SidebarNavItem href="/reports" icon={BarChart} title="Reports" badge={2} />
              
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
          
          {/* Flux AI branding footer - UPDATED */}
          <div className="mt-auto border-t border-white/10 p-6 flex justify-center items-center">
            <div className="text-white/90 text-sm flex items-center">
              <span className="mr-2">AI powered by</span>
              <a href="https://runonflux.com" target="_blank" rel="noopener noreferrer">
                <img 
                  src="/Flux_white_symbol.png" 
                  alt="Flux" 
                  className="h-5 w-auto" 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
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