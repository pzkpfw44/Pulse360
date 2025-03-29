import React from 'react';
import { Typography, Box, Grid, Paper, Button, Chip } from '@mui/material';
import { 
  Users, MessageSquare, FileText, BarChart2, 
  CheckCircle, Clock, AlertTriangle 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const MetricCard = ({ title, value, subtitle, icon: Icon, trend }) => {
  return (
    <Paper className="metric-card p-4">
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h4" component="div" sx={{ mt: 1, fontWeight: 'bold' }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
          
          {trend && (
            <Box 
              sx={{ 
                mt: 1, 
                display: 'flex', 
                alignItems: 'center',
                color: trend.isPositive ? 'success.main' : 'error.main',
                fontSize: '0.75rem'
              }}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% vs last period
            </Box>
          )}
        </Box>
        
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            bgcolor: 'primary.light', 
            color: 'primary.main',
            borderRadius: '50%',
            width: 48,
            height: 48
          }}
        >
          <Icon size={24} />
        </Box>
      </Box>
    </Paper>
  );
};

const StatusIndicator = ({ label, status }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: status === 'active' ? 'success.main' : 'warning.main',
          mr: 1
        }}
      />
      <Typography variant="body2">{label}</Typography>
    </Box>
  );
};

const Dashboard = () => {
  return (
    <Box>
      <Box className="page-title">
        <Typography variant="h4" component="h1" fontWeight="bold">
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Welcome to Pulse360, your AI-assisted 360-degree feedback platform.
        </Typography>
      </Box>

      {/* Metrics Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard 
            title="Active Participants" 
            value="126" 
            subtitle="Across 4 feedback cycles"
            icon={Users}
            trend={{ value: 12, isPositive: true }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard 
            title="Feedback Responses" 
            value="843" 
            subtitle="78% completion rate"
            icon={MessageSquare}
            trend={{ value: 8, isPositive: true }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard 
            title="Active Templates" 
            value="12" 
            subtitle="3 pending approval"
            icon={FileText}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} lg={3}>
          <MetricCard 
            title="Reports Generated" 
            value="38" 
            subtitle="Last 30 days"
            icon={BarChart2}
            trend={{ value: 5, isPositive: false }}
          />
        </Grid>
      </Grid>

      {/* System Status */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>System Status</Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>ContextHub</Typography>
            <StatusIndicator status="active" label="Operational" />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>ControlHub</Typography>
            <StatusIndicator status="active" label="Operational" />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>FeedbackHub</Typography>
            <StatusIndicator status="active" label="Operational" />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Flux AI Integration</Typography>
            <StatusIndicator status="active" label="Operational" />
          </Grid>
        </Grid>
      </Paper>

      {/* Bottom Sections */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Upcoming Deadlines</Typography>
            
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">Q2 Performance Cycle</Typography>
                <Chip 
                  label="High Priority" 
                  size="small" 
                  sx={{ bgcolor: 'error.light', color: 'error.dark' }} 
                />
              </Box>
              <Typography variant="body2" color="text.secondary">Ends in 5 days</Typography>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">Leadership Assessment</Typography>
                <Chip 
                  label="Medium Priority" 
                  size="small" 
                  sx={{ bgcolor: 'primary.light', color: 'primary.main' }} 
                />
              </Box>
              <Typography variant="body2" color="text.secondary">Ends in 12 days</Typography>
            </Box>
            
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">Product Team 360</Typography>
                <Chip 
                  label="Upcoming" 
                  size="small" 
                  sx={{ bgcolor: 'success.light', color: 'success.dark' }} 
                />
              </Box>
              <Typography variant="body2" color="text.secondary">Starts in 3 days</Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Recent Activity</Typography>
            
            <Box sx={{ display: 'flex', mb: 3 }}>
              <FileText size={18} style={{ marginRight: 12, marginTop: 2 }} />
              <Box>
                <Typography variant="subtitle2">New template added</Typography>
                <Typography variant="body2" color="text.secondary">Technical Leadership Review</Typography>
                <Typography variant="caption" color="text.secondary">2 hours ago</Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', mb: 3 }}>
              <Users size={18} style={{ marginRight: 12, marginTop: 2 }} />
              <Box>
                <Typography variant="subtitle2">15 users added to cycle</Typography>
                <Typography variant="body2" color="text.secondary">Q2 Performance Review</Typography>
                <Typography variant="caption" color="text.secondary">Yesterday</Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex' }}>
              <BarChart2 size={18} style={{ marginRight: 12, marginTop: 2 }} />
              <Box>
                <Typography variant="subtitle2">5 reports generated</Typography>
                <Typography variant="body2" color="text.secondary">Leadership Assessment</Typography>
                <Typography variant="caption" color="text.secondary">2 days ago</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Quick Action Buttons */}
      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button 
          variant="contained" 
          component={Link} 
          to="/contexthub"
        >
          Go to ContextHub
        </Button>
        
        <Button 
          variant="outlined" 
          component={Link} 
          to="/feedback"
        >
          Provide Feedback
        </Button>
      </Box>
    </Box>
  );
};

export default Dashboard;