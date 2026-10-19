import type { ComponentType } from 'react';
import type { Role } from './api';

export interface NavItem {
  label: string;
  path: string;
  /** Either a registered icon name (see SideNav's icon registry) or an MUI icon component. */
  icon?: string | ComponentType<{ fontSize?: 'small' | 'medium' | 'large' }>;
  roles?: Role[];
}

export const isNavItemVisible = (item: NavItem, role: Role | null | undefined): boolean => {
  if (!item.roles || item.roles.length === 0) return true;
  if (!role) return false;
  return item.roles.includes(role);
};
