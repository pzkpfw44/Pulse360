import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, MessageSquare, FileText, BarChart2, 
  CheckCircle, Clock, AlertTriangle, 
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';

const MetricCard = ({ title, value, subtitle, icon: Icon, trend }) => {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          )}
          
          {trend && (
            <div className={`mt-2 flex items-center text-xs font-medium ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend.isPositive ? (
                <ArrowUpRight className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-1" />
              )}
              {Math.abs(trend.value)}% vs last period
            </div>
          )}
        </div>
        
        <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

const StatusIndicator = ({ label, status }) => {
  return (
    <div className="flex items-center mb-1">
      <div
        className={`w-2 h-2 rounded-full mr-2 ${
          status === 'active' ? 'bg-green-500' : 'bg-amber-500'
        }`}
      />
      <span className="text-sm">{label}</span>
    </div>
  );
};

const Dashboard = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500 text-sm">
          Welcome to Pulse360, your AI-assisted 360-degree feedback platform.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard 
          title="Active Participants" 
          value="126" 
          subtitle="Across 4 feedback cycles"
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        
        <MetricCard 
          title="Feedback Responses" 
          value="843" 
          subtitle="78% completion rate"
          icon={MessageSquare}
          trend={{ value: 8, isPositive: true }}
        />
        
        <MetricCard 
          title="Active Templates" 
          value="12" 
          subtitle="3 pending approval"
          icon={FileText}
        />
        
        <MetricCard 
          title="Reports Generated" 
          value="38" 
          subtitle="Last 30 days"
          icon={BarChart2}
          trend={{ value: 5, isPositive: false }}
        />
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow p-5 mb-6">
        <h2 className="text-lg font-semibold mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <h3 className="text-sm font-medium mb-2">ContextHub</h3>
            <StatusIndicator status="active" label="Operational" />
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">ControlHub</h3>
            <StatusIndicator status="active" label="Operational" />
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">FeedbackHub</h3>
            <StatusIndicator status="active" label="Operational" />
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">Flux AI Integration</h3>
            <StatusIndicator status="active" label="Operational" />
          </div>
        </div>
      </div>

      {/* Bottom Sections */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-7">
          <div className="bg-white rounded-lg shadow p-5 h-full">
            <h2 className="text-lg font-semibold mb-4">Upcoming Deadlines</h2>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-sm font-medium">Q2 Performance Cycle</h3>
                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                  High Priority
                </span>
              </div>
              <p className="text-sm text-gray-500">Ends in 5 days</p>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-sm font-medium">Leadership Assessment</h3>
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  Medium Priority
                </span>
              </div>
              <p className="text-sm text-gray-500">Ends in 12 days</p>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-sm font-medium">Product Team 360</h3>
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  Upcoming
                </span>
              </div>
              <p className="text-sm text-gray-500">Starts in 3 days</p>
            </div>
          </div>
        </div>
        
        <div className="md:col-span-5">
          <div className="bg-white rounded-lg shadow p-5 h-full">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            
            <div className="flex mb-4">
              <FileText size={16} className="mt-0.5 mr-3 text-gray-400 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium">New template added</h3>
                <p className="text-sm text-gray-500">Technical Leadership Review</p>
                <p className="text-xs text-gray-400 mt-0.5">2 hours ago</p>
              </div>
            </div>
            
            <div className="flex mb-4">
              <Users size={16} className="mt-0.5 mr-3 text-gray-400 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium">15 users added to cycle</h3>
                <p className="text-sm text-gray-500">Q2 Performance Review</p>
                <p className="text-xs text-gray-400 mt-0.5">Yesterday</p>
              </div>
            </div>
            
            <div className="flex">
              <BarChart2 size={16} className="mt-0.5 mr-3 text-gray-400 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium">5 reports generated</h3>
                <p className="text-sm text-gray-500">Leadership Assessment</p>
                <p className="text-xs text-gray-400 mt-0.5">2 days ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Action Buttons */}
      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        <Link 
          to="/contexthub"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors text-sm font-medium"
        >
          Go to ContextHub
        </Link>
        
        <Link 
          to="/feedback"
          className="px-4 py-2 border border-blue-600 bg-white hover:bg-blue-50 text-blue-600 rounded-md shadow-sm transition-colors text-sm font-medium"
        >
          Provide Feedback
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;