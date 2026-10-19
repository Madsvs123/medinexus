import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

export const scope: 'staff' | 'portal' = 'staff';

const ThreadList = lazy(() => import('./pages/ThreadList'));
const ChatWindow = lazy(() => import('./pages/ChatWindow'));
const NewThreadForm = lazy(() => import('./pages/NewThreadForm'));

export const routes: RouteObject[] = [
  { path: '/messages', element: <ThreadList /> },
  { path: '/messages/new', element: <NewThreadForm /> },
  { path: '/messages/threads/:id', element: <ChatWindow /> },
];
