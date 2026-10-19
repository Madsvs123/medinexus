import ScienceIcon from '@mui/icons-material/Science';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import BiotechIcon from '@mui/icons-material/Biotech';
import DescriptionIcon from '@mui/icons-material/Description';
import type { NavItem } from '../../types/navigation';

export const menuItems: NavItem[] = [
  { label: 'Lab Orders', path: '/laboratory/orders', icon: ScienceIcon, roles: ['ADMIN', 'DOCTOR', 'LAB_TECH', 'NURSE'] },
  { label: 'New Lab Order', path: '/laboratory/orders/new', icon: AddIcon, roles: ['ADMIN', 'DOCTOR', 'LAB_TECH', 'NURSE'] },
  { label: 'Work Queue', path: '/laboratory/workqueue', icon: AssignmentIcon, roles: ['ADMIN', 'LAB_TECH'] },
  { label: 'Results Review', path: '/laboratory/results', icon: FactCheckIcon, roles: ['ADMIN', 'LAB_TECH', 'DOCTOR'] },
  { label: 'Tests Catalog', path: '/laboratory/tests', icon: BiotechIcon, roles: ['ADMIN', 'LAB_TECH'] },
  { label: 'Reports', path: '/laboratory/reports', icon: DescriptionIcon, roles: ['ADMIN', 'LAB_TECH', 'DOCTOR'] },
];
