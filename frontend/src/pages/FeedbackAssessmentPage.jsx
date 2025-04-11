// frontend/src/pages/FeedbackAssessmentPage.jsx

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import FeedbackAssessment from '../components/feedback/FeedbackAssessment';
import { AlertTriangle, Clock, CheckCircle, ArrowLeft } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const FeedbackAssessmentPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [assessmentData, setAssessmentData] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Get the token from the URL
    const pathParts = location.pathname.split('/');
    const token = pathParts[pathParts.length - 1];
    
    if (!token) {
      setError('Invalid assessment link. Please check your email for the correct link.');
      setLoading(false);
      return;
    }
    
    const fetchAssessmentData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/feedback/assessment/${token}`);
        setAssessmentData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching assessment data:', err);
        
        if (err.response) {
          // Handle specific error types
          if (err.response.data.error) {
            setErrorType(err.response.data.error);
          }
          
          setError(err.response.data.message || 'Failed to load assessment data. Please try again later.');
        } else {
          setError('Unable to connect to the server. Please check your internet connection and try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAssessmentData();
  }, [location.pathname]);

  const renderErrorState = () => {
    let icon = <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />;
    let title = 'Error';
    let message = error;
    let showHomeButton = true;
    
    // Customize the error display based on error type
    if (errorType === 'campaign_inactive') {
      icon = <Clock className="h-16 w-16 text-yellow-500 mb-4" />;
      title = 'Campaign Inactive';
    } else if (errorType === 'already_completed') {
      icon = <CheckCircle className="h-16 w-16 text-green-500 mb-4" />;
      title = 'Already Completed';
      message = 'You have already completed this assessment. Thank you for your participation!';
    } else if (errorType === 'campaign_ended') {
      icon = <Clock className="h-16 w-16 text-gray-500 mb-4" />;
      title = 'Campaign Ended';
      message = 'This feedback campaign has ended and is no longer accepting responses.';
    }
    
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow-md text-center">
        {icon}
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        {showHomeButton && (
          <button 
            onClick={() => window.location.href = '/'} 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading assessment...</p>
      </div>
    );
  }

  if (error) {
    return renderErrorState();
  }

  if (!assessmentData) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow-md">
        <p className="text-gray-600">No assessment data found. Please check your link and try again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <FeedbackAssessment
        campaignId={assessmentData.campaign.id}
        assessorToken={assessmentData.token}
        questions={assessmentData.questions}
        targetEmployee={assessmentData.targetEmployee}
        assessorType={assessmentData.assessorType}
        initialResponses={assessmentData.questions.reduce((acc, question) => {
          if (question.response) {
            if (question.response.text) {
              acc.textResponses[question.id] = question.response.text;
            }
            if (question.response.rating) {
              acc.ratings[question.id] = question.response.rating;
            }
          }
          return acc;
        }, { textResponses: {}, ratings: {} })}
      />
    </div>
  );
};

export default FeedbackAssessmentPage;