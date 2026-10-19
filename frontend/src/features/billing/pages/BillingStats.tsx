import { Box, Chip, Grid, LinearProgress } from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningIcon from '@mui/icons-material/Warning';
import ScheduleIcon from '@mui/icons-material/Schedule';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { PageHeader, StatCard } from '../../../components/ui';
import { formatCurrency } from '../../../utils/format';
import { useGetBillingStatsQuery } from '../api';
import { num } from '../types';

function getErr(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = (e as { data?: unknown }).data as Record<string, unknown> | undefined;
    if (data?.detail) return String(data.detail);
  }
  return 'Failed to load billing stats.';
}

export default function BillingStats() {
  const { data, isLoading, error } = useGetBillingStatsQuery();

  return (
    <Box>
      <PageHeader title="Billing stats" subtitle="Revenue and claims overview" />
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Chip label={getErr(error)} color="error" sx={{ mb: 2 }} />}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Revenue today" value={formatCurrency(num(data?.revenue_today))} icon={<AttachMoneyIcon />} color="success" loading={isLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Revenue this month" value={formatCurrency(num(data?.revenue_month))} icon={<TrendingUpIcon />} color="primary" loading={isLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Outstanding" value={formatCurrency(num(data?.outstanding))} icon={<ScheduleIcon />} color="warning" loading={isLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Overdue" value={formatCurrency(num(data?.overdue))} icon={<WarningIcon />} color="error" loading={isLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Claims pending" value={data?.claims_pending ?? '—'} icon={<DescriptionIcon />} color="secondary" loading={isLoading} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Claims approved" value={data?.claims_approved ?? '—'} icon={<CheckCircleIcon />} color="info" loading={isLoading} />
        </Grid>
      </Grid>
    </Box>
  );
}
