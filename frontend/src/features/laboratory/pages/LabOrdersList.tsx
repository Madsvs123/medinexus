import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Button, Link, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ScienceIcon from '@mui/icons-material/Science';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { PageHeader, DataTable, StatusChip, EmptyState, ErrorAlert, ConfirmDialog } from '../../../components/ui';
import { useCancelLabOrderMutation, useGetLabOrdersQuery } from '../api';
import type { LabOrder } from '../types';
import { LAB_ORDER_STATUSES, patientLabel, userName } from '../types';

export default function LabOrdersList() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [cancelTarget, setCancelTarget] = useState<LabOrder | null>(null);

  const { data, isLoading, isFetching, error } = useGetLabOrdersQuery({
    page,
    page_size: pageSize,
    status: status || undefined,
    priority: priority || undefined,
  });
  const [cancelOrder] = useCancelLabOrderMutation();

  const columns = useMemo(
    () => [
      { key: 'id', label: '#', render: (r: LabOrder) => <strong>L-{r.id}</strong> },
      {
        key: 'patient',
        label: 'Patient',
        render: (r: LabOrder) => (
          <Link component={RouterLink} to={`/patients/${typeof r.patient === 'number' ? r.patient : r.patient.id}`} underline="hover">
            {patientLabel(r.patient)}
          </Link>
        ),
      },
      {
        key: 'tests',
        label: 'Tests',
        render: (r: LabOrder) => (
          <Box>
            {r.tests.map((t, i) => (
              <Typography key={i} variant="body2">{typeof t === 'number' ? `Test #${t}` : t.name}</Typography>
            ))}
          </Box>
        ),
      },
      {
        key: 'priority',
        label: 'Priority',
        render: (r: LabOrder) => <StatusChip status={r.priority} />,
      },
      { key: 'ordered_by', label: 'Ordered by', render: (r: LabOrder) => userName(r.ordered_by) },
      {
        key: 'ordered_at',
        label: 'Ordered',
        render: (r: LabOrder) => (
          <Box>
            <Typography variant="body2">{dayjs(r.ordered_at).format('DD MMM YYYY')}</Typography>
            <Typography variant="caption" color="text.secondary">{dayjs(r.ordered_at).format('HH:mm')}</Typography>
          </Box>
        ),
      },
      { key: 'status', label: 'Status', render: (r: LabOrder) => <StatusChip status={r.status} /> },
      {
        key: 'actions',
        label: '',
        render: (r: LabOrder) =>
          r.status === 'ORDERED' || r.status === 'SAMPLES_COLLECTED' ? (
            <Button size="small" variant="outlined" color="error" onClick={() => setCancelTarget(r)}>Cancel</Button>
          ) : null,
      },
    ],
    [],
  );

  const doCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelOrder(cancelTarget.id).unwrap();
      enqueueSnackbar('Lab order cancelled', { variant: 'success' });
      setCancelTarget(null);
    } catch {
      enqueueSnackbar('Failed to cancel order', { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader
        title="Laboratory orders"
        subtitle="Track orders from placement to result"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/laboratory/orders/new')}>
            New order
          </Button>
        }
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Box sx={{ width: 200 }}>
          <TextField select size="small" label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} fullWidth>
            <MenuItem value="">All</MenuItem>
            {LAB_ORDER_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>
            ))}
          </TextField>
        </Box>
        <Box sx={{ width: 180 }}>
          <TextField select size="small" label="Priority" value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} fullWidth>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="ROUTINE">Routine</MenuItem>
            <MenuItem value="URGENT">Urgent</MenuItem>
            <MenuItem value="STAT">STAT</MenuItem>
          </TextField>
        </Box>
      </Stack>
      {error && <ErrorAlert error={error} />}
      <DataTable
        columns={columns}
        rows={data?.results ?? []}
        loading={isLoading || isFetching}
        rowKey={(r) => String(r.id)}
        page={page}
        pageSize={pageSize}
        count={data?.count ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(s: number) => { setPageSize(s); setPage(1); }}
        onRowClick={(r: LabOrder) => navigate(`/laboratory/orders/${r.id}`)}
        emptyState={<EmptyState icon={<ScienceIcon />} title="No lab orders" hint="Create an order to start the testing workflow." />}
      />
      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel lab order?"
        message="Pending samples and results for this order will be voided."
        confirmLabel="Cancel order"
        onConfirm={doCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </Box>
  );
}
