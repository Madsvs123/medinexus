import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

export const scope: 'staff' | 'portal' = 'staff';

const AuditLogList = lazy(() => import('./pages/AuditLogList'));

export const routes: RouteObject[] = [{ path: '/audit', element: <AuditLogList /> }];
