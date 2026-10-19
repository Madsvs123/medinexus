import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

export const scope: 'staff' | 'portal' = 'staff';

const EncounterList = lazy(() => import('./pages/EncounterList'));
const EncounterWorkspace = lazy(() => import('./pages/EncounterWorkspace'));

export const routes: RouteObject[] = [
  { path: '/encounters', element: <EncounterList /> },
  { path: '/encounters/:id', element: <EncounterWorkspace /> },
];
