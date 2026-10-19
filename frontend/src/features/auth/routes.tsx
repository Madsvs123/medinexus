import type { RouteObject } from 'react-router-dom';
import { lazy } from 'react';
import { PublicOnly } from './guards';
import AuthLayout from '@/components/layout/AuthLayout';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AcceptInvite = lazy(() => import('./pages/AcceptInvite'));

export const scope = 'public';

export const routes: RouteObject[] = [
  {
    element: <AuthLayout />,
    children: [
      {
        element: <PublicOnly />,
        children: [
          { path: '/login', element: <Login /> },
          { path: '/register', element: <Register /> },
          { path: '/forgot-password', element: <ForgotPassword /> },
        ],
      },
      { path: '/verify-email', element: <VerifyEmail /> },
      { path: '/reset-password', element: <ResetPassword /> },
      { path: '/accept-invite', element: <AcceptInvite /> },
    ],
  },
];
