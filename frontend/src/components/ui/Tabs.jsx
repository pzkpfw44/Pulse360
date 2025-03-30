// frontend/src/components/ui/Tabs.jsx

import React from 'react';

export const Tabs = ({ children, activeTab, onChange }) => {
  // Filter out only Tab components
  const tabs = React.Children.toArray(children).filter(
    child => React.isValidElement(child) && child.type === Tab
  );

  return (
    <div>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab, index) => (
            <button
              key={index}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === index
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => onChange(index)}
            >
              {tab.props.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-6">
        {tabs[activeTab]}
      </div>
    </div>
  );
};

export const Tab = ({ children }) => {
  return <div>{children}</div>;
};

export default Tabs;