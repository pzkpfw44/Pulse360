// frontend/src/pages/Settings.jsx

import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Mail, 
  Database, 
  Users, 
  Shield,
  Palette,
  Globe
} from 'lucide-react';

import GeneralSettings from '../components/settings/GeneralSettings';
import FluxAiSettings from '../components/settings/FluxAiSettings';
import EmailSettings from '../components/settings/EmailSettings';
import IntegrationSettings from '../components/settings/IntegrationSettings';
import SecuritySettings from '../components/settings/SecuritySettings';
import BrandingSettings from '../components/settings/BrandingSettings';

const Settings = () => {
  const [activeSection, setActiveSection] = useState('general');

  // Navigation categories
  const categories = [
    {
      id: 'general',
      label: 'General',
      icon: SettingsIcon,
      description: 'Basic application settings'
    },
    {
      id: 'ai',
      label: 'Flux AI',
      icon: Database,
      description: 'AI model and integration settings'
    },
    {
      id: 'email',
      label: 'Email',
      icon: Mail,
      description: 'Email server configuration and settings'
    },
    {
      id: 'integration',
      label: 'Integrations',
      icon: Globe,
      description: 'External system integrations'
    },
    {
      id: 'security',
      label: 'Security',
      icon: Shield,
      description: 'Security and privacy settings'
    },
    {
      id: 'branding',
      label: 'Branding',
      icon: Palette,
      description: 'Company branding and voice settings'
    }
  ];

  // Render the appropriate settings component based on active section
  const renderSettingsContent = () => {
    switch (activeSection) {
      case 'general':
        return <GeneralSettings />;
      case 'ai':
        return <FluxAiSettings />;
      case 'email':
        return <EmailSettings />;
      case 'integration':
        return <IntegrationSettings />;
      case 'security':
        return <SecuritySettings />;
      case 'branding':
        return <BrandingSettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500">
          Configure your Pulse360 application settings
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings Navigation */}
        <div className="w-full md:w-64 bg-white rounded-lg shadow overflow-hidden">
          <nav className="flex flex-col">
            {categories.map(category => (
              <button
                key={category.id}
                className={`flex items-center px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  activeSection === category.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => setActiveSection(category.id)}
              >
                <category.icon className={`h-5 w-5 mr-3 ${
                  activeSection === category.id ? 'text-blue-500' : 'text-gray-500'
                }`} />
                <div>
                  <p className={`font-medium ${
                    activeSection === category.id ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    {category.label}
                  </p>
                  <p className="text-xs text-gray-500">{category.description}</p>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          {renderSettingsContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;