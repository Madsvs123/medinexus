import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

export const scope: 'staff' | 'portal' = 'staff';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));

export const routes: RouteObject[] = [
  { path: '/', element: <DashboardPage /> },
];
