import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

export const scope: 'staff' | 'portal' = 'staff';

const TemplateList = lazy(() => import('./pages/TemplateList'));
const TemplateForm = lazy(() => import('./pages/TemplateForm'));
const TemplateDetail = lazy(() => import('./pages/TemplateDetail'));
const SubmissionList = lazy(() => import('./pages/SubmissionList'));
const SubmissionForm = lazy(() => import('./pages/SubmissionForm'));
const SubmissionDetail = lazy(() => import('./pages/SubmissionDetail'));

export const routes: RouteObject[] = [
  { path: '/forms/templates', element: <TemplateList /> },
  { path: '/forms/templates/new', element: <TemplateForm /> },
  { path: '/forms/templates/:id', element: <TemplateDetail /> },
  { path: '/forms/templates/:id/edit', element: <TemplateForm /> },
  { path: '/forms/submissions', element: <SubmissionList /> },
  { path: '/forms/submissions/new', element: <SubmissionForm /> },
  { path: '/forms/submissions/:id', element: <SubmissionDetail /> },
];
