import NotesIcon from '@mui/icons-material/Notes';
import AddIcon from '@mui/icons-material/Add';
import type { NavItem } from '../../types/navigation';

export const menuItems: NavItem[] = [
  { label: 'Encounters', path: '/encounters', icon: NotesIcon, roles: ['ADMIN', 'DOCTOR', 'NURSE'] },
  { label: 'New Encounter', path: '/encounters', icon: AddIcon, roles: ['ADMIN', 'DOCTOR'] },
];
