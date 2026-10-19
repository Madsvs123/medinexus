import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Link, MenuItem, Stack, TextField, Typography } from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { PageHeader, DataTable, StatusChip, EmptyState, ErrorAlert } from '../../../components/ui';
import { useApproveLabResultMutation, useGetLabResultsQuery, useRejectLabResultMutation } from '../api';
import type { LabResult } from '../types';
import { patientLabel } from '../types';

export default function ResultsReview() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState('');
  const [flag, setFlag] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rejectTarget, setRejectTarget] = useState<LabResult | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading, isFetching, error } = useGetLabResultsQuery({
    page,
    page_size: pageSize,
    status: status || undefined,
    flag: flag || undefined,
  });
  const [approveResult] = useApproveLabResultMutation();
  const [rejectResult] = useRejectLabResultMutation();

  const columns = useMemo(
    () => [
      { key: 'id', label: '#', render: (r: LabResult) => <strong>R-{r.id}</strong> },
      {
        key: 'patient',
        label: 'Patient',
        render: (r: LabResult) =>
          typeof r.order === 'object' && r.order ? (
            <Link component={RouterLink} to={`/patients/${typeof r.order.patient === 'number' ? r.order.patient : r.order.patient.id}`} underline="hover">
              {patientLabel(r.order.patient)}
            </Link>
          ) : (
            `Order #${r.order}`
          ),
      },
      { key: 'test', label: 'Test', render: (r: LabResult) => (typeof r.test === 'number' ? `Test #${r.test}` : r.test.name) },
      {
        key: 'value',
        label: 'Value',
        render: (r: LabResult) => (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.value} {r.unit}</Typography>
        ),
      },
      { key: 'flag', label: 'Flag', render: (r: LabResult) => <StatusChip status={r.flag} /> },
      { key: 'status', label: 'Status', render: (r: LabResult) => <StatusChip status={r.status} /> },
      {
        key: 'reviewed',
        label: 'Reviewed',
        render: (r: LabResult) => (r.reviewed_at ? dayjs(r.reviewed_at).format('DD MMM HH:mm') : '—'),
      },
      {
        key: 'actions',
        label: '',
        render: (r: LabResult) =>
          r.status === 'PENDING' || r.status === 'REVIEWED' ? (
            <Stack direction="row" spacing={0.5}>
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={async () => {
                  await approveResult(r.id).unwrap();
                  enqueueSnackbar(r.flag === 'CRITICAL' ? 'Approved — critical alert sent' : 'Approved', { variant: 'success' });
                }}
              >
                Approve
              </Button>
              <Button size="small" variant="outlined" color="error" onClick={() => setRejectTarget(r)}>Reject</Button>
            </Stack>
          ) : (
            <Button size="small" variant="outlined" onClick={() => navigate(`/laboratory/results/${r.id}`)}>Open</Button>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const doReject = async () => {
    if (!rejectTarget) return;
    try {
      await rejectResult({ id: rejectTarget.id, reason: rejectReason || 'Rejected by reviewer' }).unwrap();
      enqueueSnackbar('Result rejected', { variant: 'success' });
      setRejectTarget(null);
      setRejectReason('');
    } catch {
      enqueueSnackbar('Failed to reject result', { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader title="Results review" subtitle="Approve or reject lab results" />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Box sx={{ width: 200 }}>
          <TextField select size="small" label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} fullWidth>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="REVIEWED">Reviewed</MenuItem>
            <MenuItem value="APPROVED">Approved</MenuItem>
            <MenuItem value="REJECTED">Rejected</MenuItem>
          </TextField>
        </Box>
        <Box sx={{ width: 200 }}>
          <TextField select size="small" label="Flag" value={flag} onChange={(e) => { setFlag(e.target.value); setPage(1); }} fullWidth>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="NORMAL">Normal</MenuItem>
            <MenuItem value="ABNORMAL">Abnormal</MenuItem>
            <MenuItem value="CRITICAL">Critical</MenuItem>
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
        emptyState={<EmptyState icon={<FactCheckIcon />} title="No results" hint="Results awaiting review appear here." />}
      />
      <Dialog open={!!rejectTarget} onClose={() => setRejectTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Reject result</DialogTitle>
        <DialogContent>
          <TextField label="Reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} fullWidth multiline minRows={2} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={doReject}>Reject</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
