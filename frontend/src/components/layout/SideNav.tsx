import { useMemo } from 'react';
import {
  Avatar,
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  MedicalServices as MedicalIcon,
} from '@mui/icons-material';
import { NavLink } from 'react-router-dom';
import type { NavItem } from '@/types/navigation';
import { isNavItemVisible } from '@/types/navigation';
import { useAppSelector } from '@/app/hooks';
import { initialsOf } from '@/utils/format';

// Lazy icon registry: feature agents register icons by name in their menu.tsx.
// Icons not registered fall back to a generic medical icon.
const ICON_REGISTRY: Record<string, React.ComponentType> = {
  dashboard: DashboardIcon,
  medical: MedicalIcon,
};

export function registerNavIcon(name: string, component: React.ComponentType) {
  ICON_REGISTRY[name] = component;
}

const MODULES = import.meta.glob<{ menuItems?: NavItem[] }>('../features/*/menu.tsx', {
  eager: true,
  import: 'default',
});

interface SideNavProps {
  width: number;
  onNavigate?: () => void;
}

export default function SideNav({ width, onNavigate }: SideNavProps) {
  const user = useAppSelector((state) => state.auth.user);

  const items = useMemo(() => {
    const all: NavItem[] = [];
    for (const modulePath of Object.keys(MODULES)) {
      const mod = MODULES[modulePath];
      if (mod?.menuItems && Array.isArray(mod.menuItems)) {
        all.push(...mod.menuItems);
      }
    }
    // Dedupe by path, keep first occurrence.
    const seen = new Set<string>();
    return all.filter((item) => {
      if (seen.has(item.path)) return false;
      seen.add(item.path);
      return isNavItemVisible(item, user?.role);
    });
  }, [user?.role]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Avatar
          sx={{ bgcolor: 'primary.main', width: 38, height: 38 }}
          variant="rounded"
        >
          <MedicalIcon />
        </Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
            MediNexus
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Hospital Management
          </Typography>
        </Box>
      </Stack>

      <List component="nav" sx={{ flex: 1, overflowY: 'auto', px: 1, py: 1 }} aria-label="Main navigation">
        {items.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
            Loading navigation…
          </Typography>
        )}
        {items.map((item) => {
          const Icon =
            typeof item.icon === 'string'
              ? ICON_REGISTRY[item.icon] ?? MedicalIcon
              : item.icon ?? MedicalIcon;
          return (
            <Tooltip key={item.path} title={item.label} placement="right" arrow>
              <ListItemButton
                component={NavLink}
                to={item.path}
                end={item.path === '/'}
                onClick={onNavigate}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.25,
                  '&.active': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '& .MuiListItemIcon-root': { color: 'inherit' },
                    '&:hover': { bgcolor: 'primary.main' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                />
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 30, height: 30, bgcolor: 'secondary.main', fontSize: 13 }}>
            {initialsOf(user?.first_name, user?.last_name)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap fontWeight={600}>
              {user ? `${user.first_name} ${user.last_name}` : 'Guest'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user?.role.replace(/_/g, ' ') ?? ''}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
