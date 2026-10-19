import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
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
import { useConfirmResetMutation } from '../api';
import { apiErrorMessage } from '@/types/api';
import { passwordSchema } from '@/utils/validators';

const resetSchema = z
  .object({
    new_password: passwordSchema,
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [confirmReset, { isLoading }] = useConfirmResetMutation();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  const missingToken = useMemo(() => !token, [token]);

  const onSubmit = async (values: ResetForm) => {
    if (!token) return;
    setError(null);
    try {
      await confirmReset({ token, new_password: values.new_password }).unwrap();
      setDone(true);
      enqueueSnackbar('Password updated. Please sign in.', { variant: 'success' });
    } catch (err) {
      setError(apiErrorMessage(err, 'This reset link is invalid or expired.'));
    }
  };

  return (
    <Paper elevation={0} sx={{ p: { xs: 3, sm: 5 }, maxWidth: 440, width: '100%' }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Set a new password
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose a strong password you haven&apos;t used before.
          </Typography>
        </Box>

        {missingToken && !done && (
          <Alert severity="error">This reset link is invalid or has expired.</Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {done && <Alert severity="success">Your password has been reset.</Alert>}

        {!missingToken && !done && (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2.5}>
              <TextField
                label="New password"
                type="password"
                fullWidth
                autoComplete="new-password"
                {...register('new_password')}
                error={Boolean(errors.new_password)}
                helperText={errors.new_password?.message ?? 'At least 8 characters with letters and numbers'}
              />
              <TextField
                label="Confirm new password"
                type="password"
                fullWidth
                autoComplete="new-password"
                {...register('confirm_password')}
                error={Boolean(errors.confirm_password)}
                helperText={errors.confirm_password?.message}
              />
              <Button type="submit" variant="contained" size="large" fullWidth disabled={isLoading}>
                {isLoading ? 'Updating…' : 'Update password'}
              </Button>
            </Stack>
          </form>
        )}

        {done && (
          <Button variant="contained" size="large" fullWidth onClick={() => navigate('/login')}>
            Go to sign in
          </Button>
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
