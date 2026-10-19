import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import type { NavItem } from '../../types/navigation';

export const menuItems: NavItem[] = [
  {
    label: 'Patients',
    path: '/patients',
    icon: PeopleIcon,
    roles: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGIST'],
  },
  {
    label: 'New Patient',
    path: '/patients/new',
    icon: PersonAddIcon,
    roles: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'],
  },
];
