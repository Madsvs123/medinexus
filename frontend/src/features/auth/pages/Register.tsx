import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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
import { useRegisterMutation } from '../api';
import { apiErrorMessage } from '@/types/api';
import { emailSchema, fullNameSchema, passwordSchema, phoneSchema } from '@/utils/validators';

const registerSchema = z.object({
  first_name: fullNameSchema,
  last_name: fullNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  confirm_password: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [registerUser, { isLoading }] = useRegisterMutation();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterForm) => {
    setError(null);
    try {
      await registerUser({
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        password: values.password,
        phone: values.phone || undefined,
      }).unwrap();
      enqueueSnackbar(
        'Account created! Please check your email to verify your address.',
        { variant: 'success' },
      );
      navigate(`/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch (err) {
      setError(apiErrorMessage(err, 'Registration failed. Please try again.'));
    }
  };

  return (
    <Paper elevation={0} sx={{ p: { xs: 3, sm: 5 }, maxWidth: 460, width: '100%' }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Create your account
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Register as a patient. Staff accounts are created by your organization.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

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
              label="Email"
              type="email"
              fullWidth
              autoComplete="email"
              {...register('email')}
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
            />
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
              {isLoading ? 'Creating account…' : 'Create account'}
            </Button>
          </Stack>
        </form>

        <Typography variant="body2" color="text.secondary" textAlign="center">
          Already have an account?{' '}
          <Link component={RouterLink} to="/login">
            Sign in
          </Link>
        </Typography>
      </Stack>
    </Paper>
  );
}
