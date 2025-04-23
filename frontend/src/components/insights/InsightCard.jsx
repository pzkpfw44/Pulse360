// frontend/src/components/insights/InsightCard.jsx

import React, { useState } from 'react';
import { FileText, User, Calendar, Eye, Download, Trash2 } from 'lucide-react';
import api from '../../services/api';

const InsightCard = ({ insight, onView, onDelete }) => {
  const [deleting, setDeleting] = useState(false);
  
  // Format dates
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Format insight type
  const formatInsightType = (type) => {
    const typeMap = {
      'growth_blueprint': 'Your Growth Blueprint',
      'leadership_impact': 'Leadership Impact Navigator',
      'team_synergy': 'Team Synergy Compass',
      'collaboration_patterns': 'Collaboration Patterns Analysis',
      'talent_landscape': 'Talent Landscape Panorama',
      'culture_pulse': 'Culture Pulse Monitor',
      'development_impact': 'Development Impact Scorecard'
    };
    
    return typeMap[type] || type.replace(/_/g, ' ');
  };
  
  // Format status
  const getStatusBadge = (status) => {
    const statusColors = {
      'draft': 'bg-yellow-100 text-yellow-800',
      'published': 'bg-green-100 text-green-800',
      'archived': 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };
  
  // Download PDF
  const handleDownload = async (e) => {
    e.stopPropagation();
    
    try {
      // This will trigger a file download
      window.open(`${api.defaults.baseURL}/insights/${insight.id}/export-pdf`, '_blank');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  // Delete insight
  const handleDelete = async (e) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this insight? This action cannot be undone.')) {
      return;
    }
    
    try {
      setDeleting(true);
      await api.delete(`/insights/${insight.id}`);
      if (onDelete) onDelete(insight.id);
    } catch (error) {
      console.error('Error deleting insight:', error);
      alert('Failed to delete insight. Please try again.');
    } finally {
      setDeleting(false);
    }
  };
  
  return (
    <div 
      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
      onClick={onView}
    >
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div className="flex items-start">
            <div className="flex-shrink-0 rounded-full p-2 bg-blue-100">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="flex items-center">
                <h3 className="font-medium text-lg">{insight.title}</h3>
                <div className="ml-2">
                  {getStatusBadge(insight.status)}
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {formatInsightType(insight.type)}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
              title="View Insight"
            >
              <Eye className="h-5 w-5" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
              title="Download PDF"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full"
              title="Delete Insight"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center">
            <User className="h-4 w-4 mr-1" />
            <span>
              {insight.targetEmployee ? 
                `${insight.targetEmployee.firstName} ${insight.targetEmployee.lastName}` : 
                'Unknown Employee'}
            </span>
          </div>
          
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            <span>Generated on {formatDate(insight.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightCard;