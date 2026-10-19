import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

export const scope: 'staff' | 'portal' = 'staff';

const AdmissionList = lazy(() => import('./pages/AdmissionList'));
const AdmissionForm = lazy(() => import('./pages/AdmissionForm'));
const AdmissionDetail = lazy(() => import('./pages/AdmissionDetail'));
const WardBoard = lazy(() => import('./pages/WardBoard'));
const BedAdmin = lazy(() => import('./pages/BedAdmin'));

export const routes: RouteObject[] = [
  { path: '/inpatient', element: <AdmissionList /> },
  { path: '/inpatient/admissions', element: <AdmissionList /> },
  { path: '/inpatient/admissions/new', element: <AdmissionForm /> },
  { path: '/inpatient/admissions/:id', element: <AdmissionDetail /> },
  { path: '/inpatient/ward-board', element: <WardBoard /> },
  { path: '/inpatient/beds', element: <BedAdmin /> },
];
