import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { enqueueSnackbar } from 'notistack';
import {
  useResendVerificationMutation,
  useVerifyEmailMutation,
} from '../api';
import { apiErrorMessage } from '@/types/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const emailFromQuery = searchParams.get('email') ?? '';

  const [verifyEmail, { isLoading }] = useVerifyEmailMutation();
  const [resend, { isLoading: isResending }] = useResendVerificationMutation();

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState(emailFromQuery);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (!token) return;
    setStatus('verifying');
    verifyEmail({ token })
      .unwrap()
      .then(() => {
        setStatus('success');
        enqueueSnackbar('Email verified! You can now sign in.', { variant: 'success' });
      })
      .catch((err) => {
        setStatus('error');
        setError(apiErrorMessage(err, 'This verification link is invalid or expired.'));
      });
  }, [token, verifyEmail]);

  const content = useMemo(() => {
    switch (status) {
      case 'verifying':
        return <Typography>Verifying your email…</Typography>;
      case 'success':
        return (
          <Stack spacing={2}>
            <Alert severity="success">Your email has been verified successfully.</Alert>
            <Button variant="contained" onClick={() => navigate('/login')}>
              Go to sign in
            </Button>
          </Stack>
        );
      case 'error':
        return <Alert severity="error">{error}</Alert>;
      default:
        return null;
    }
  }, [status, error, navigate]);

  const handleResend = async () => {
    if (!resendEmail.trim()) {
      setError('Enter the email address you registered with.');
      return;
    }
    setError(null);
    try {
      await resend({ email: resendEmail.trim() }).unwrap();
      setResendSent(true);
      enqueueSnackbar('Verification email sent.', { variant: 'success' });
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not resend the verification email.'));
    }
  };

  return (
    <Paper elevation={0} sx={{ p: { xs: 3, sm: 5 }, maxWidth: 460, width: '100%' }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Verify your email
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {token
              ? 'Confirming your verification link…'
              : 'Enter your email to receive a new verification link.'}
          </Typography>
        </Box>

        {content}

        {(!token || status === 'error') && (
          <Stack spacing={2}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              disabled={resendSent}
            />
            {resendSent ? (
              <Alert severity="info">Verification email sent — check your inbox.</Alert>
            ) : (
              <Button variant="contained" onClick={handleResend} disabled={isResending}>
                {isResending ? 'Sending…' : 'Resend verification email'}
              </Button>
            )}
          </Stack>
        )}

        <Typography variant="body2" color="text.secondary" textAlign="center">
          <Link component={RouterLink} to="/login">
            Back to sign in
          </Link>
        </Typography>
      </Stack>
    </Paper>
  );
}
