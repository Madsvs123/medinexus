import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ScienceIcon from '@mui/icons-material/Science';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { PageHeader, StatCard, EmptyState } from '../../../components/ui';
import { formatCurrency, formatDateTime } from '../../../utils/format';
import { useGetPortalSummaryQuery } from '../api';
import { doctorName, isLabResult } from '../types';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../app/store';

export default function PortalSummary() {
  const user = useSelector((state: RootState) => state.auth.user);
  const { data, isLoading, error } = useGetPortalSummaryQuery();
  const name = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();

  return (
    <Box>
      <PageHeader title={`Welcome${name ? `, ${name}` : ''}`} subtitle="Your health at a glance" />
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Chip label="Failed to load your summary." color="error" sx={{ mb: 2 }} />
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Unread notifications" value={data?.unread_notifications ?? '—'} icon={<NotificationsIcon />} color="primary" loading={isLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Outstanding balance" value={formatCurrency(Number(data?.outstanding_balance ?? 0))} icon={<AccountBalanceWalletIcon />} color="error" loading={isLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Upcoming appointments" value={data?.upcoming_appointments?.length ?? '—'} icon={<EventIcon />} color="success" loading={isLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Recent results" value={data?.recent_results?.length ?? '—'} icon={<ScienceIcon />} color="secondary" loading={isLoading} />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>Next appointment</Typography>
              {data?.next_appointment ? (
                <List dense disablePadding>
                  <ListItem disableGutters>
                    <ListItemText
                      primary={formatDateTime(data.next_appointment.start)}
                      secondary={`Dr. ${doctorName(data.next_appointment.doctor)} • ${data.next_appointment.type} • ${data.next_appointment.status}`}
                    />
                  </ListItem>
                </List>
              ) : (
                <EmptyState icon={<EventIcon />} title="No upcoming appointment" hint="Book one from the appointments page." />
              )}
              <Button component={RouterLink} to="/portal/appointments" variant="outlined" size="small" sx={{ mt: 1 }}>
                Manage appointments
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent results</Typography>
              {data?.recent_results?.length ? (
                <List dense disablePadding>
                  {data.recent_results.slice(0, 5).map((r, i) => (
                    <ListItem key={i} disableGutters divider={i < Math.min(data.recent_results.length, 5) - 1}>
                      <ListItemText
                        primary={isLabResult(r) && r.test && typeof r.test === 'object' ? r.test.name : isLabResult(r) ? 'Lab result' : `Radiology — ${r.modality ?? ''} ${r.body_part ?? ''}`}
                        secondary={
                          isLabResult(r)
                            ? `${r.value} ${r.unit} (${r.flag})`
                            : r.impression || r.findings || 'Final report'
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <EmptyState title="No results yet" hint="Results will appear once finalized." />
              )}
              <Button component={RouterLink} to="/portal/results" variant="outlined" size="small" sx={{ mt: 1 }}>
                View all results
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>Quick links</Typography>
        <Grid container spacing={1}>
          {[
            { label: 'Appointments', to: '/portal/appointments', icon: <EventIcon /> },
            { label: 'Prescriptions', to: '/portal/prescriptions', icon: <ScienceIcon /> },
            { label: 'Results', to: '/portal/results', icon: <ScienceIcon /> },
            { label: 'Invoices', to: '/portal/invoices', icon: <AccountBalanceWalletIcon /> },
            { label: 'Documents', to: '/portal/documents', icon: <AccountBalanceWalletIcon /> },
            { label: 'Messages', to: '/portal/messages', icon: <NotificationsIcon /> },
            { label: 'Notifications', to: '/portal/notifications', icon: <NotificationsIcon /> },
          ].map((l) => (
            <Grid item key={l.to}>
              <Button component={RouterLink} to={l.to} variant="outlined" startIcon={l.icon} size="small">
                {l.label}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
