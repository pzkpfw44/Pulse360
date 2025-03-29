import React from 'react';
import { Alert, Box, Typography, Paper } from '@mui/material';
import { Construction } from 'lucide-react';

const WorkInProgress = ({ title }) => {
  return (
    <Box>
      <Box className="mb-6">
        <Typography variant="h4" component="h1" className="font-bold">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" className="mt-1">
          This section is currently under development
        </Typography>
      </Box>

      <Paper className="p-12 flex flex-col items-center justify-center text-center">
        <Construction size={64} className="text-blue-500 mb-4" />
        <Typography variant="h5" className="mb-2 font-medium">
          Work in Progress
        </Typography>
        <Typography variant="body1" color="text.secondary" className="max-w-lg">
          We're actively developing this feature for Pulse360. It will be available soon to help streamline your 360-degree feedback processes.
        </Typography>
      </Paper>
    </Box>
  );
};

export default WorkInProgress;