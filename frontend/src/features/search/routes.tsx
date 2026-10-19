import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

export const scope: 'staff' | 'portal' = 'staff';

const GlobalSearch = lazy(() => import('./pages/GlobalSearch'));

export const routes: RouteObject[] = [{ path: '/search', element: <GlobalSearch /> }];
