import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

export const scope: 'staff' | 'portal' = 'staff';

const MedicationList = lazy(() => import('./pages/MedicationList'));
const MedicationForm = lazy(() => import('./pages/MedicationForm'));
const BatchList = lazy(() => import('./pages/BatchList'));
const SupplierList = lazy(() => import('./pages/SupplierList'));
const DispensePage = lazy(() => import('./pages/DispensePage'));
const InteractionsAdmin = lazy(() => import('./pages/InteractionsAdmin'));
const TransfersList = lazy(() => import('./pages/TransfersList'));
const ReturnsList = lazy(() => import('./pages/ReturnsList'));
const StockAlerts = lazy(() => import('./pages/StockAlerts'));

export const routes: RouteObject[] = [
  { path: '/pharmacy/medications', element: <MedicationList /> },
  { path: '/pharmacy/medications/new', element: <MedicationForm /> },
  { path: '/pharmacy/medications/:id/edit', element: <MedicationForm /> },
  { path: '/pharmacy/batches', element: <BatchList /> },
  { path: '/pharmacy/suppliers', element: <SupplierList /> },
  { path: '/pharmacy/dispense', element: <DispensePage /> },
  { path: '/pharmacy/interactions', element: <InteractionsAdmin /> },
  { path: '/pharmacy/transfers', element: <TransfersList /> },
  { path: '/pharmacy/returns', element: <ReturnsList /> },
  { path: '/pharmacy/alerts', element: <StockAlerts /> },
];
