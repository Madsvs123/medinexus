import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Card, CardContent, Chip, Grid, Link, List, ListItem, ListItemText, MenuItem, Stack, TextField, Typography } from '@mui/material';
import BiotechIcon from '@mui/icons-material/Biotech';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { PageHeader, StatusChip, EmptyState, ErrorAlert, LoadingOverlay, ConfirmDialog } from '../../../components/ui';
import { useCancelLabOrderMutation, useCollectLabOrderMutation, useGetLabOrderQuery, useGetLabResultsQuery, useGetLabSamplesQuery, useUpdateLabSampleMutation } from '../api';
import type { LabSample, SampleStatus } from '../types';
import { patientLabel, testName, userName } from '../types';

export default function LabOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data: order, isLoading, error } = useGetLabOrderQuery(orderId);
  const { data: samplesData } = useGetLabSamplesQuery({ order: orderId, page_size: 50 });
  const { data: resultsData } = useGetLabResultsQuery({ order: orderId, page_size: 50 });
  const [collectOrder, { isLoading: collecting }] = useCollectLabOrderMutation();
  const [cancelOrder] = useCancelLabOrderMutation();
  const [updateSample] = useUpdateLabSampleMutation();

  const samples = useMemo(() => samplesData?.results ?? [], [samplesData]);
  const results = useMemo(() => resultsData?.results ?? [], [resultsData]);

  if (isLoading) return <LoadingOverlay open />;
  if (error) return <ErrorAlert error={error} />;
  if (!order) return <EmptyState title="Order not found" hint="It may have been removed." />;

  const canCollect = order.status === 'ORDERED';
  const hasPendingResults = samples.some((s) => s.status === 'COLLECTED') || results.some((r) => r.status === 'PENDING');

  return (
    <Box>
      <PageHeader
        title={`Lab order L-${order.id}`}
        subtitle={
          <>
            {patientLabel(order.patient)} • ordered {dayjs(order.ordered_at).format('DD MMM YYYY HH:mm')} by {userName(order.ordered_by)}
          </>
        }
        action={
          <Stack direction="row" spacing={1}>
            {canCollect && (
              <Button
                variant="contained"
                startIcon={<BiotechIcon />}
                disabled={collecting}
                onClick={async () => {
                  try {
                    await collectOrder(orderId).unwrap();
                    enqueueSnackbar('Samples marked as collected', { variant: 'success' });
                  } catch {
                    enqueueSnackbar('Failed to collect samples', { variant: 'error' });
                  }
                }}
              >
                Collect samples
              </Button>
            )}
            {(order.status === 'ORDERED' || order.status === 'SAMPLES_COLLECTED') && (
              <Button variant="outlined" color="error" onClick={() => setCancelOpen(true)}>Cancel order</Button>
            )}
          </Stack>
        }
      />
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <StatusChip status={order.status} />
        <StatusChip status={order.priority} />
        {order.encounter && (
          <Link component={RouterLink} to={`/encounters/${order.encounter}`} underline="hover">View encounter →</Link>
        )}
      </Stack>
      {hasPendingResults && (
        <Button variant="contained" color="secondary" sx={{ mb: 2 }} onClick={() => navigate('/laboratory/workqueue')}>
          Enter results in work queue →
        </Button>
      )}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>Tests</Typography>
              <List dense>
                {order.tests.map((t, i) => (
                  <ListItem key={i} divider>
                    <ListItemText primary={testName(t)} />
                  </ListItem>
                ))}
              </List>
              {order.notes && <Typography variant="body2" color="text.secondary">Notes: {order.notes}</Typography>}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>Samples ({samples.length})</Typography>
              {samples.length === 0 ? (
                <EmptyState title="No samples yet" hint="Samples are auto-created on order; collect them to continue." />
              ) : (
                <List dense>
                  {samples.map((s: LabSample) => (
                    <ListItem key={s.id} divider>
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <strong>{s.sample_id}</strong>
                            <span>{typeof s.test === 'number' ? `Test #${s.test}` : s.test.name}</span>
                            <StatusChip status={s.status} />
                          </Stack>
                        }
                        secondary={
                          <>
                            {s.collected_at ? `Collected ${dayjs(s.collected_at).format('DD MMM HH:mm')}` : 'Not collected yet'}
                            {s.rejection_reason ? ` • Rejected: ${s.rejection_reason}` : ''}
                          </>
                        }
                      />
                      {(s.status === 'COLLECTED' || s.status === 'IN_TRANSIT') && (
                        <Box>
                          <TextField
                            select
                            size="small"
                            label="Update status"
                            value={s.status}
                            onChange={async (e) => {
                              await updateSample({ id: s.id, body: { status: e.target.value as SampleStatus } }).unwrap();
                              enqueueSnackbar('Sample updated', { variant: 'success' });
                            }}
                          >
                            <MenuItem value="COLLECTED">Collected</MenuItem>
                            <MenuItem value="IN_TRANSIT">In transit</MenuItem>
                            <MenuItem value="RECEIVED">Received</MenuItem>
                            <MenuItem value="REJECTED">Rejected</MenuItem>
                          </TextField>
                        </Box>
                      )}
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>Results ({results.length})</Typography>
              {results.length === 0 ? (
                <EmptyState title="No results yet" hint="Enter results from the work queue once samples are collected." />
              ) : (
                <List dense>
                  {results.map((r) => (
                    <ListItem key={r.id} divider>
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <strong>{typeof r.test === 'number' ? `Test #${r.test}` : r.test.name}</strong>
                            <Chip size="small" label={`${r.value} ${r.unit}`} />
                            <StatusChip status={r.flag} />
                            <StatusChip status={r.status} />
                          </Stack>
                        }
                        secondary={
                          <>
                            {r.notes && <Typography variant="body2">{r.notes}</Typography>}
                            {r.reviewed_by && (
                              <Typography variant="caption" color="text.secondary">
                                Reviewed by {userName(r.reviewed_by)} {r.reviewed_at ? `on ${dayjs(r.reviewed_at).format('DD MMM YYYY HH:mm')}` : ''}
                              </Typography>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <ConfirmDialog
        open={cancelOpen}
        title="Cancel lab order?"
        message="The order and its pending samples/results will be cancelled."
        confirmLabel="Cancel order"
        onConfirm={async () => {
          try {
            await cancelOrder(orderId).unwrap();
            enqueueSnackbar('Lab order cancelled', { variant: 'success' });
            setCancelOpen(false);
            navigate('/laboratory/orders');
          } catch {
            enqueueSnackbar('Failed to cancel order', { variant: 'error' });
          }
        }}
        onCancel={() => setCancelOpen(false)}
      />
    </Box>
  );
}
