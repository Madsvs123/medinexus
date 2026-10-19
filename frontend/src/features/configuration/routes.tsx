import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

export const scope: 'staff' | 'portal' = 'staff';

const SettingsForm = lazy(() => import('./pages/SettingsForm'));
const ImportTools = lazy(() => import('./pages/ImportTools'));

export const routes: RouteObject[] = [
  { path: '/configuration', element: <SettingsForm /> },
  { path: '/configuration/imports', element: <ImportTools /> },
];
