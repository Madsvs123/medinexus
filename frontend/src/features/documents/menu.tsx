import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import type { NavItem } from '../../types/navigation';

export const menuItems: NavItem[] = [
  { label: 'Documents', path: '/documents', icon: FolderOpenIcon, roles: ['ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGIST', 'RECEPTIONIST', 'BILLING'] },
];

export default { menuItems };
