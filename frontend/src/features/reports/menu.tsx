import InsightsIcon from '@mui/icons-material/Insights';
import SummarizeIcon from '@mui/icons-material/Summarize';
import type { NavItem } from '../../types/navigation';

export const menuItems: NavItem[] = [
  { label: 'Analytics', path: '/reports/analytics', icon: InsightsIcon, roles: ['ADMIN', 'DOCTOR', 'BILLING', 'RECEPTIONIST'] },
  { label: 'Generated Reports', path: '/reports/generated', icon: SummarizeIcon, roles: ['ADMIN', 'BILLING'] },
];

export default { menuItems };
