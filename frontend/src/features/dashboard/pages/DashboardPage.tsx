import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import {
  Box,
  Grid,
  Typography,
  Alert,
  Link,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import ScienceIcon from '@mui/icons-material/Science';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import DescriptionIcon from '@mui/icons-material/Description';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Link as RouterLink } from 'react-router-dom';
import type { RootState } from '../../../app/store';
import { StatCard, ChartCard, DataTable, StatusChip, EmptyState, PageHeader } from '../../../components/ui';
import { formatCurrency, formatDate } from '../../../utils/format';
import {
  useGetAdminDashboardQuery,
  useGetDoctorDashboardQuery,
  useGetReceptionistDashboardQuery,
  useGetDashboardAppointmentsAnalyticsQuery,
  useGetDashboardRevenueAnalyticsQuery,
} from '../api';
import type { DoctorDashboard } from '../types';
import { patientLabel } from '../types';

const PIE_COLORS = ['#0B6E4F', '#2563EB', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#64748B', '#F97316'];

interface ChartDatum {
  name: string;
  value: number;
}

function toMoney(v: number | string | undefined | null): number {
  return Number(v ?? 0);
}

export default function DashboardPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const role = user?.role ?? 'ADMIN';
  if (role === 'ADMIN') return <AdminDashboardView />;
  if (role === 'DOCTOR') return <DoctorDashboardView />;
  if (role === 'RECEPTIONIST') return <ReceptionistDashboardView />;
  return <GenericDashboardView />;
}

function useDefaultRange() {
  return useMemo(
    () => ({
      from: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
      to: dayjs().format('YYYY-MM-DD'),
    }),
    [],
  );
}

