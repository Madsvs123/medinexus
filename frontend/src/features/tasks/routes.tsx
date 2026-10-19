import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

export const scope: 'staff' | 'portal' = 'staff';

const TaskList = lazy(() => import('./pages/TaskList'));
const TaskForm = lazy(() => import('./pages/TaskForm'));

export const routes: RouteObject[] = [
  { path: '/tasks', element: <TaskList /> },
  { path: '/tasks/new', element: <TaskForm /> },
  { path: '/tasks/:id/edit', element: <TaskForm /> },
];
