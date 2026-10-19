import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { usePasswordResetMutation } from '../api';
import { apiErrorMessage } from '@/types/api';
import { emailSchema } from '@/utils/validators';

const forgotSchema = z.object({ email: emailSchema });
type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [reset, { isLoading }] = usePasswordResetMutation();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({ resolver: zodResolver(forgotSchema) });

  const onSubmit = async (values: ForgotForm) => {
    setError(null);
    try {
      await reset({ email: values.email }).unwrap();
      setSent(true);
      enqueueSnackbar('Password reset link sent.', { variant: 'success' });
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send the reset link.'));
    }
  };

  return (
    <Paper elevation={0} sx={{ p: { xs: 3, sm: 5 }, maxWidth: 440, width: '100%' }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Reset your password
          </Typography>
          <Typography variant="body2" color="text.secondary">
            We&apos;ll email you a link to set a new password.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {sent && (
          <Alert severity="success">
            If an account exists for that email, a reset link has been sent.
          </Alert>
        )}

        {!sent && (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2.5}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                autoComplete="email"
                {...register('email')}
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
              />
              <Button type="submit" variant="contained" size="large" fullWidth disabled={isLoading}>
                {isLoading ? 'Sending…' : 'Send reset link'}
              </Button>
            </Stack>
          </form>
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
