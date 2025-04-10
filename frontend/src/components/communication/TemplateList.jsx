// frontend/src/components/communication/TemplateList.jsx

import React, { useState, useEffect } from 'react';
import { 
  Edit, 
  Trash, 
  Plus, 
  Check, 
  Mail, 
  Clock, 
  ThumbsUp, 
  AlertTriangle, 
  Star, 
  Search,
  RefreshCw
} from 'lucide-react';
import { communicationTemplatesApi } from '../../services/api';

const TemplateList = ({ onEditTemplate, onCreateTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState('invitation');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await communicationTemplatesApi.getDefaults();
      setTemplates(response.data.templates || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      try {
        await communicationTemplatesApi.delete(id);
        setTemplates(templates.filter(template => template.id !== id));
      } catch (err) {
        console.error('Error deleting template:', err);
        alert('Failed to delete template. Please try again.');
      }
    }
  };

  const getTemplateTypeIcon = (type) => {
    switch (type) {
      case 'invitation':
        return <Mail className="h-4 w-4" />;
      case 'reminder':
        return <Clock className="h-4 w-4" />;
      case 'thank_you':
        return <ThumbsUp className="h-4 w-4" />;
      case 'instruction':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getRecipientTypeBadge = (type) => {
    const colors = {
      'self': 'bg-purple-100 text-purple-800',
      'manager': 'bg-blue-100 text-blue-800',
      'peer': 'bg-green-100 text-green-800',
      'direct_report': 'bg-yellow-100 text-yellow-800',
      'external': 'bg-orange-100 text-orange-800',
      'all': 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[type] || colors.all}`}>
        {type.replace('_', ' ')}
      </span>
    );
  };

  // Filter templates based on search and filters
  const filteredTemplates = templates.filter(template => {
    // Filter by template type tab
    if (template.templateType !== activeTab) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm && !template.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filter by recipient type
    if (filterType !== 'all' && template.recipientType !== filterType) {
      return false;
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading templates...</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <p>{error}</p>
          <button 
            className="text-red-700 underline ml-2"
            onClick={fetchTemplates}
          >
            Retry
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Template Type Filter */}
        <div className="flex space-x-1">
          <select
            className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Recipients</option>
            <option value="self">Self</option>
            <option value="manager">Manager</option>
            <option value="peer">Peer</option>
            <option value="direct_report">Direct Report</option>
            <option value="external">External</option>
          </select>

          <button
            onClick={fetchTemplates}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>

          <button
            onClick={() => onCreateTemplate({ templateType: activeTab })}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Template
          </button>
        </div>
      </div>

      {/* Template Type Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'invitation'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('invitation')}
          >
            <div className="flex items-center">
              <Mail className="h-4 w-4 mr-2" />
              Invitations
            </div>
          </button>
          <button
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reminder'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('reminder')}
          >
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Reminders
            </div>
          </button>
          <button
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'thank_you'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('thank_you')}
          >
            <div className="flex items-center">
              <ThumbsUp className="h-4 w-4 mr-2" />
              Thank You
            </div>
          </button>
          <button
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'instruction'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('instruction')}
          >
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Instructions
            </div>
          </button>
        </nav>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <Mail className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new template or generating one with AI.
          </p>
          <div className="mt-6 flex justify-center space-x-3">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => onCreateTemplate({ templateType: activeTab })}
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              New Template
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredTemplates.map((template) => (
              <li key={template.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`mr-3 flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                        template.isDefault ? 'bg-yellow-100' : template.isAiGenerated ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        {template.isDefault ? (
                          <Star className="h-5 w-5 text-yellow-600" />
                        ) : (
                          getTemplateTypeIcon(template.templateType)
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 flex items-center">
                          {template.name}
                          {template.isDefault && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Default
                            </span>
                          )}
                          {template.isAiGenerated && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              AI Generated
                            </span>
                          )}
                        </p>
                        <div className="mt-1 flex items-center">
                          {getRecipientTypeBadge(template.recipientType)}
                          <p className="ml-2 text-sm text-gray-500 truncate">{template.subject}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onEditTemplate(template)}
                        className="inline-flex items-center p-1.5 border border-gray-300 shadow-sm text-xs rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="inline-flex items-center p-1.5 border border-gray-300 shadow-sm text-xs rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TemplateList;