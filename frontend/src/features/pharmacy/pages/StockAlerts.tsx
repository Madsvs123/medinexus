import { Link as RouterLink } from 'react-router-dom';
import { Box, Card, CardContent, Grid, Link, Stack, Typography } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InventoryIcon from '@mui/icons-material/Inventory';
import { PageHeader, EmptyState, ErrorAlert } from '../../../components/ui';
import dayjs from 'dayjs';
import { useGetStockAlertsQuery } from '../api';
import { batchMedName } from '../types';

export default function StockAlerts() {
  const { data, isLoading, error } = useGetStockAlertsQuery();

  if (error) return <ErrorAlert error={error} />;

  const lowStock = data?.low_stock ?? [];
  const expiring = data?.expiring ?? [];
  const expired = data?.expired ?? [];

  return (
    <Box>
      <PageHeader title="Stock alerts" subtitle="Low stock, expiring and expired batches" />
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ borderColor: lowStock.length ? 'warning.main' : 'divider' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningAmberIcon color="warning" /> Low stock ({lowStock.length})
              </Typography>
              {isLoading ? (
                <EmptyState title="Loading…" hint="" />
              ) : lowStock.length === 0 ? (
                <EmptyState title="All good" hint="No medications below reorder level." />
              ) : (
                <Stack spacing={1}>
                  {lowStock.map((m) => (
                    <Box key={m.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                      <Link component={RouterLink} to="/pharmacy/medications" underline="hover" sx={{ fontWeight: 600 }}>
                        {m.name} {m.strength}
                      </Link>
                      <Typography variant="body2" color="error">
                        {m.current_stock} {m.unit} — reorder at {m.reorder_level}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ borderColor: expiring.length ? 'warning.main' : 'divider' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InventoryIcon color="warning" /> Expiring ≤90 days ({expiring.length})
              </Typography>
              {isLoading ? (
                <EmptyState title="Loading…" hint="" />
              ) : expiring.length === 0 ? (
                <EmptyState title="All good" hint="No batches expiring soon." />
              ) : (
                <Stack spacing={1}>
                  {expiring.map((b) => (
                    <Box key={b.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{batchMedName(b.medication)} — {b.batch_no}</Typography>
                      <Typography variant="body2" color="warning.main">
                        Expires {dayjs(b.expiry_date).format('DD MMM YYYY')} • {b.quantity} remaining
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ borderColor: expired.length ? 'error.main' : 'divider' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InventoryIcon color="error" /> Expired ({expired.length})
              </Typography>
              {isLoading ? (
                <EmptyState title="Loading…" hint="" />
              ) : expired.length === 0 ? (
                <EmptyState title="All good" hint="No expired batches." />
              ) : (
                <Stack spacing={1}>
                  {expired.map((b) => (
                    <Box key={b.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{batchMedName(b.medication)} — {b.batch_no}</Typography>
                      <Typography variant="body2" color="error">
                        Expired {dayjs(b.expiry_date).format('DD MMM YYYY')}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
