import ForumIcon from '@mui/icons-material/Forum';
import type { NavItem } from '../../types/navigation';

export const menuItems: NavItem[] = [
  { label: 'Messages', path: '/messages', icon: ForumIcon, roles: ['ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGIST', 'RECEPTIONIST', 'BILLING'] },
];

export default { menuItems };
