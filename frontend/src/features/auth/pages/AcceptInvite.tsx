import { useState } from 'react';
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
import { useAcceptInvitationMutation } from '../api';
import { useAppDispatch } from '@/app/hooks';
import { setCredentials } from '../authSlice';
import { storeTokens } from '@/app/api/baseApi';
import { apiErrorMessage } from '@/types/api';
import { emailSchema, fullNameSchema, passwordSchema, phoneSchema } from '@/utils/validators';

const inviteSchema = z
  .object({
    first_name: fullNameSchema,
    last_name: fullNameSchema,
    email: emailSchema.optional(),
    phone: phoneSchema,
    password: passwordSchema,
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type InviteForm = z.infer<typeof inviteSchema>;

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const token = searchParams.get('token');
  const [acceptInvitation, { isLoading }] = useAcceptInvitationMutation();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteForm>({ resolver: zodResolver(inviteSchema) });

  const onSubmit = async (values: InviteForm) => {
    if (!token) return;
    setError(null);
    try {
      const result = await acceptInvitation({
        token,
        first_name: values.first_name,
        last_name: values.last_name,
        password: values.password,
      }).unwrap();
      storeTokens(result.access, result.refresh);
      dispatch(
        setCredentials({
          accessToken: result.access,
          refreshToken: result.refresh,
          user: result.user,
        }),
      );
      enqueueSnackbar('Welcome aboard! Your account is ready.', { variant: 'success' });
      navigate('/', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'This invitation link is invalid or has expired.'));
    }
  };

  return (
    <Paper elevation={0} sx={{ p: { xs: 3, sm: 5 }, maxWidth: 460, width: '100%' }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Accept your invitation
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You&apos;ve been invited to join a MediNexus organization. Set up your account to get
            started.
          </Typography>
        </Box>

        {!token && <Alert severity="error">This invitation link is invalid or has expired.</Alert>}
        {error && <Alert severity="error">{error}</Alert>}

        {token && (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack spacing={2.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="First name"
                  fullWidth
                  autoComplete="given-name"
                  {...register('first_name')}
                  error={Boolean(errors.first_name)}
                  helperText={errors.first_name?.message}
                />
                <TextField
                  label="Last name"
                  fullWidth
                  autoComplete="family-name"
                  {...register('last_name')}
                  error={Boolean(errors.last_name)}
                  helperText={errors.last_name?.message}
                />
              </Stack>
              <TextField
                label="Phone (optional)"
                fullWidth
                autoComplete="tel"
                {...register('phone')}
                error={Boolean(errors.phone)}
                helperText={errors.phone?.message}
              />
              <TextField
                label="Password"
                type="password"
                fullWidth
                autoComplete="new-password"
                {...register('password')}
                error={Boolean(errors.password)}
                helperText={errors.password?.message ?? 'At least 8 characters with letters and numbers'}
              />
              <TextField
                label="Confirm password"
                type="password"
                fullWidth
                autoComplete="new-password"
                {...register('confirm_password')}
                error={Boolean(errors.confirm_password)}
                helperText={errors.confirm_password?.message}
              />
              <Button type="submit" variant="contained" size="large" fullWidth disabled={isLoading}>
                {isLoading ? 'Setting up…' : 'Accept invitation & create account'}
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
