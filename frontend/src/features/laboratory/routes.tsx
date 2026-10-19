import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

export const scope: 'staff' | 'portal' = 'staff';

const LabOrdersList = lazy(() => import('./pages/LabOrdersList'));
const LabOrderForm = lazy(() => import('./pages/LabOrderForm'));
const LabOrderDetail = lazy(() => import('./pages/LabOrderDetail'));
const WorkQueue = lazy(() => import('./pages/WorkQueue'));
const ResultEntry = lazy(() => import('./pages/ResultEntry'));
const ResultsReview = lazy(() => import('./pages/ResultsReview'));
const LabTestsAdmin = lazy(() => import('./pages/LabTestsAdmin'));
const LabReports = lazy(() => import('./pages/LabReports'));

export const routes: RouteObject[] = [
  { path: '/laboratory/orders', element: <LabOrdersList /> },
  { path: '/laboratory/orders/new', element: <LabOrderForm /> },
  { path: '/laboratory/orders/:id', element: <LabOrderDetail /> },
  { path: '/laboratory/workqueue', element: <WorkQueue /> },
  { path: '/laboratory/results/new', element: <ResultEntry /> },
  { path: '/laboratory/results/:id', element: <ResultEntry /> },
  { path: '/laboratory/results', element: <ResultsReview /> },
  { path: '/laboratory/tests', element: <LabTestsAdmin /> },
  { path: '/laboratory/reports', element: <LabReports /> },
];
