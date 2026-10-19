import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

export const scope: 'staff' | 'portal' = 'staff';

const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'));
const GeneratedReports = lazy(() => import('./pages/GeneratedReports'));

export const routes: RouteObject[] = [
  { path: '/reports/analytics', element: <AnalyticsDashboard /> },
  { path: '/reports/generated', element: <GeneratedReports /> },
];
