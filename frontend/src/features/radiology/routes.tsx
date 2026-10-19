import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

export const scope: 'staff' | 'portal' = 'staff';

const RadiologyOrdersList = lazy(() => import('./pages/RadiologyOrdersList'));
const RadiologyOrderForm = lazy(() => import('./pages/RadiologyOrderForm'));
const RadiologyOrderDetail = lazy(() => import('./pages/RadiologyOrderDetail'));
const ReportEntry = lazy(() => import('./pages/ReportEntry'));
const ReportsList = lazy(() => import('./pages/ReportsList'));

export const routes: RouteObject[] = [
  { path: '/radiology/orders', element: <RadiologyOrdersList /> },
  { path: '/radiology/orders/new', element: <RadiologyOrderForm /> },
  { path: '/radiology/orders/:id', element: <RadiologyOrderDetail /> },
  { path: '/radiology/reports', element: <ReportsList /> },
  { path: '/radiology/reports/new', element: <ReportEntry /> },
  { path: '/radiology/reports/:id', element: <ReportEntry /> },
];
