import HistoryIcon from '@mui/icons-material/History';
import type { NavItem } from '../../types/navigation';

export const menuItems: NavItem[] = [
  { label: 'Audit Log', path: '/audit', icon: HistoryIcon, roles: ['ADMIN'] },
];

export default { menuItems };
