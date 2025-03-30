// frontend/src/pages/Integration.jsx

import React, { useState } from 'react';
import { Tabs, Tab } from '../components/ui/Tabs';
import EmployeeImport from '../components/integration/EmployeeImport';
import EmployeeManagement from '../components/integration/EmployeeManagement';
import ApiIntegrationTeaser from '../components/integration/ApiIntegrationTeaser';

const Integration = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Integration</h1>
        <p className="text-sm text-gray-500">
          Import employee data and manage external integrations
        </p>
      </div>

      <Tabs activeTab={activeTab} onChange={setActiveTab}>
        <Tab label="Employee Import">
          <EmployeeImport />
        </Tab>
        <Tab label="Employee Management">
          <EmployeeManagement />
        </Tab>
        <Tab label="API Integrations">
          <ApiIntegrationTeaser />
        </Tab>
      </Tabs>
    </div>
  );
};

export default Integration;