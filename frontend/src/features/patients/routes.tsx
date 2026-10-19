import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

export const scope: 'staff' | 'portal' = 'staff';

const PatientList = lazy(() => import('./pages/PatientList'));
const PatientForm = lazy(() => import('./pages/PatientForm'));
const PatientDetail = lazy(() => import('./pages/PatientDetail'));

export const routes: RouteObject[] = [
  { path: '/patients', element: <PatientList /> },
  { path: '/patients/new', element: <PatientForm /> },
  { path: '/patients/:id', element: <PatientDetail /> },
  { path: '/patients/:id/edit', element: <PatientForm /> },
];
