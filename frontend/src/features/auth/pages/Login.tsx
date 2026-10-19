import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useLoginMutation } from '../api';
import { useAppDispatch } from '@/app/hooks';
import { setCredentials } from '../authSlice';
import { storeTokens } from '@/app/api/baseApi';
import { apiErrorMessage } from '@/types/api';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [login, { isLoading }] = useLoginMutation();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginForm) => {
    setError(null);
    try {
      const result = await login(values).unwrap();
      storeTokens(result.access, result.refresh);
      dispatch(
        setCredentials({
          accessToken: result.access,
          refreshToken: result.refresh,
          user: result.user,
        }),
      );
      enqueueSnackbar(`Welcome back, ${result.user.first_name}!`, { variant: 'success' });
      navigate(result.user.role === 'PATIENT' ? '/portal' : '/', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, 'Invalid email or password.'));
    }
  };

  const fillDemo = (email: string) => {
    setValue('email', email);
    setValue('password', 'demo1234');
  };

  return (
    <Paper elevation={0} sx={{ p: { xs: 3, sm: 5 }, maxWidth: 440, width: '100%' }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Sign in to MediNexus
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hospital management, all in one place.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack spacing={2.5}>
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              fullWidth
              {...register('email')}
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
            />
            <TextField
              label="Password"
              type="password"
              autoComplete="current-password"
              fullWidth
              {...register('password')}
              error={Boolean(errors.password)}
              helperText={errors.password?.message}
            />
            <Button type="submit" variant="contained" size="large" fullWidth disabled={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign in'}
            </Button>
          </Stack>
        </form>

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Link href="/forgot-password" variant="body2">
            Forgot password?
          </Link>
          <Link href="/register" variant="body2">
            Create an account
          </Link>
        </Stack>

        <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Demo accounts (password: demo1234)
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {[
              ['admin@medinexus.dev', 'Admin'],
              ['doctor@medinexus.dev', 'Doctor'],
              ['receptionist@medinexus.dev', 'Receptionist'],
              ['patient@medinexus.dev', 'Patient'],
            ].map(([email, label]) => (
              <Button
                key={email}
                size="small"
                variant="outlined"
                onClick={() => fillDemo(email)}
              >
                {label}
              </Button>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}
