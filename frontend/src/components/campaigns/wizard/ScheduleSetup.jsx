// frontend/src/components/campaigns/wizard/ScheduleSetup.jsx

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle, Info } from 'lucide-react';

const ScheduleSetup = ({ data, onDataChange, onNext }) => {
  const [startDate, setStartDate] = useState(() => {
     // Initialize start date: use data.startDate or today, whichever is later
     const initialStartDate = data.startDate ? new Date(data.startDate) : new Date();
     const today = new Date();
     today.setHours(0, 0, 0, 0); // Normalize today to midnight
     return initialStartDate < today ? today : initialStartDate;
  });

  const [endDate, setEndDate] = useState(() => {
    // Initialize end date: use data.endDate or 2 weeks after start date
    if (data.endDate) {
        const initialEndDate = new Date(data.endDate);
        // Ensure end date is not before start date
        return initialEndDate < startDate ? new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000) : initialEndDate;
    } else {
        return new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    }
  });

  const [reminderFrequency, setReminderFrequency] = useState(data.settings?.reminderFrequency ?? 7); // Get from settings object
  const [error, setError] = useState(null);

  // Format date for input field
  const formatDateForInput = (date) => {
    if (!date) return '';
    // Adjust for timezone offset before converting to ISO string
    const adjustedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return adjustedDate.toISOString().split('T')[0];
  };

  // Update parent component when dates or frequency change
  useEffect(() => {
    // Only call onDataChange if data has actually changed
    if (data.startDate !== startDate || data.endDate !== endDate || (data.settings?.reminderFrequency ?? 7) !== reminderFrequency) {
        onDataChange({
            startDate: startDate,
            endDate: endDate,
            settings: { // Update within settings object
                ...data.settings,
                reminderFrequency: reminderFrequency
            }
        });
    }
  }, [startDate, endDate, reminderFrequency, onDataChange, data.startDate, data.endDate, data.settings]);

  // Validate dates whenever they change
  useEffect(() => {
    validateDates();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  // Validate dates
  const validateDates = () => {
    if (!startDate || !endDate) {
      setError('Both start and end dates are required');
      return false;
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0); // Normalize start date
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0); // Normalize end date
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today

     // Check if start date is in the past
     if (start < today) {
      setError('Start date cannot be in the past');
      return false;
    }


    if (start > end) {
      setError('End date must be on or after start date');
      return false;
    }

    // Calculate difference in days
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include start and end day

    if (diffDays < 5) {
      setError('Feedback period should be at least 5 days');
      return false;
    }

    if (diffDays > 90) { // Increased limit
      setError('Feedback period should ideally not exceed 90 days');
      // Not returning false, just a warning/suggestion
    }

    setError(null); // Clear error if validation passes
    return true;
  };

  const handleStartDateChange = (e) => {
     const newStartDate = new Date(e.target.value + 'T00:00:00'); // Ensure time is set to start of day in local timezone
     const today = new Date();
     today.setHours(0,0,0,0);
     if (newStartDate >= today) {
       setStartDate(newStartDate);
       // Adjust end date if it becomes earlier than new start date
       if (endDate < newStartDate) {
           const newEndDate = new Date(newStartDate);
           newEndDate.setDate(newEndDate.getDate() + 14); // Default to 2 weeks after new start date
           setEndDate(newEndDate);
       }
     } else {
       setError("Start date cannot be in the past.");
     }
  };

  const handleEndDateChange = (e) => {
    const newEndDate = new Date(e.target.value + 'T00:00:00'); // Ensure time is set to start of day in local timezone
    if (newEndDate >= startDate) {
        setEndDate(newEndDate);
    } else {
        setError("End date must be on or after the start date.");
    }
  };

  const handleReminderFrequencyChange = (e) => {
    setReminderFrequency(Number(e.target.value));
    // useEffect handles onDataChange
  };

  // Removed handleNextClick function as the button is removed.

  // Calculate suggested end date (two weeks from start)
  const getSuggestedEndDate = (start) => {
    const suggestedEnd = new Date(start);
    suggestedEnd.setDate(suggestedEnd.getDate() + 14);
    return suggestedEnd;
  };

  // Apply suggested end date
  const applyDefaultSchedule = () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    setStartDate(today);
    setEndDate(getSuggestedEndDate(today));
     // useEffect handles onDataChange
  };

    // Calculate duration
    const calculateDuration = () => {
      if (!startDate || !endDate || startDate > endDate) return 0;
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive of start/end days
      return diffDays;
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
              <li>Two weeks is the recommended time frame for a 360 campaign.</li>
              <li>Avoid scheduling during major holidays or company events.</li>
              <li>Ensure the period is long enough (min. 5 days).</li>
              <li>Reminders help keep participation on track.</li>
            </ul>
            <button
              onClick={applyDefaultSchedule}
              className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              Apply Suggested Schedule (Start Today, Duration 2 weeks)
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
            Start Date <span className="text-red-500">*</span>
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="startDate"
              type="date"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={formatDateForInput(startDate)}
              onChange={handleStartDateChange}
              min={formatDateForInput(new Date())} // Prevent selecting past dates
              required
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            The date when invitations will be sent to assessors.
          </p>
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
            End Date <span className="text-red-500">*</span>
          </label>
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="endDate"
              type="date"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={formatDateForInput(endDate)}
              onChange={handleEndDateChange}
              min={formatDateForInput(startDate)} // End date cannot be before start date
              required
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            The deadline for completing all feedback.
          </p>
        </div>
      </div>

      <div className="mb-6">
        <label htmlFor="reminderFrequency" className="block text-sm font-medium text-gray-700 mb-1">
          Reminder Frequency
        </label>
        <div className="relative rounded-md shadow-sm max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          <select
             id="reminderFrequency"
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
          How often to send reminder emails to assessors who haven't completed their feedback.
        </p>
      </div>

      {/* Schedule Information Display */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Campaign Timeline</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center">
            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-0 md:mr-3 mb-2 md:mb-0 flex-shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Start Date</p>
              <p className="text-xs text-gray-500">{startDate ? startDate.toLocaleDateString() : 'Not set'}</p>
            </div>
          </div>

           <div className="flex flex-col md:flex-row items-center">
            <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mr-0 md:mr-3 mb-2 md:mb-0 flex-shrink-0">
               <Clock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Duration</p>
              <p className="text-xs text-gray-500">{calculateDuration()} days</p>
            </div>
          </div>


          <div className="flex flex-col md:flex-row items-center">
            <div className="h-8 w-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center mr-0 md:mr-3 mb-2 md:mb-0 flex-shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">End Date</p>
              <p className="text-xs text-gray-500">{endDate ? endDate.toLocaleDateString() : 'Not set'}</p>
            </div>
          </div>
        </div>
      </div>

       {/* The redundant button block that was here has been removed */}

    </div>
  );
};

export default ScheduleSetup;