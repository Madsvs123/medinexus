import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import type { Role } from '@/types/api';

export function RequireAuth({ children }: { children?: ReactNode }) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children ? <>{children}</> : <Outlet />;
}

export function RequireRole({ roles, children }: { roles: Role[]; children?: ReactNode }) {
  const user = useAppSelector((state) => state.auth.user);

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }
  return children ? <>{children}</> : <Outlet />;
}

export function RequireStaff({ children }: { children?: ReactNode }) {
  const user = useAppSelector((state) => state.auth.user);
  if (!user || user.role === 'PATIENT') {
    return <Navigate to="/403" replace />;
  }
  return children ? <>{children}</> : <Outlet />;
}

export function RequirePatient({ children }: { children?: ReactNode }) {
  const user = useAppSelector((state) => state.auth.user);
  if (!user || user.role !== 'PATIENT') {
    return <Navigate to="/403" replace />;
  }
  return children ? <>{children}</> : <Outlet />;
}

export function PublicOnly({ children }: { children?: ReactNode }) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);

  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'PATIENT' ? '/portal' : '/'} replace />;
  }
  return children ? <>{children}</> : <Outlet />;
}
