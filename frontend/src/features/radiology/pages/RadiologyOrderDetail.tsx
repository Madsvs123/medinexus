import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Card, CardContent, Link, Stack, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { PageHeader, StatusChip, EmptyState, ErrorAlert, LoadingOverlay, ConfirmDialog } from '../../../components/ui';
import { useCancelRadiologyOrderMutation, useCompleteRadiologyOrderMutation, useGetRadiologyOrderQuery, useGetRadiologyReportsQuery, useStartRadiologyOrderMutation } from '../api';
import { patientLabel, userName } from '../types';

export default function RadiologyOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data: order, isLoading, error } = useGetRadiologyOrderQuery(orderId);
  const { data: reportsData } = useGetRadiologyReportsQuery({ order: orderId, page_size: 10 });
  const [startOrder] = useStartRadiologyOrderMutation();
  const [completeOrder] = useCompleteRadiologyOrderMutation();
  const [cancelOrder] = useCancelRadiologyOrderMutation();

  const reports = useMemo(() => reportsData?.results ?? [], [reportsData]);
  const latestReport = reports[0] ?? null;

  if (isLoading) return <LoadingOverlay open />;
  if (error) return <ErrorAlert error={error} />;
  if (!order) return <EmptyState title="Order not found" hint="It may have been removed." />;

  return (
    <Box>
      <PageHeader
        title={`Radiology order X-${order.id} — ${order.modality} ${order.body_part}`}
        subtitle={
          <>
            {patientLabel(order.patient)} • ordered {dayjs(order.ordered_at).format('DD MMM YYYY HH:mm')} by {userName(order.ordered_by)}
          </>
        }
        action={
          <Stack direction="row" spacing={1}>
            {order.status === 'ORDERED' && (
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={async () => {
                  await startOrder(orderId).unwrap();
                  enqueueSnackbar('Study started', { variant: 'success' });
                }}
              >
                Start
              </Button>
            )}
            {order.status === 'IN_PROGRESS' && (
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={async () => {
                  await completeOrder(orderId).unwrap();
                  enqueueSnackbar('Study completed', { variant: 'success' });
                }}
              >
                Complete
              </Button>
            )}
            {(order.status === 'ORDERED' || order.status === 'IN_PROGRESS') && (
              <Button variant="outlined" color="error" onClick={() => setCancelOpen(true)}>Cancel</Button>
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
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Order details</Typography>
          <Typography variant="body2"><strong>Modality:</strong> {order.modality}</Typography>
          <Typography variant="body2"><strong>Body part:</strong> {order.body_part}</Typography>
          {order.clinical_indication && (
            <Typography variant="body2"><strong>Clinical indication:</strong> {order.clinical_indication}</Typography>
          )}
          {order.notes && <Typography variant="body2"><strong>Notes:</strong> {order.notes}</Typography>}
        </CardContent>
      </Card>
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h6">Report</Typography>
            {order.status !== 'CANCELLED' && (
              <Button
                variant="contained"
                startIcon={<DescriptionIcon />}
                onClick={() => navigate(latestReport ? `/radiology/reports/${latestReport.id}` : `/radiology/reports/new?order=${orderId}`)}
              >
                {latestReport ? (latestReport.status === 'FINAL' ? 'View report' : 'Edit draft') : 'Write report'}
              </Button>
            )}
          </Stack>
          {!latestReport ? (
            <EmptyState title="No report yet" hint="Write and finalize the radiology report." />
          ) : (
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <StatusChip status={latestReport.status} />
                {latestReport.radiologist && (
                  <Typography variant="caption" color="text.secondary">by {userName(latestReport.radiologist)}</Typography>
                )}
                {latestReport.finalized_at && (
                  <Typography variant="caption" color="text.secondary">
                    finalized {dayjs(latestReport.finalized_at).format('DD MMM YYYY HH:mm')}
                  </Typography>
                )}
              </Stack>
              <Typography variant="subtitle2">Findings</Typography>
              <Typography variant="body2" paragraph sx={{ whiteSpace: 'pre-wrap' }}>{latestReport.findings || '—'}</Typography>
              <Typography variant="subtitle2">Impression</Typography>
              <Typography variant="body2" paragraph sx={{ whiteSpace: 'pre-wrap' }}>{latestReport.impression || '—'}</Typography>
              {latestReport.attachment && (
                <Button component="a" href={latestReport.attachment} target="_blank" rel="noreferrer" size="small" variant="outlined">
                  View attachment
                </Button>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={cancelOpen}
        title="Cancel radiology order?"
        message="The order will be cancelled and no report can be produced."
        confirmLabel="Cancel order"
        onConfirm={async () => {
          try {
            await cancelOrder(orderId).unwrap();
            enqueueSnackbar('Radiology order cancelled', { variant: 'success' });
            setCancelOpen(false);
            navigate('/radiology/orders');
          } catch {
            enqueueSnackbar('Failed to cancel order', { variant: 'error' });
          }
        }}
        onCancel={() => setCancelOpen(false)}
      />
    </Box>
  );
}
