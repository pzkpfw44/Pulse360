// frontend/src/pages/Integration.jsx

import React, { useState } from 'react';
import { Tabs, Tab } from '../components/ui/Tabs';
import EmployeeImport from '../components/integration/EmployeeImport';
import EmployeeManagement from '../components/integration/EmployeeManagement';
import ApiIntegrationTeaser from '../components/integration/ApiIntegrationTeaser';
import { Database, Upload, Link as LinkIcon, Key } from 'lucide-react';
import WorkInProgress from '../components/WorkInProgress';

const Integration = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-gray-500">
          Manage data sources and external system connections
        </p>
      </div>

      <Tabs activeTab={activeTab} onChange={setActiveTab}>
        <Tab label="Manual Data Upload">
          <EmployeeImport />
        </Tab>
        <Tab label="Employee Management">
          <EmployeeManagement />
        </Tab>
        <Tab label="HRIS Connections">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-center flex-col p-8">
              <Database size={64} className="text-blue-500 mb-4" />
              <h2 className="text-xl font-medium mb-2">
                HRIS Connections Coming Soon
              </h2>
              <p className="text-gray-600 max-w-lg text-center">
                Connect to popular HCM systems like Workday, SAP SuccessFactors, and Oracle HCM for automatic employee data synchronization.
              </p>
            </div>
          </div>
        </Tab>
        <Tab label="SSO/Authentication">
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
        </Tab>
        <Tab label="API Management">
          <ApiIntegrationTeaser />
        </Tab>
      </Tabs>
    </div>
  );
};

export default Integration;