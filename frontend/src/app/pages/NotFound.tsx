import { Box, Button, Stack, Typography } from '@mui/material';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { Link as RouterLink } from 'react-router-dom';

export default function NotFound() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Stack spacing={2} alignItems="center" textAlign="center">
        <SearchOffIcon sx={{ fontSize: 72, color: 'text.disabled' }} aria-hidden />
        <Typography variant="h4" fontWeight={700}>
          404 — Page not found
        </Typography>
        <Typography variant="body1" color="text.secondary" maxWidth={420}>
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </Typography>
        <Button component={RouterLink} to="/" variant="contained">
          Go to dashboard
        </Button>
      </Stack>
    </Box>
  );
}
