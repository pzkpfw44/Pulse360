// Add this component to frontend/src/components/ui/AIGeneratedBadge.jsx

import React from 'react';
import { Sparkles, AlertTriangle } from 'lucide-react';

const AIGeneratedBadge = ({ usedFallback, aiGenerated }) => {
  // If neither flag is present, assume it's manually created
  if (aiGenerated === undefined && usedFallback === undefined) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Manual
      </span>
    );
  }
  
  // AI generated with fallback
  if (usedFallback) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
        <AlertTriangle className="h-3 w-3 mr-1" />
        AI Fallback
      </span>
    );
  }
  
  // Successfully AI generated
  if (aiGenerated) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
        <Sparkles className="h-3 w-3 mr-1" />
        AI Generated
      </span>
    );
  }
  
  // Default case
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
      Standard
    </span>
  );
};

export default AIGeneratedBadge;