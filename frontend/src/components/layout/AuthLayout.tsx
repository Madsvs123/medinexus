import { Avatar, Box, Stack, Typography } from '@mui/material';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import { Outlet } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

export default function AuthLayout() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'radial-gradient(ellipse at top, #1E293B 0%, #0F172A 60%)'
            : 'radial-gradient(ellipse at top, #E7F4EF 0%, #F6F8F7 60%)',
      }}
    >
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <ThemeToggle />
      </Box>

      <Stack spacing={1} alignItems="center" sx={{ mb: 3 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }} variant="rounded">
          <MedicalServicesIcon fontSize="large" />
        </Avatar>
        <Typography variant="h4" fontWeight={800} color="primary.main">
          MediNexus
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Integrated hospital management platform
        </Typography>
      </Stack>

      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <Outlet />
      </Box>

      <Typography variant="caption" color="text.disabled" sx={{ mt: 4 }}>
        © {new Date().getFullYear()} MediNexus. All rights reserved.
      </Typography>
    </Box>
  );
}
