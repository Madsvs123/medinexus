import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Link, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { PageHeader, DataTable, StatusChip, ConfirmDialog, EmptyState, ErrorAlert } from '../../../components/ui';
import {
  useCancelAppointmentMutation,
  useCheckinAppointmentMutation,
  useCompleteAppointmentMutation,
  useConfirmAppointmentMutation,
  useDeleteAppointmentMutation,
  useGetAppointmentsQuery,
  useNoshowAppointmentMutation,
  useStartAppointmentMutation,
} from '../api';
import type { Appointment } from '../types';
import { APPOINTMENT_STATUSES, patientLabel, userName, departmentName } from '../types';

export default function AppointmentList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [date, setDate] = useState(searchParams.get('date') ?? dayjs().format('YYYY-MM-DD'));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);

  const { data, isLoading, isFetching, error } = useGetAppointmentsQuery({
    page,
    page_size: pageSize,
    status: status || undefined,
    date: date || undefined,
  });
  const [confirmAppt] = useConfirmAppointmentMutation();
  const [checkinAppt] = useCheckinAppointmentMutation();
  const [startAppt] = useStartAppointmentMutation();
  const [completeAppt] = useCompleteAppointmentMutation();
  const [noshowAppt] = useNoshowAppointmentMutation();
  const [cancelAppt] = useCancelAppointmentMutation();
  const [deleteAppt] = useDeleteAppointmentMutation();

  const columns = useMemo(
    () => [
      {
        key: 'time',
        label: 'When',
        render: (r: Appointment) => (
          <Box>
            <Typography>{dayjs(r.start).format('ddd DD MMM, HH:mm')}</Typography>
            <Typography variant="caption" color="text.secondary">{dayjs(r.end).format('HH:mm')} end</Typography>
          </Box>
        ),
      },
      {
        key: 'patient',
        label: 'Patient',
        render: (r: Appointment) => (
          <Link component={RouterLink} to={`/patients/${typeof r.patient === 'number' ? r.patient : r.patient.id}`} underline="hover">
            {patientLabel(r.patient)}
          </Link>
        ),
      },
      { key: 'doctor', label: 'Doctor', render: (r: Appointment) => userName(r.doctor) },
      { key: 'department', label: 'Department', render: (r: Appointment) => departmentName(r.department) },
      { key: 'type', label: 'Type', render: (r: Appointment) => <StatusChip status={r.type} /> },
      { key: 'status', label: 'Status', render: (r: Appointment) => <StatusChip status={r.status} /> },
      {
        key: 'actions',
        label: 'Actions',
        render: (r: Appointment) => <RowActions r={r} onAction={runAction} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );

  const runAction = async (action: string, r: Appointment) => {
    const ops: Record<string, () => Promise<unknown>> = {
      confirm: () => confirmAppt(r.id).unwrap(),
      checkin: () => checkinAppt(r.id).unwrap(),
      start: () => startAppt(r.id).unwrap(),
      complete: () => completeAppt(r.id).unwrap(),
      noshow: () => noshowAppt(r.id).unwrap(),
    };
    try {
      await ops[action]();
      enqueueSnackbar(`${r.id} → ${action}`, { variant: 'success' });
    } catch {
      enqueueSnackbar(`Action ${action} failed`, { variant: 'error' });
    }
  };

  const doCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelAppt({ id: cancelTarget.id, reason: cancelReason || 'Cancelled by staff' }).unwrap();
      enqueueSnackbar('Appointment cancelled', { variant: 'success' });
      setCancelTarget(null);
      setCancelReason('');
    } catch {
      enqueueSnackbar('Failed to cancel appointment', { variant: 'error' });
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAppt(deleteTarget.id).unwrap();
      enqueueSnackbar('Appointment deleted', { variant: 'success' });
      setDeleteTarget(null);
    } catch {
      enqueueSnackbar('Failed to delete appointment', { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader
        title="Appointments"
        subtitle="Manage the day's schedule"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/appointments/new')}>
            Book
          </Button>
        }
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Box sx={{ width: 200 }}>
          <TextField
            type="date"
            size="small"
            label="Date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setPage(1);
              setSearchParams(e.target.value ? { date: e.target.value } : {}, { replace: true });
            }}
            fullWidth
          />
        </Box>
        <Box sx={{ width: 220 }}>
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            fullWidth
          >
            <MenuItem value="">All statuses</MenuItem>
            {APPOINTMENT_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>
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
        onPageSizeChange={(s: number) => {
          setPageSize(s);
          setPage(1);
        }}
        emptyState={
          <EmptyState
            icon={<EventAvailableIcon />}
            title="No appointments"
            hint={date ? `Nothing scheduled for ${date}.` : 'Book your first appointment.'}
          />
        }
      />
      <Dialog open={!!cancelTarget} onClose={() => setCancelTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Cancel appointment?</DialogTitle>
        <DialogContent>
          <TextField
            label="Cancellation reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)}>Back</Button>
          <Button variant="contained" color="error" onClick={doCancel}>Cancel appointment</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete appointment?"
        message="This permanently removes the appointment. Consider cancelling instead."
        confirmLabel="Delete"
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}

function RowActions({ r, onAction }: { r: Appointment; onAction: (action: string, r: Appointment) => void }) {
  const s = r.status;
  const actions: Array<[string, string]> = [];
  if (s === 'SCHEDULED') actions.push(['confirm', 'Confirm']);
  if (s === 'SCHEDULED' || s === 'CONFIRMED') actions.push(['checkin', 'Check in']);
  if (s === 'CHECKED_IN') actions.push(['start', 'Start']);
  if (s === 'IN_PROGRESS') actions.push(['complete', 'Complete']);
  if (s === 'SCHEDULED' || s === 'CONFIRMED') actions.push(['noshow', 'No-show']);
  if (['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(s)) actions.push(['cancel', 'Cancel']);
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap">
      {actions.map(([key, label]) => (
        <Button key={key} size="small" variant="outlined" onClick={() => onAction(key, r)}>
          {label}
        </Button>
      ))}
    </Stack>
  );
}
