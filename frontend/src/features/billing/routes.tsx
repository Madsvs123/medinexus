import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

export const scope: 'staff' | 'portal' = 'staff';

const InvoiceList = lazy(() => import('./pages/InvoiceList'));
const InvoiceForm = lazy(() => import('./pages/InvoiceForm'));
const InvoiceDetail = lazy(() => import('./pages/InvoiceDetail'));
const PaymentList = lazy(() => import('./pages/PaymentList'));
const RefundList = lazy(() => import('./pages/RefundList'));
const DepositList = lazy(() => import('./pages/DepositList'));
const InsurancePlansAdmin = lazy(() => import('./pages/InsurancePlansAdmin'));
const PatientInsuranceList = lazy(() => import('./pages/PatientInsuranceList'));
const ClaimsList = lazy(() => import('./pages/ClaimsList'));
const BillingStats = lazy(() => import('./pages/BillingStats'));

export const routes: RouteObject[] = [
  { path: '/billing/invoices', element: <InvoiceList /> },
  { path: '/billing/invoices/new', element: <InvoiceForm /> },
  { path: '/billing/invoices/:id', element: <InvoiceDetail /> },
  { path: '/billing/invoices/:id/edit', element: <InvoiceForm /> },
  { path: '/billing/payments', element: <PaymentList /> },
  { path: '/billing/refunds', element: <RefundList /> },
  { path: '/billing/deposits', element: <DepositList /> },
  { path: '/billing/insurance-plans', element: <InsurancePlansAdmin /> },
  { path: '/billing/patient-insurance', element: <PatientInsuranceList /> },
  { path: '/billing/claims', element: <ClaimsList /> },
  { path: '/billing/stats', element: <BillingStats /> },
];
