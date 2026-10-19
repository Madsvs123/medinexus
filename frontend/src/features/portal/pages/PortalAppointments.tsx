import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import EventIcon from '@mui/icons-material/Event';
import AddIcon from '@mui/icons-material/Add';
import { useSnackbar } from 'notistack';
import { PageHeader, DataTable, StatusChip, EmptyState } from '../../../components/ui';
import { formatDateTime } from '../../../utils/format';
import {
  useGetPortalAppointmentsQuery,
  useBookPortalAppointmentMutation,
  useCancelPortalAppointmentMutation,
  useGetPortalDoctorsQuery,
  useGetPortalAvailabilityQuery,
} from '../api';
import { doctorName, type PortalAppointment } from '../types';

function getErr(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = (e as { data?: unknown }).data as Record<string, unknown> | undefined;
    if (data?.detail) return String(data.detail);
    const first = Object.values(data ?? {}).find((v) => v !== undefined && v !== null);
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return 'Something went wrong. Please try again.';
}

export default function PortalAppointments() {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading, error } = useGetPortalAppointmentsQuery();
  const [bookOpen, setBookOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<PortalAppointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancel] = useCancelPortalAppointmentMutation();

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancel({ id: cancelTarget.id, reason: cancelReason || 'Cancelled by patient' }).unwrap();
      enqueueSnackbar('Appointment cancelled', { variant: 'success' });
      setCancelTarget(null);
      setCancelReason('');
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const columns = useMemo(
    () => [
      { key: 'when', label: 'When', render: (r: PortalAppointment) => formatDateTime(r.start) },
      { key: 'doctor', label: 'Doctor', render: (r: PortalAppointment) => doctorName(r.doctor) },
      { key: 'type', label: 'Type', render: (r: PortalAppointment) => r.type },
      { key: 'status', label: 'Status', render: (r: PortalAppointment) => <StatusChip status={r.status} /> },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right' as const,
        render: (r: PortalAppointment) =>
          ['SCHEDULED', 'CONFIRMED'].includes(r.status) ? (
            <Button size="small" color="error" variant="outlined" onClick={() => { setCancelTarget(r); setCancelReason(''); }}>
              Cancel
            </Button>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <Box>
      <PageHeader
        title="My appointments"
        subtitle="Upcoming visits"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setBookOpen(true)}>
            Book appointment
          </Button>
        }
      />
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Chip label={getErr(error)} color="error" sx={{ mb: 2 }} />}

      {!isLoading && (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<EventIcon />}
          title="No upcoming appointments"
          hint="Book a visit with a doctor."
          action={
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setBookOpen(true)}>
              Book appointment
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={data ?? []} loading={isLoading} rowKey={(r) => String(r.id)} />
      )}

      {bookOpen && <BookDialog open onClose={() => setBookOpen(false)} />}

      <Dialog open={cancelTarget !== null} onClose={() => setCancelTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Cancel appointment?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {cancelTarget ? formatDateTime(cancelTarget.start) : ''} with Dr. {cancelTarget ? doctorName(cancelTarget.doctor) : ''}
          </Typography>
          <TextField
            label="Reason (optional)"
            fullWidth
            size="small"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)}>Keep appointment</Button>
          <Button color="error" variant="contained" onClick={() => void handleCancel()}>
            Cancel appointment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function BookDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data: doctors } = useGetPortalDoctorsQuery();
  const [doctorId, setDoctorId] = useState<number | ''>('');
  const [date, setDate] = useState<string>(dayjs().add(1, 'day').format('YYYY-MM-DD'));
  const [slot, setSlot] = useState('');
  const [reason, setReason] = useState('');

  const { data: availability, isFetching: availabilityLoading } = useGetPortalAvailabilityQuery(
    { doctor: Number(doctorId), date },
    { skip: !doctorId },
  );
  const slots = useMemo(() => availability?.slots ?? [], [availability]);

  useEffect(() => {
    setSlot('');
  }, [doctorId, date]);

  const [book] = useBookPortalAppointmentMutation();

  const handleBook = async () => {
    if (!doctorId || !slot) return;
    const [start, end] = slot.split('|');
    try {
      await book({ doctor: Number(doctorId), start, end, reason: reason || undefined }).unwrap();
      enqueueSnackbar('Appointment booked', { variant: 'success' });
      onClose();
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Book appointment</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            select
            label="Doctor *"
            fullWidth
            size="small"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value ? Number(e.target.value) : '')}
          >
            <MenuItem value="">Select a doctor</MenuItem>
            {(doctors ?? []).map((d) => (
              <MenuItem key={d.id} value={d.id}>{doctorName(d)}</MenuItem>
            ))}
          </TextField>
          <DatePicker
            label="Date"
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
            value={dayjs(date)}
            minDate={dayjs()}
            onChange={(d) => d && setDate(d.format('YYYY-MM-DD'))}
          />
          <TextField
            select
            label="Time slot *"
            fullWidth
            size="small"
            value={slot}
            disabled={!doctorId}
            onChange={(e) => setSlot(e.target.value)}
            helperText={availabilityLoading ? 'Loading availability…' : !doctorId ? 'Select a doctor first' : undefined}
          >
            {slots.length === 0 && <MenuItem value="">No slots available</MenuItem>}
            {slots.map((s) => (
              <MenuItem key={s.start} value={`${s.start}|${s.end}`}>
                {dayjs(s.start).format('HH:mm')} – {dayjs(s.end).format('HH:mm')}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Reason (optional)"
            fullWidth
            size="small"
            multiline
            minRows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!doctorId || !slot} onClick={() => void handleBook()}>
          Book appointment
        </Button>
      </DialogActions>
    </Dialog>
  );
}
