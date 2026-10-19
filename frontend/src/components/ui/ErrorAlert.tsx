import { Alert, Collapse, Typography } from '@mui/material';
import { apiErrorMessage } from '@/types/api';

interface ErrorAlertProps {
  error: unknown;
  fallback?: string;
  onDismiss?: () => void;
}

export default function ErrorAlert({ error, fallback, onDismiss }: ErrorAlertProps) {
  if (!error) return null;
  const message = apiErrorMessage(error, fallback);
  return (
    <Collapse in>
      <Alert severity="error" onClose={onDismiss} role="alert" sx={{ mb: 2 }}>
        <Typography variant="body2">{message}</Typography>
      </Alert>
    </Collapse>
  );
}