function AdminDashboardView() {
  const { data, isLoading, error } = useGetAdminDashboardQuery();
  const range = useDefaultRange();
  const { data: appts } = useGetDashboardAppointmentsAnalyticsQuery(range);
  const { data: rev } = useGetDashboardRevenueAnalyticsQuery(range);

  const byStatusPie: ChartDatum[] = useMemo(
    () => Object.entries(appts?.by_status ?? {}).map(([name, value]) => ({ name, value })),
    [appts],
  );
  const revenueSeries = useMemo(
    () => (rev?.by_day ?? []).map((d) => ({ name: formatDate(d.date), total: toMoney(d.total) })),
    [rev],
  );

  if (error) return <ErrorBanner error={error} />;

  return (
    <Box>
      <PageHeader title="Dashboard" subtitle="Organization overview" />
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard title="Revenue today" value={formatCurrency(toMoney(data?.revenue_today))} icon={<AttachMoneyIcon />} color="success" loading={isLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard title="Appointments today" value={data?.appointments_today ?? '—'} icon={<EventAvailableIcon />} color="primary" loading={isLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard title="Active admissions" value={data?.active_admissions ?? '—'} icon={<LocalHospitalIcon />} color="secondary" loading={isLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard title="Pending lab results" value={data?.pending_lab_results ?? '—'} icon={<ScienceIcon />} color="warning" loading={isLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard title="Occupancy" value={data ? `${Math.round(toMoney(data.occupancy))}%` : '—'} icon={<MeetingRoomIcon />} color="info" loading={isLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatCard title="Claims pending" value={data?.claims_pending ?? '—'} icon={<DescriptionIcon />} color="error" loading={isLoading} />
        </Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <ChartCard title="Revenue (last 30 days)" subtitle={`${range.from} → ${range.to}`}>
            <RevenueLineChart data={revenueSeries} />
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={5}>
          <ChartCard title="Appointments by status" subtitle="Last 30 days">
            <StatusPieChart data={byStatusPie} />
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}

function DoctorDashboardView() {
  const { data, isLoading, error } = useGetDoctorDashboardQuery();
  const user = useSelector((state: RootState) => state.auth.user);
  const me = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();

  const columns = useMemo(
    () => [
      { key: 'time', label: 'Time', render: (r: DoctorDashboard['today_appointments'][number]) => (
        <Box>
          <Typography variant="body2">{dayjs(r.start).format('HH:mm')}</Typography>
          <Typography variant="caption" color="text.secondary">{formatDate(r.start)}</Typography>
        </Box>
      ) },
      { key: 'patient', label: 'Patient', render: (r: DoctorDashboard['today_appointments'][number]) => patientLabel(r.patient) },
      { key: 'type', label: 'Type', render: (r: DoctorDashboard['today_appointments'][number]) => <StatusChip status={r.type} /> },
      { key: 'status', label: 'Status', render: (r: DoctorDashboard['today_appointments'][number]) => <StatusChip status={r.status} /> },
    ],
    [],
  );

  if (error) return <ErrorBanner error={error} />;

  return (
    <Box>
      <PageHeader title={`Welcome, ${me || 'Doctor'}`} subtitle="Your clinical day at a glance" />
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>Today's appointments ({data?.today_appointments.length ?? 0})</Typography>
              <DataTable
                columns={columns}
                rows={data?.today_appointments ?? []}
                loading={isLoading}
                rowKey={(r) => String(r.id)}
              />
              {!isLoading && (data?.today_appointments.length ?? 0) === 0 && (
                <EmptyState icon={<EventAvailableIcon />} title="No appointments today" hint="You're all caught up." />
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <InfoCard
                title={`Open encounters (${data?.open_encounters.length ?? 0})`}
                items={(data?.open_encounters ?? []).map((e) => ({
                  primary: patientLabel(e.patient),
                  secondary: `${e.type} • ${e.chief_complaint || 'No complaint noted'}`,
                  to: `/encounters/${e.id}`,
                }))}
                icon={<LocalHospitalIcon />}
                loading={isLoading}
              />
            </Grid>
            <Grid item xs={12}>
              <InfoCard
                title={`Critical results (${data?.critical_results.length ?? 0})`}
                items={(data?.critical_results ?? []).map((r) => ({
                  primary: `${r.test && typeof r.test === 'object' ? r.test.name : 'Lab result'} — ${r.value} ${r.unit ?? ''}`,
                  secondary: `${patientLabel(r.patient)} • ${r.flag}`,
                  to: `/laboratory/results/${r.id}`,
                }))}
                icon={<ScienceIcon />}
                loading={isLoading}
                danger
              />
            </Grid>
            <Grid item xs={12}>
              <InfoCard
                title={`Pending follow-ups (${data?.pending_follow_ups.length ?? 0})`}
                items={(data?.pending_follow_ups ?? []).map((f) => ({
                  primary: `${patientLabel(f.patient)} — ${formatDate(f.scheduled_date)}`,
                  secondary: f.instructions || 'No instructions',
                }))}
                icon={<EventAvailableIcon />}
                loading={isLoading}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}

function ReceptionistDashboardView() {
  const { data, isLoading, error } = useGetReceptionistDashboardQuery();
  const range = useDefaultRange();
  const { data: appts } = useGetDashboardAppointmentsAnalyticsQuery(range);

  const byStatusPie: ChartDatum[] = useMemo(
    () => Object.entries(appts?.by_status ?? {}).map(([name, value]) => ({ name, value })),
    [appts],
  );
  const byStatus = data?.appointments_by_status ?? {};

  if (error) return <ErrorBanner error={error} />;

  return (
    <Box>
      <PageHeader title="Front desk" subtitle="Reception overview" />
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(byStatus).map(([status, count]) => (
          <Grid item xs={12} sm={6} md={3} key={status}>
            <StatCard title={`${status.replace(/_/g, ' ')}`} value={count} icon={<EventAvailableIcon />} loading={isLoading} />
          </Grid>
        ))}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Waiting queue" value={data?.waiting_queue_count ?? '—'} icon={<GroupsIcon />} color="warning" loading={isLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="New registrations" value={data?.new_registrations ?? '—'} icon={<PersonAddIcon />} color="success" loading={isLoading} />
        </Grid>
      </Grid>
      <Grid item xs={12} md={6}>
        <ChartCard title="Appointments by status" subtitle="Last 30 days">
          <StatusPieChart data={byStatusPie} />
        </ChartCard>
      </Grid>
    </Box>
  );
}

function GenericDashboardView() {
  const range = useDefaultRange();
  const { data: appts, isLoading: apptsLoading, error: apptsError } = useGetDashboardAppointmentsAnalyticsQuery(range);
  const { data: rev, isLoading: revLoading, error: revError } = useGetDashboardRevenueAnalyticsQuery(range);

  const byStatusPie: ChartDatum[] = useMemo(
    () => Object.entries(appts?.by_status ?? {}).map(([name, value]) => ({ name, value })),
    [appts],
  );
  const revenueSeries = useMemo(
    () => (rev?.by_day ?? []).map((d) => ({ name: formatDate(d.date), total: toMoney(d.total) })),
    [rev],
  );

  if (apptsError || revError) return <ErrorBanner error={apptsError ?? revError} />;

  return (
    <Box>
      <PageHeader title="Dashboard" subtitle="Organization overview" />
      {(apptsLoading || revLoading) && <LinearProgress sx={{ mb: 2 }} />}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Appointments (30d)" value={appts?.total ?? '—'} icon={<EventAvailableIcon />} color="primary" loading={apptsLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Revenue (30d)" value={formatCurrency(toMoney(rev?.total))} icon={<AttachMoneyIcon />} color="success" loading={revLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Outstanding" value={formatCurrency(toMoney(rev?.outstanding))} icon={<DescriptionIcon />} color="error" loading={revLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Avg wait (min)" value={appts?.avg_wait_minutes ?? '—'} icon={<GroupsIcon />} color="warning" loading={apptsLoading} />
        </Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <ChartCard title="Revenue (last 30 days)" subtitle={`${range.from} → ${range.to}`}>
            <RevenueLineChart data={revenueSeries} />
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={5}>
          <ChartCard title="Appointments by status" subtitle="Last 30 days">
            <StatusPieChart data={byStatusPie} />
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}

function RevenueLineChart({ data }: { data: Array<{ name: string; total: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
        <Line type="monotone" dataKey="total" name="Revenue" stroke="#0B6E4F" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function StatusPieChart({ data }: { data: ChartDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} label={(d: { name?: string | number; value?: number | string }) => `${d.name}: ${d.value}`}>
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface InfoItem {
  primary: string;
  secondary?: string;
  to?: string;
}

function InfoCard({ title, items, icon, loading, danger }: { title: string; items: InfoItem[]; icon: ReactNode; loading?: boolean; danger?: boolean }) {
  return (
    <Card variant="outlined" sx={{ bgcolor: danger ? 'error.light' : undefined }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon} {title}
        </Typography>
        {loading ? (
          <LinearProgress />
        ) : items.length === 0 ? (
          <EmptyState title="Nothing here" hint="No items to show." />
        ) : (
          <List dense disablePadding>
            {items.map((item, i) => (
              <ListItem key={i} disableGutters divider={i < items.length - 1}>
                <ListItemText
                  primary={
                    item.to ? (
                      <Link component={RouterLink} to={item.to} underline="hover">{item.primary}</Link>
                    ) : (
                      item.primary
                    )
                  }
                  secondary={item.secondary}
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

function ErrorBanner({ error }: { error: unknown }) {
  const msg =
    error && typeof error === 'object' && 'data' in error
      ? ((error as { data?: { detail?: string } }).data?.detail ?? 'Failed to load dashboard data.')
      : 'Failed to load dashboard data.';
  return (
    <Alert severity="error" role="alert" sx={{ mt: 2 }}>{msg}</Alert>
  );
}
