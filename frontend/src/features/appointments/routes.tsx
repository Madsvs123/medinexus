import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

export const scope: 'staff' | 'portal' = 'staff';

const AppointmentCalendar = lazy(() => import('./pages/AppointmentCalendar'));
const BookingForm = lazy(() => import('./pages/BookingForm'));
const AppointmentList = lazy(() => import('./pages/AppointmentList'));
const WaitingRoom = lazy(() => import('./pages/WaitingRoom'));
const RecurringRules = lazy(() => import('./pages/RecurringRules'));
const RoomsAdmin = lazy(() => import('./pages/RoomsAdmin'));

export const routes: RouteObject[] = [
  { path: '/appointments', element: <AppointmentList /> },
  { path: '/appointments/calendar', element: <AppointmentCalendar /> },
  { path: '/appointments/new', element: <BookingForm /> },
  { path: '/appointments/:id/edit', element: <BookingForm /> },
  { path: '/appointments/waiting-room', element: <WaitingRoom /> },
  { path: '/appointments/recurring', element: <RecurringRules /> },
  { path: '/appointments/rooms', element: <RoomsAdmin /> },
];
