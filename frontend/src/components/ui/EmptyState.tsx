import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <Box sx={{ textAlign: 'center', py: 4, px: 2 }} role="status">
      <Stack spacing={1} alignItems="center">
        {icon && (
          <Box sx={{ color: 'text.disabled', fontSize: 48, lineHeight: 1 }} aria-hidden>
            {icon}
          </Box>
        )}
        <Typography variant="h6" color="text.secondary">
          {title}
        </Typography>
        {hint && (
          <Typography variant="body2" color="text.disabled" maxWidth={380}>
            {hint}
          </Typography>
        )}
        {action && <Box sx={{ mt: 1 }}>{action}</Box>}
      </Stack>
    </Box>
  );
}
