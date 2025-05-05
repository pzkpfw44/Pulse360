import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import {
  Home, Settings, Menu, X, Bell, User, BookOpen, FileText, MessageSquare,
  PlayCircle, Activity, BarChart2, ChartBar, Briefcase
} from 'lucide-react'; // Removed unused icons
import fluxLogo from "../../../assets/Flux_white_symbol.png"; // Keep if used, otherwise remove
import NotificationBell from '../ui/NotificationBell'; // Assuming this component is correctly styled or doesn't need theme colors
import api from "../../services/api";

// Define default values (should match CSS/backend defaults)
const defaultLayoutSettings = {
  companyName: 'Pulse360',
  primaryColor: '#3B82F6',
  secondaryColor: '#2563EB',
  fontColorDark: '#1F2937',
  fontColorLight: '#FFFFFF',
  fontColorAccent: '#3B82F6',
};

// Helper to apply settings to CSS variables
const applyBrandingToDocument = (settings) => {
  const safeSettings = { ...defaultLayoutSettings, ...settings }; // Merge with defaults
  document.documentElement.style.setProperty('--color-primary', safeSettings.primaryColor);
  document.documentElement.style.setProperty('--color-secondary', safeSettings.secondaryColor);
  // Use fontColorAccent for the CSS --color-accent variable
  document.documentElement.style.setProperty('--color-accent', safeSettings.fontColorAccent);

  document.documentElement.style.setProperty('--color-text-base', safeSettings.fontColorDark);
  document.documentElement.style.setProperty('--color-text-inverted', safeSettings.fontColorLight);
  document.documentElement.style.setProperty('--color-text-accent', safeSettings.fontColorAccent);

  // Determine text color on primary/secondary/accent based on lightness contrast (simple example)
  // This is a basic check; a proper contrast checker library would be better
  const isDark = (hexColor) => {
      const color = hexColor.substring(1); // remove #
      const rgb = parseInt(color, 16);    // convert rrggbb to decimal
      const r = (rgb >> 16) & 0xff;       // extract red
      const g = (rgb >>  8) & 0xff;       // extract green
      const b = (rgb >>  0) & 0xff;       // extract blue
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709
      return luma < 128; // Threshold for considering dark
  };

  document.documentElement.style.setProperty('--color-text-on-primary', isDark(safeSettings.primaryColor) ? safeSettings.fontColorLight : safeSettings.fontColorDark);
  document.documentElement.style.setProperty('--color-text-on-secondary', isDark(safeSettings.secondaryColor) ? safeSettings.fontColorLight : safeSettings.fontColorDark);
  document.documentElement.style.setProperty('--color-text-on-accent', isDark(safeSettings.fontColorAccent) ? safeSettings.fontColorLight : safeSettings.fontColorDark);

   // Update sidebar background variable (used by Tailwind config)
  document.documentElement.style.setProperty('--color-bg-sidebar', safeSettings.primaryColor); // Base color for gradient start
};


