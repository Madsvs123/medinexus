import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

export const scope: 'staff' | 'portal' = 'staff';

const DocumentList = lazy(() => import('./pages/DocumentList'));

export const routes: RouteObject[] = [{ path: '/documents', element: <DocumentList /> }];
