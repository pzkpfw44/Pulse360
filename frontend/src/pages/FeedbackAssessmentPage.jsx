// frontend/src/pages/FeedbackAssessmentPage.jsx

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios'; // Assuming axios is already configured to point to your API base
import FeedbackAssessment from '../components/feedback/FeedbackAssessment';
import { AlertTriangle, Clock, CheckCircle, ArrowLeft } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Function to detect if user is accessing from an external link
// This check can remain as is.
const isExternalUser = () => {
  const path = window.location.pathname;
  return path.startsWith('/feedback/') && path !== '/feedback/assessment';
};

const FeedbackAssessmentPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null);
  const [assessmentData, setAssessmentData] = useState(null);
  const location = useLocation();
  // const navigate = useNavigate(); // useNavigate is imported but not used. Remove if not needed.

  useEffect(() => {
    const pathParts = location.pathname.split('/');
    const token = pathParts[pathParts.length - 1];

    if (!token || token === "assessment") { // Ensure token is valid
      setError('Invalid assessment link or token missing.');
      setErrorType('invalid_link');
      setLoading(false);
      return;
    }

    const fetchAssessmentData = async () => {
      try {
        setLoading(true);
        setError(null); // Clear previous errors
        setErrorType(null);
        const response = await axios.get(`${API_URL}/feedback/assessment/${token}`);
        setAssessmentData(response.data);
      } catch (err) {
        console.error('Error fetching assessment data:', err);
        if (err.response) {
          setErrorType(err.response.data.error || 'fetch_failed');
          setError(err.response.data.message || 'Failed to load assessment data.');
        } else {
          setErrorType('network_error');
          setError('Unable to connect to the server. Please check your internet connection.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAssessmentData();
  }, [location.pathname]);

  const renderErrorState = () => {
    let icon = <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />;
    let title = 'Error Loading Assessment';
    let message = error; // Use the error state
    let showHomeButton = true;

    // Customize based on errorType
    if (errorType === 'campaign_inactive') {
      icon = <Clock className="h-16 w-16 text-yellow-500 mb-4" />;
      title = 'Campaign Inactive';
    } else if (errorType === 'already_completed') {
      icon = <CheckCircle className="h-16 w-16 text-green-500 mb-4" />;
      title = 'Already Completed';
    } else if (errorType === 'campaign_ended') {
      icon = <Clock className="h-16 w-16 text-text-muted mb-4" />; // Use themed muted text
      title = 'Campaign Ended';
    } else if (errorType === 'invalid_link') {
       title = 'Invalid Link';
    }


    return (
      // Use themed surface for card, base text, muted text for message
      <div className="max-w-md mx-auto mt-12 sm:mt-20 p-6 bg-bg-surface rounded-lg shadow-xl text-center">
        {icon}
        <h2 className="text-xl font-bold text-text-base mb-2">{title}</h2>
        <p className="text-text-muted mb-6">{message}</p>
        {showHomeButton && (
          <button
            onClick={() => window.location.href = '/'} // Or use navigate('/') if inside Router context and appropriate
            // Use themed button classes
            className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-md shadow-md transition-colors"
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
      // Use themed colors for spinner and text
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-muted">
        <div className="w-12 h-12 border-4 border-border-muted border-t-primary rounded-full animate-spin"></div>
        <p className="mt-4 text-text-muted">Loading assessment...</p>
      </div>
    );
  }

  if (error) {
    return renderErrorState();
  }

  if (!assessmentData) {
    // This case might be covered by error handling, but good as a fallback
    return (
      <div className="max-w-md mx-auto mt-12 sm:mt-20 p-6 bg-bg-surface rounded-lg shadow-xl">
        <p className="text-text-muted text-center">No assessment data found. Please check your link.</p>
      </div>
    );
  }

  // Container class is fine, it uses generic grays which are okay or will be overridden by ExternalLayout's body bg
  const containerClass = isExternalUser()
    ? "min-h-screen bg-bg-muted py-8 sm:py-12 px-4 sm:px-6 lg:px-8" // Adjusted padding
    : "bg-bg-muted py-6 px-4"; // This case might not be hit if App.jsx forces ExternalLayout for this route

  return (
    <div className={containerClass}>
      {isExternalUser() && (
        <div className="max-w-3xl mx-auto mb-6">
          {/* Use themed surface, text-accent for header, muted text for subtext */}
          <div className="bg-bg-surface rounded-lg shadow-md p-4 text-center mb-6">
            <h1 className="text-xl font-bold text-text-accent">Pulse360 Feedback</h1>
            <p className="text-sm text-text-muted">Thank you for participating in this feedback process</p>
          </div>
        </div>
      )}

      <FeedbackAssessment
        campaignId={assessmentData.campaign.id}
        assessorToken={assessmentData.token}
        questions={assessmentData.questions}
        targetEmployee={assessmentData.targetEmployee}
        assessorType={assessmentData.assessorType}
        introMessage={assessmentData.introMessage}
        initialResponses={assessmentData.questions.reduce((acc, question) => {
          if (question.response) {
            if (question.response.text !== null && question.response.text !== undefined) { // Check for null/undefined
              acc.textResponses[question.id] = question.response.text;
            }
            if (question.response.rating !== null && question.response.rating !== undefined) { // Check for null/undefined
              acc.ratings[question.id] = question.response.rating;
            }
          }
          return acc;
        }, { textResponses: {}, ratings: {} })}
      />

      {/* Footer for external users (if shown via this page) */}
      {isExternalUser() && (
        <div className="max-w-3xl mx-auto mt-8">
          <div className="bg-bg-surface rounded-lg shadow-sm p-4 text-center">
            <p className="text-sm text-text-muted">
              &copy; {new Date().getFullYear()} Pulse360. All rights reserved.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackAssessmentPage;