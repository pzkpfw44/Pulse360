import React, { useState, useEffect } from 'react';
import FeedbackAssessment from '../components/feedback/FeedbackAssessment';

const FeedbackAssessmentPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [campaignData, setCampaignData] = useState(null);
  
  useEffect(() => {
    // Get the token from the URL
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token') || 'demo-token';
    
    // Create mock data directly - no API call needed for testing
    const createMockData = () => {
      console.log('Creating mock data');
      // Mock campaign data
      setCampaignData({
        campaign: {
          id: 'camp-123',
          name: 'Q1 Performance Review',
          status: 'active'
        },
        targetEmployee: {
          id: 'emp-456',
          name: "Alex Chen",
          position: "Product Manager"
        },
        assessorType: 'peer',
        questions: [
          {
            id: 'q1',
            text: 'How effectively does this person communicate with team members?',
            type: 'rating',
            category: 'Communication',
            required: true,
            order: 1
          },
          {
            id: 'q2',
            text: 'How well does this person collaborate on cross-functional projects?',
            type: 'rating',
            category: 'Collaboration',
            required: true,
            order: 2
          },
          {
            id: 'q3',
            text: 'What are this person\'s key strengths? Please provide specific examples.',
            type: 'open_ended',
            category: 'Strengths',
            required: true,
            order: 3
          },
          {
            id: 'q4',
            text: 'In what areas could this person improve? Please be specific and constructive.',
            type: 'open_ended',
            category: 'Development Areas',
            required: true,
            order: 4
          },
          {
            id: 'q5',
            text: 'How effectively does this person handle challenging situations or conflicts?',
            type: 'rating',
            category: 'Conflict Resolution',
            required: true,
            order: 5
          },
          {
            id: 'q6',
            text: 'What specific advice would you give this person to be more effective in their role?',
            type: 'open_ended',
            category: 'Recommendations',
            required: true,
            order: 6
          }
        ]
      });
      setLoading(false);
    };

    // Just create mock data directly - skip API calls for now
    setTimeout(createMockData, 500); // Add a small delay to simulate loading
    
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading assessment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow-md">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
        <p className="text-gray-600 mb-4">
          If you think this is a mistake, please contact your HR administrator.
        </p>
        <button 
          onClick={() => window.location.href = '/'} 
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition-colors"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (!campaignData) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow-md">
        <p className="text-gray-600">No assessment data found. Please try again.</p>
      </div>
    );
  }

  // Get token from URL
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token') || 'demo-token';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <FeedbackAssessment
        campaignId={campaignData.campaign.id}
        assessorToken={token}
        questions={campaignData.questions}
        targetEmployee={campaignData.targetEmployee}
        assessorType={campaignData.assessorType}
      />
    </div>
  );
};

export default FeedbackAssessmentPage;