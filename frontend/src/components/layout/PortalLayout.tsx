import { useMemo } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  EventNote as AppointmentIcon,
  Medication as PrescriptionIcon,
  Science as ResultsIcon,
  Receipt as InvoiceIcon,
  FolderShared as DocumentsIcon,
  Chat as MessagesIcon,
  Notifications as NotificationsIcon,
  MedicalServices as MedicalIcon,
} from '@mui/icons-material';
import { NavLink, Outlet } from 'react-router-dom';
import NotificationBell from '@/features/notifications/NotificationBell';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';
import { initialsOf } from '@/utils/format';

const DRAWER_WIDTH = 260;

const PORTAL_NAV = [
  { label: 'Overview', path: '/portal', icon: DashboardIcon, end: true },
  { label: 'Appointments', path: '/portal/appointments', icon: AppointmentIcon },
  { label: 'Prescriptions', path: '/portal/prescriptions', icon: PrescriptionIcon },
  { label: 'Results', path: '/portal/results', icon: ResultsIcon },
  { label: 'Invoices', path: '/portal/invoices', icon: InvoiceIcon },
  { label: 'Documents', path: '/portal/documents', icon: DocumentsIcon },
  { label: 'Messages', path: '/portal/messages', icon: MessagesIcon },
  { label: 'Notifications', path: '/portal/notifications', icon: NotificationsIcon },
];

export default function PortalLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isDark = theme.palette.mode === 'dark';

  const nav = useMemo(() => PORTAL_NAV, []);

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2.5, py: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Avatar sx={{ bgcolor: 'primary.main' }} variant="rounded">
          <MedicalIcon />
        </Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
            MediNexus
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Patient Portal
          </Typography>
        </Box>
      </Stack>
      <List component="nav" sx={{ flex: 1, overflowY: 'auto', px: 1, py: 1 }} aria-label="Portal navigation">
        {nav.map((item) => (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            end={item.end}
            sx={{
              borderRadius: 1.5,
              mb: 0.25,
              '&.active': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '& .MuiListItemIcon-root': { color: 'inherit' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
              <item.icon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={item.label} primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: isDark ? '#0F172A' : 'background.paper',
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <Typography variant="h6" fontWeight={700} sx={{ display: { xs: 'none', sm: 'block' } }}>
            Patient Portal
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <NotificationBell />
          <ThemeToggle />
          <UserMenu />
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={!isMobile}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: isDark ? '#0F172A' : 'background.paper',
          },
        }}
      >
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
        <Toolbar />
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
