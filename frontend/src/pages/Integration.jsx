// frontend/src/pages/Integration.jsx

import React, { useState } from 'react';
import EmployeeImport from '../components/integration/EmployeeImport';
import EmployeeManagement from '../components/integration/EmployeeManagement';
import ApiIntegrationTeaser from '../components/integration/ApiIntegrationTeaser';
import { 
  Database, 
  Upload, 
  Users,
  Server, 
  Key,
  Globe,
  Briefcase
} from 'lucide-react';
import WorkInProgress from '../components/WorkInProgress';

const Integration = () => {
  const [activeSection, setActiveSection] = useState('manual-upload');

  // Navigation categories
  const categories = [
    {
      id: 'manual-upload',
      label: 'Manual Data Upload',
      icon: Upload,
      description: 'Upload employee data from CSV or Excel'
    },
    {
      id: 'employee-management',
      label: 'Employee Management',
      icon: Users,
      description: 'Manage employee records'
    },
    {
      id: 'hris-connections',
      label: 'HRIS Connections',
      icon: Server,
      description: 'Connect to HR information systems'
    },
    {
      id: 'sso-authentication',
      label: 'SSO/Authentication',
      icon: Key,
      description: 'Single sign-on integration'
    },
    {
      id: 'api-management',
      label: 'API Management',
      icon: Globe,
      description: 'Manage API access and keys'
    }
  ];

  // Render the appropriate component based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'manual-upload':
        return <EmployeeImport />;
      case 'employee-management':
        return <EmployeeManagement />;
      case 'hris-connections':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-center flex-col p-8">
              <Server size={64} className="text-blue-500 mb-4" />
              <h2 className="text-xl font-medium mb-2">
                HRIS Connections Coming Soon
              </h2>
              <p className="text-gray-600 max-w-lg text-center">
                Connect to popular HCM systems like Workday, SAP SuccessFactors, and Oracle HCM for automatic employee data synchronization.
              </p>
            </div>
          </div>
        );
      case 'sso-authentication':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-center flex-col p-8">
              <Key size={64} className="text-blue-500 mb-4" />
              <h2 className="text-xl font-medium mb-2">
                Single Sign-On Coming Soon
              </h2>
              <p className="text-gray-600 max-w-lg text-center">
                Configure SSO integration with your identity provider (IdP) to simplify user authentication.
              </p>
            </div>
          </div>
        );
      case 'api-management':
        return <ApiIntegrationTeaser />;
      default:
        return <EmployeeImport />;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-gray-500">
          Manage data sources and external system connections
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Integration Navigation */}
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

        {/* Content Area */}
        <div className="flex-1">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Integration;