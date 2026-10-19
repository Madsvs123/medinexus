import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

export const scope: 'portal' | 'staff' = 'portal';

const PortalSummary = lazy(() => import('./pages/PortalSummary'));
const PortalAppointments = lazy(() => import('./pages/PortalAppointments'));
const PortalPrescriptions = lazy(() => import('./pages/PortalPrescriptions'));
const PortalResults = lazy(() => import('./pages/PortalResults'));
const PortalInvoices = lazy(() => import('./pages/PortalInvoices'));
const PortalDocuments = lazy(() => import('./pages/PortalDocuments'));
const PortalMessages = lazy(() => import('./pages/PortalMessages'));
const PortalNotifications = lazy(() => import('./pages/PortalNotifications'));

export const routes: RouteObject[] = [
  { path: '/portal', element: <PortalSummary /> },
  { path: '/portal/appointments', element: <PortalAppointments /> },
  { path: '/portal/prescriptions', element: <PortalPrescriptions /> },
  { path: '/portal/results', element: <PortalResults /> },
  { path: '/portal/invoices', element: <PortalInvoices /> },
  { path: '/portal/documents', element: <PortalDocuments /> },
  { path: '/portal/messages', element: <PortalMessages /> },
  { path: '/portal/notifications', element: <PortalNotifications /> },
];
