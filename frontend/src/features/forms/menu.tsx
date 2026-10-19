import FactCheckIcon from '@mui/icons-material/FactCheck';
import AssignmentIcon from '@mui/icons-material/Assignment';
import type { NavItem } from '../../types/navigation';

export const menuItems: NavItem[] = [
  { label: 'Form Templates', path: '/forms/templates', icon: AssignmentIcon, roles: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'] },
  { label: 'Submissions', path: '/forms/submissions', icon: FactCheckIcon, roles: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'] },
];

export default { menuItems };
