import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AddIcon from '@mui/icons-material/Add';
import GroupsIcon from '@mui/icons-material/Groups';
import RepeatIcon from '@mui/icons-material/Repeat';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import type { NavItem } from '../../types/navigation';

export const menuItems: NavItem[] = [
  { label: 'Appointments', path: '/appointments', icon: EventAvailableIcon, roles: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'] },
  { label: 'Calendar', path: '/appointments/calendar', icon: CalendarMonthIcon, roles: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'] },
  { label: 'Book Appointment', path: '/appointments/new', icon: AddIcon, roles: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'] },
  { label: 'Waiting Room', path: '/appointments/waiting-room', icon: GroupsIcon, roles: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'] },
  { label: 'Recurring Rules', path: '/appointments/recurring', icon: RepeatIcon, roles: ['ADMIN', 'RECEPTIONIST'] },
  { label: 'Rooms', path: '/appointments/rooms', icon: MeetingRoomIcon, roles: ['ADMIN', 'RECEPTIONIST'] },
];