// --- Sidebar Navigation Item Component ---
const SidebarNavItem = ({ href, icon: Icon, title, badge, end = false }) => {
  return (
    <NavLink
      to={href}
      end={end} // Use end prop for exact matching on home "/"
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150 ease-in-out ${
          isActive
            ? 'bg-white/20 text-on-primary' // Active: Use light text on primary, slight bg highlight
            : 'text-on-primary/90 hover:bg-white/10 hover:text-on-primary' // Inactive: Use slightly dimmer light text, highlight on hover
        }`
      }
    >
      <Icon className="h-5 w-5 flex-shrink-0" /> {/* Ensure icon doesn't shrink */}
      <span className="flex-1 truncate">{title}</span> {/* Allow truncation if needed */}
      {badge && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-bg-surface text-primary text-xs font-semibold">
          {/* Badge: white background, primary text color */}
          {badge}
        </span>
      )}
    </NavLink>
  );
};

// --- Main Layout Component ---
export function MainLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Store the full settings object
  const [brandingSettings, setBrandingSettings] = useState(null);

  // Fetch branding settings and apply them
   const fetchAndApplySettings = useCallback(async () => {
        let settings = defaultLayoutSettings; // Start with defaults
        try {
            // 1. Try localStorage first for speed
            const cachedSettings = localStorage.getItem('brandingSettings');
            if (cachedSettings) {
                const parsed = JSON.parse(cachedSettings);
                 // Validate parsed structure minimally? Or assume it's correct if present.
                 if (parsed && parsed.primaryColor) {
                     settings = { ...defaultLayoutSettings, ...parsed };
                     applyBrandingToDocument(settings); // Apply cached settings immediately
                     setBrandingSettings(settings); // Update state
                 }
            }

            // 2. Fetch latest from API
            const response = await api.get('/settings/branding');
            if (response.data && response.data.primaryColor) { // Check if response is valid
                const latestSettings = { ...defaultLayoutSettings, ...response.data };

                 // Only update if fetched data is different from cached/current state
                 // Simple stringify comparison, could be more granular
                 if (JSON.stringify(latestSettings) !== JSON.stringify(settings)) {
                     setBrandingSettings(latestSettings);
                     applyBrandingToDocument(latestSettings); // Apply latest settings
                     localStorage.setItem('brandingSettings', JSON.stringify(latestSettings)); // Update cache
                 }
            } else if (!cachedSettings) {
                 // If API fails and no cache, apply defaults explicitly
                 applyBrandingToDocument(defaultLayoutSettings);
                 setBrandingSettings(defaultLayoutSettings);
            }
        } catch (error) {
            console.error('Error fetching/applying branding settings:', error);
            // If error occurs, ensure defaults are applied if nothing loaded yet
            if (!brandingSettings) {
                 applyBrandingToDocument(defaultLayoutSettings);
                 setBrandingSettings(defaultLayoutSettings);
            }
        }
    }, [brandingSettings]); // Re-run if brandingSettings changes locally? Maybe not needed. Dependency array might need adjustment.


  // Fetch on initial mount
  useEffect(() => {
    fetchAndApplySettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

   // Listen for storage changes (e.g., settings updated in another tab)
   useEffect(() => {
       const handleStorageChange = (event) => {
           if (event.key === 'brandingSettings' && event.newValue) {
               try {
                    const updatedSettings = JSON.parse(event.newValue);
                    if (updatedSettings && updatedSettings.primaryColor) {
                         const newFullSettings = { ...defaultLayoutSettings, ...updatedSettings };
                         setBrandingSettings(newFullSettings);
                         applyBrandingToDocument(newFullSettings);
                    }
               } catch (e) {
                   console.error("Error parsing storage update:", e);
               }
           }
       };

       window.addEventListener('storage', handleStorageChange);
       return () => {
           window.removeEventListener('storage', handleStorageChange);
       };
   }, []); // Run only once on mount


  // Sidebar toggle logic
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      const sidebar = document.getElementById('sidebar-container');
      // Check if the click is outside the sidebar AND the click target is not the toggle button
      const toggleButton = document.getElementById('sidebar-toggle-button');
      if (sidebar && !sidebar.contains(event.target) && !toggleButton?.contains(event.target) && window.innerWidth < 768 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSidebarOpen]); // Re-add listener if sidebar state changes

  // Get company name for display, fall back to default
  const companyName = brandingSettings?.companyName || defaultLayoutSettings.companyName;

  return (
    <div className="flex min-h-screen bg-bg-muted"> {/* Use themed muted background */}
      {/* --- Sidebar --- */}
      <aside
        id="sidebar-container"
        // Use the theme background gradient, themed text color
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gradient-sidebar text-on-primary shadow-lg
                    transition-transform duration-300 ease-in-out ${ isSidebarOpen ? "translate-x-0" : "-translate-x-full" }
                    md:relative md:translate-x-0 md:z-auto md:shadow-md`} // Keep shadow on desktop too
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center border-b border-white/10 px-4 sm:px-6"> {/* Slight padding adjustment */}
          <Link to="/" className="flex items-center gap-2">
            {/* Logo/Initial - Use surface background, primary text */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-surface text-primary">
              <span className="text-lg font-bold">{companyName?.charAt(0) || 'P'}</span>
            </div>
            <span className="text-xl font-bold text-on-primary">{companyName}</span>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-4"> {/* Allow vertical scroll */}
          <nav className="flex flex-col gap-1">
            <SidebarNavItem href="/" icon={Home} title="Dashboard" end={true}/> {/* Add end=true for Dashboard */}

             {/* Grouping Example */}
            <div className="mt-6 mb-2 px-3 text-xs font-medium uppercase tracking-wider text-on-primary/60">
              ContextHub
            </div>
            <SidebarNavItem href="/contexthub" icon={BookOpen} title="Company Knowledge" />
            <SidebarNavItem href="/templates" icon={FileText} title="Questionnaire Templates" />
            <SidebarNavItem href="/communication-templates" icon={MessageSquare} title="Communication Templates" />

            <div className="mt-6 mb-2 px-3 text-xs font-medium uppercase tracking-wider text-on-primary/60">
              ControlHub
            </div>
            <SidebarNavItem href="/start-360" icon={PlayCircle} title="Start 360 Feedback" />
            {/* Add badge value dynamically if needed */}
            <SidebarNavItem href="/monitor-360" icon={Activity} title="Monitor 360 Feedback" badge={2} />

            <div className="mt-6 mb-2 px-3 text-xs font-medium uppercase tracking-wider text-on-primary/60">
              FeedbackHub
            </div>
            <SidebarNavItem href="/results-360" icon={BarChart2} title="Results 360" />
            <SidebarNavItem href="/insights-360" icon={ChartBar} title="Insights 360" />

            <div className="mt-6 mb-2 px-3 text-xs font-medium uppercase tracking-wider text-on-primary/60">
              System
            </div>
            <SidebarNavItem href="/integration" icon={Briefcase} title="Integrations" />
            <SidebarNavItem href="/settings" icon={Settings} title="Settings" />
          </nav>
        </div>

        {/* Flux AI branding footer (Optional: Can theme this too) */}
        <div className="mt-auto border-t border-white/10 p-4 flex justify-center items-center">
          <div className="text-on-primary/80 text-sm flex items-center">
            <span className="mr-2">AI powered by</span>
             {/* Ensure Flux logo contrasts well with sidebar gradient */}
            <a href="https://runonflux.com" target="_blank" rel="noopener noreferrer" className="flex items-center">
              <img src={fluxLogo} alt="Flux" className="h-6 w-auto" />
            </a>
          </div>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <div className="flex flex-col flex-1"> {/* Removed md:ml-64 as sidebar is relative on md */}
        {/* Header (Sticky for all sizes now) */}
         <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border-base bg-bg-surface px-4 sm:px-6 shadow-sm">
            {/* Left Side: Mobile Toggle & Desktop Space */}
             <div className="flex items-center">
                 {/* Mobile Sidebar Toggle */}
                 <button
                     id="sidebar-toggle-button"
                    onClick={toggleSidebar}
                    className="rounded-md p-2 text-text-muted hover:bg-bg-muted hover:text-text-base md:hidden mr-2" // Only show on mobile
                 >
                    <span className="sr-only">Toggle sidebar</span> {/* Accessibility */}
                    {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                 </button>
                  {/* Desktop Title Area (or leave empty) */}
                 {/* <h1 className="text-lg font-semibold text-text-base hidden md:block"> {companyName} </h1> */}
             </div>


            {/* Center: Company Name (optional, could be in sidebar only) */}
            <div className="flex items-center justify-center flex-1">
                 {/* Show company name centrally on desktop if desired */}
                <h1 className="text-lg font-semibold text-text-base hidden md:block">
                    {companyName}
                </h1>
                 {/* Mobile Logo/Name (if needed when sidebar closed) */}
                 <div className="flex items-center gap-2 md:hidden">
                    {/* Mobile logo if needed */}
                     <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary">
                        <span className="text-lg font-bold">{companyName?.charAt(0) || 'P'}</span>
                     </div>
                     {/* Use themed gradient text for mobile header name */}
                     <span className="text-xl font-bold text-gradient-brand">
                        {companyName}
                     </span>
                 </div>
            </div>

            {/* Right Side: Actions */}
             <div className="flex items-center justify-end gap-3 sm:gap-4">
                 <NotificationBell /> {/* Ensure this uses theme colors */}
                 {/* User Icon - Use primary bg color with contrasting text */}
                <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-on-primary font-medium">
                    {/* Replace User icon with initials or image if available */}
                     <User className="h-5 w-5" />
                     {/* Example: <span className="text-sm font-medium">AB</span> */}
                 </div>
            </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6"> {/* Standard padding */}
          {children}
        </main>
      </div>

      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden" // Darker backdrop
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true" // Hide from screen readers
        />
      )}
    </div>
  );
}