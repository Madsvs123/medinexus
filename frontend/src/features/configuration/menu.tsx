import SettingsIcon from '@mui/icons-material/Settings';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import type { NavItem } from '../../types/navigation';

export const menuItems: NavItem[] = [
  { label: 'Settings', path: '/configuration', icon: SettingsIcon, roles: ['ADMIN'] },
  { label: 'Import Tools', path: '/configuration/imports', icon: UploadFileIcon, roles: ['ADMIN'] },
];

export default { menuItems };
