// frontend/src/components/campaigns/wizard/ScheduleSetup.jsx

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle, Info } from 'lucide-react';

const ScheduleSetup = ({ data, onDataChange, onNext }) => {
  const [startDate, setStartDate] = useState(data.startDate ? new Date(data.startDate) : new Date());
  const [endDate, setEndDate] = useState(data.endDate ? new Date(data.endDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
  const [reminderFrequency, setReminderFrequency] = useState(data.reminderFrequency || 7);
  const [error, setError] = useState(null);
  
  // Format date for input field
  const formatDateForInput = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Update parent component when dates change
  useEffect(() => {
    onDataChange({
      startDate,
      endDate,
      reminderFrequency
    });
  }, [startDate, endDate, reminderFrequency]);

  // Validate dates
  const validateDates = () => {
    if (!startDate || !endDate) {
      setError('Both start and end dates are required');
      return false;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      setError('End date must be after start date');
      return false;
    }

    // Calculate difference in days
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 5) {
      setError('Feedback period should be at least 5 days to allow sufficient time');
      return false;
    }

    if (diffDays > 30) {
      setError('Feedback period should not exceed 30 days to maintain momentum');
      return false;
    }

    setError(null);
    return true;
  };

  const handleStartDateChange = (e) => {
    setStartDate(new Date(e.target.value));
  };

  const handleEndDateChange = (e) => {
    setEndDate(new Date(e.target.value));
  };

  const handleReminderFrequencyChange = (e) => {
    setReminderFrequency(Number(e.target.value));
  };

  const handleNextClick = () => {
    if (validateDates()) {
      onNext({
        startDate,
        endDate,
        reminderFrequency
      });
    }
  };

  // Calculate suggested end date (two weeks from start)
  const getSuggestedEndDate = () => {
    const suggestedEnd = new Date(startDate);
    suggestedEnd.setDate(suggestedEnd.getDate() + 14);
    return suggestedEnd;
  };

  // Apply suggested end date
  const applyDefaultSchedule = () => {
    const today = new Date();
    setStartDate(today);
    setEndDate(getSuggestedEndDate());
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Schedule Your Campaign</h2>
        <p className="text-gray-600">
          Set the timeline for when assessors will receive invitations and when feedback should be completed.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-medium text-blue-700">Scheduling Tips</h3>
            <ul className="mt-1 text-sm text-blue-600 list-disc pl-5 space-y-1">
              <li>Two weeks is the recommended time frame for a 360 campaign</li>
              <li>Avoid scheduling during major holidays or company events</li>
              <li>For senior roles, consider allowing more time for thoughtful feedback</li>
              <li>Weekly reminders will be sent to participants who haven't completed their feedback</li>
            </ul>
            <button
              onClick={applyDefaultSchedule}
              className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              Apply Suggested Schedule (2 weeks)
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date <span className="text-red-500">*</span>
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="date"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={formatDateForInput(startDate)}
              onChange={handleStartDateChange}
              min={formatDateForInput(new Date())}
              required
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            The date when invitations will be sent to assessors
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date <span className="text-red-500">*</span>
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="date"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={formatDateForInput(endDate)}
              onChange={handleEndDateChange}
              min={formatDateForInput(startDate)}
              required
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            The deadline for completing all feedback
          </p>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reminder Frequency
        </label>
        <div className="relative rounded-md shadow-sm max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          <select
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={reminderFrequency}
            onChange={handleReminderFrequencyChange}
          >
            <option value={3}>Every 3 days</option>
            <option value={5}>Every 5 days</option>
            <option value={7}>Every 7 days (weekly)</option>
            <option value={0}>No automatic reminders</option>
          </select>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          How often to send reminder emails to assessors who haven't completed their feedback
        </p>
      </div>

      {/* Schedule Information Display */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Campaign Timeline</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
              <span className="text-sm font-medium">1</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Launch</p>
              <p className="text-xs text-gray-500">{startDate.toLocaleDateString()}</p>
              <p className="text-xs text-gray-500">Send invitations to all assessors</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mr-3">
              <span className="text-sm font-medium">2</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Feedback Period</p>
              <p className="text-xs text-gray-500">
                {Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24))} days
              </p>
              <p className="text-xs text-gray-500">
                {reminderFrequency > 0 
                  ? `Automatic reminders every ${reminderFrequency} days` 
                  : 'No automatic reminders'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center mr-3">
              <span className="text-sm font-medium">3</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Deadline</p>
              <p className="text-xs text-gray-500">{endDate.toLocaleDateString()}</p>
              <p className="text-xs text-gray-500">Final day to submit feedback</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3">
              <span className="text-sm font-medium">4</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Report Generation</p>
              <p className="text-xs text-gray-500">
                {new Date(endDate.getTime() + 24 * 60 * 60 * 1000).toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-500">Results processed and available for review</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={handleNextClick}
          disabled={!startDate || !endDate}
          className={`px-4 py-2 text-white rounded-md ${
            startDate && endDate
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          Next: Email Setup
        </button>
      </div>
    </div>
  );
};

export default ScheduleSetup;