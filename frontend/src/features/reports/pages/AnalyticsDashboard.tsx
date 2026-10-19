import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Box,
  Grid,
  LinearProgress,
  Tab,
  Tabs,
  Typography,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { PageHeader, StatCard, ChartCard } from '../../../components/ui';
import { formatCurrency, formatDate } from '../../../utils/format';
import {
  useGetAppointmentsAnalyticsQuery,
  useGetRevenueAnalyticsQuery,
  useGetClinicalAnalyticsQuery,
  useGetLaboratoryAnalyticsQuery,
  useGetPharmacyAnalyticsQuery,
} from '../api';
import type { AnalyticsRange, AppointmentsAnalytics, ClinicalAnalytics, LaboratoryAnalytics, PharmacyAnalytics, RevenueAnalytics } from '../types';

const PIE_COLORS = ['#0B6E4F', '#2563EB', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#64748B', '#F97316'];

type TabKey = 'appointments' | 'revenue' | 'clinical' | 'laboratory' | 'pharmacy';

function getErrorMsg(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = (e as { data?: { detail?: string } }).data;
    return data?.detail ?? 'Failed to load analytics.';
  }
  return 'Failed to load analytics.';
}

export default function AnalyticsDashboard() {
  const [tab, setTab] = useState<TabKey>('appointments');
  const [from, setFrom] = useState<string>(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [to, setTo] = useState<string>(dayjs().format('YYYY-MM-DD'));

  const range: AnalyticsRange = useMemo(() => ({ from, to }), [from, to]);

  const appts = useGetAppointmentsAnalyticsQuery(range);
  const revenue = useGetRevenueAnalyticsQuery(range);
  const clinical = useGetClinicalAnalyticsQuery(range);
  const laboratory = useGetLaboratoryAnalyticsQuery(range);
  const pharmacy = useGetPharmacyAnalyticsQuery(range);

  const loading = [appts, revenue, clinical, laboratory, pharmacy].some((q) => q.isLoading);

  const apptsByStatus = useMemo(
    () => Object.entries(appts.data?.by_status ?? {}).map(([name, value]) => ({ name, value })),
    [appts.data],
  );
  const apptsByDay = useMemo(
    () => (appts.data?.by_day ?? []).map((d) => ({ name: formatDate(d.date), count: d.count })),
    [appts.data],
  );
  const revenueByDay = useMemo(
    () => (revenue.data?.by_day ?? []).map((d) => ({ name: formatDate(d.date), total: Number(d.total) })),
    [revenue.data],
  );
  const revenueByCategory = useMemo(
    () => Object.entries(revenue.data?.by_category ?? {}).map(([name, value]) => ({ name, value: Number(value) })),
    [revenue.data],
  );

  return (
    <Box>
      <PageHeader title="Analytics" subtitle="Organization performance metrics" />
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <DatePicker
          label="From"
          slotProps={{ textField: { size: 'small' } }}
          value={dayjs(from)}
          onChange={(d) => d && setFrom(d.format('YYYY-MM-DD'))}
        />
        <DatePicker
          label="To"
          slotProps={{ textField: { size: 'small' } }}
          value={dayjs(to)}
          onChange={(d) => d && setTo(d.format('YYYY-MM-DD'))}
        />
        <Typography variant="caption" color="text.secondary">
          {from} → {to}
        </Typography>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Tabs value={tab} onChange={(_e, v: TabKey) => setTab(v)} sx={{ mb: 2 }} variant="scrollable" scrollButtons="auto">
        <Tab value="appointments" label="Appointments" />
        <Tab value="revenue" label="Revenue" />
        <Tab value="clinical" label="Clinical" />
        <Tab value="laboratory" label="Laboratory" />
        <Tab value="pharmacy" label="Pharmacy" />
      </Tabs>

      {tab === 'appointments' && (
        <AppointmentsTab data={appts.data} byDay={apptsByDay} byStatus={apptsByStatus} error={appts.error} />
      )}
      {tab === 'revenue' && (
        <RevenueTab data={revenue.data} byDay={revenueByDay} byCategory={revenueByCategory} error={revenue.error} />
      )}
      {tab === 'clinical' && <ClinicalTab data={clinical.data} error={clinical.error} />}
      {tab === 'laboratory' && <LaboratoryTab data={laboratory.data} error={laboratory.error} />}
      {tab === 'pharmacy' && <PharmacyTab data={pharmacy.data} error={pharmacy.error} />}
    </Box>
  );
}

function ErrorAlert({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <Alert severity="error" role="alert" sx={{ mb: 2 }}>{getErrorMsg(error)}</Alert>
  );
}

function AppointmentsTab({
  data,
  byDay,
  byStatus,
  error,
}: {
  data: AppointmentsAnalytics | undefined;
  byDay: Array<{ name: string; count: number }>;
  byStatus: Array<{ name: string; value: number }>;
  error: unknown;
}) {
  return (
    <Box>
      <ErrorAlert error={error} />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Total appointments" value={data?.total ?? '—'} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Avg wait (min)" value={data?.avg_wait_minutes ?? '—'} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Statuses" value={Object.keys(data?.by_status ?? {}).length} />
        </Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <ChartCard title="Appointments per day">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byDay} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Appointments" fill="#2563EB" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={5}>
          <ChartCard title="By status">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={90} label={(d: { name?: string | number; value?: number | string }) => `${d.name}: ${d.value}`}>
                  {byStatus.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}

function RevenueTab({
  data,
  byDay,
  byCategory,
  error,
}: {
  data: RevenueAnalytics | undefined;
  byDay: Array<{ name: string; total: number }>;
  byCategory: Array<{ name: string; value: number }>;
  error: unknown;
}) {
  return (
    <Box>
      <ErrorAlert error={error} />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Total revenue" value={formatCurrency(Number(data?.total ?? 0))} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Outstanding" value={formatCurrency(Number(data?.outstanding ?? 0))} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Categories" value={Object.keys(data?.by_category ?? {}).length} />
        </Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <ChartCard title="Revenue per day">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={byDay} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Line type="monotone" dataKey="total" name="Revenue" stroke="#0B6E4F" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={5}>
          <ChartCard title="By category">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={90} label={(d: { name?: string | number }) => d.name}>
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}

function ClinicalTab({ data, error }: { data: ClinicalAnalytics | undefined; error: unknown }) {
  const diagnoses = useMemo(
    () => (data?.top_diagnoses ?? []).map((d) => ({ name: d.name, count: d.count })),
    [data],
  );
  return (
    <Box>
      <ErrorAlert error={error} />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Encounters" value={data?.encounters ?? '—'} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Admissions" value={data?.admissions ?? '—'} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Avg length of stay" value={data?.avg_length_of_stay_days != null ? `${data.avg_length_of_stay_days} days` : '—'} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Top diagnoses" value={diagnoses.length} />
        </Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <ChartCard title="Top diagnoses">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={diagnoses} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Diagnoses" fill="#8B5CF6" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}

function LaboratoryTab({ data, error }: { data: LaboratoryAnalytics | undefined; error: unknown }) {
  return (
    <Box>
      <ErrorAlert error={error} />
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Orders" value={data?.orders ?? '—'} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Completed" value={data?.completed ?? '—'} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Abnormal rate" value={data?.abnormal_rate != null ? `${Math.round(Number(data.abnormal_rate) * 100) / 100}%` : '—'} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Critical results" value={data?.critical_count ?? '—'} color="error" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Avg turnaround (h)" value={data?.avg_turnaround_hours ?? '—'} />
        </Grid>
      </Grid>
    </Box>
  );
}

function PharmacyTab({ data, error }: { data: PharmacyAnalytics | undefined; error: unknown }) {
  return (
    <Box>
      <ErrorAlert error={error} />
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Dispensations" value={data?.dispensations ?? '—'} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Revenue" value={formatCurrency(Number(data?.revenue ?? 0))} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Low stock items" value={data?.low_stock_count ?? '—'} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Expiring soon" value={data?.expiring_soon_count ?? '—'} color="error" />
        </Grid>
      </Grid>
      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Pharmacy revenue and inventory alerts for the selected period.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
