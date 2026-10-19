import RadiologistIcon from '@mui/icons-material/MedicalInformation';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import type { NavItem } from '../../types/navigation';

export const menuItems: NavItem[] = [
  { label: 'Radiology Orders', path: '/radiology/orders', icon: RadiologistIcon, roles: ['ADMIN', 'DOCTOR', 'RADIOLOGIST', 'NURSE'] },
  { label: 'New Radiology Order', path: '/radiology/orders/new', icon: AddIcon, roles: ['ADMIN', 'DOCTOR', 'RADIOLOGIST', 'NURSE'] },
  { label: 'Reports', path: '/radiology/reports', icon: DescriptionIcon, roles: ['ADMIN', 'RADIOLOGIST', 'DOCTOR'] },
];
