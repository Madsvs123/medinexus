import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Button, Link, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import dayjs from 'dayjs';
import { PageHeader, DataTable, StatusChip, EmptyState, ErrorAlert } from '../../../components/ui';
import { useGetRadiologyOrdersQuery } from '../api';
import type { RadiologyOrder } from '../types';
import { RADIOLOGY_MODALITIES, RADIOLOGY_ORDER_STATUSES, patientLabel, userName } from '../types';

export default function RadiologyOrdersList() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [modality, setModality] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading, isFetching, error } = useGetRadiologyOrdersQuery({
    page,
    page_size: pageSize,
    status: status || undefined,
    modality: modality || undefined,
  });

  const columns = useMemo(
    () => [
      { key: 'id', label: '#', render: (r: RadiologyOrder) => <strong>X-{r.id}</strong> },
      {
        key: 'patient',
        label: 'Patient',
        render: (r: RadiologyOrder) => (
          <Link component={RouterLink} to={`/patients/${typeof r.patient === 'number' ? r.patient : r.patient.id}`} underline="hover">
            {patientLabel(r.patient)}
          </Link>
        ),
      },
      { key: 'modality', label: 'Modality', render: (r: RadiologyOrder) => <StatusChip status={r.modality} /> },
      { key: 'body_part', label: 'Body part', render: (r: RadiologyOrder) => r.body_part },
      { key: 'priority', label: 'Priority', render: (r: RadiologyOrder) => <StatusChip status={r.priority} /> },
      { key: 'ordered_by', label: 'Ordered by', render: (r: RadiologyOrder) => userName(r.ordered_by) },
      {
        key: 'ordered_at',
        label: 'Ordered',
        render: (r: RadiologyOrder) => (
          <Box>
            <Typography variant="body2">{dayjs(r.ordered_at).format('DD MMM YYYY')}</Typography>
            <Typography variant="caption" color="text.secondary">{dayjs(r.ordered_at).format('HH:mm')}</Typography>
          </Box>
        ),
      },
      { key: 'status', label: 'Status', render: (r: RadiologyOrder) => <StatusChip status={r.status} /> },
    ],
    [],
  );

  return (
    <Box>
      <PageHeader
        title="Radiology orders"
        subtitle="Imaging requests and statuses"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/radiology/orders/new')}>
            New order
          </Button>
        }
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Box sx={{ width: 200 }}>
          <TextField select size="small" label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} fullWidth>
            <MenuItem value="">All</MenuItem>
            {RADIOLOGY_ORDER_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>
            ))}
          </TextField>
        </Box>
        <Box sx={{ width: 200 }}>
          <TextField select size="small" label="Modality" value={modality} onChange={(e) => { setModality(e.target.value); setPage(1); }} fullWidth>
            <MenuItem value="">All</MenuItem>
            {RADIOLOGY_MODALITIES.map((m) => (
              <MenuItem key={m} value={m}>{m}</MenuItem>
            ))}
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
        onRowClick={(r: RadiologyOrder) => navigate(`/radiology/orders/${r.id}`)}
        emptyState={<EmptyState title="No radiology orders" hint="Create an imaging order to get started." />}
      />
    </Box>
  );
}
