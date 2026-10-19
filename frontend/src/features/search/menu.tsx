import SearchIcon from '@mui/icons-material/Search';
import type { NavItem } from '../../types/navigation';

export const menuItems: NavItem[] = [
  { label: 'Search', path: '/search', icon: SearchIcon, roles: ['ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGIST', 'RECEPTIONIST', 'BILLING'] },
];

export default { menuItems };
