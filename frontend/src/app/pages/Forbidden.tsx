import { Box, Button, Stack, Typography } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { Link as RouterLink } from 'react-router-dom';

export default function Forbidden() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Stack spacing={2} alignItems="center" textAlign="center">
        <LockIcon sx={{ fontSize: 72, color: 'text.disabled' }} aria-hidden />
        <Typography variant="h4" fontWeight={700}>
          403 — Access denied
        </Typography>
        <Typography variant="body1" color="text.secondary" maxWidth={420}>
          You don&apos;t have permission to view this page. If you believe this is a mistake, contact
          your organization administrator.
        </Typography>
        <Button component={RouterLink} to="/" variant="contained">
          Back to home
        </Button>
      </Stack>
    </Box>
  );
}
