import React from 'react';
import { Typography, Container, Box, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Pulse360 Dashboard
        </Typography>
        <Typography variant="body1" paragraph>
          Welcome to Pulse360, your AI-assisted 360-degree feedback platform.
        </Typography>
        <Button 
          variant="contained" 
          component={Link} 
          to="/contexthub"
        >
          Go to ContextHub
        </Button>
      </Box>
    </Container>
  );
};

export default Dashboard;