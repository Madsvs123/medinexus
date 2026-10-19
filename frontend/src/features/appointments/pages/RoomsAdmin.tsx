import { useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, MenuItem, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { PageHeader, DataTable, StatusChip, FormTextField, FormSelect, FormAutocomplete, EmptyState, ErrorAlert } from '../../../components/ui';
import { useCreateRoomMutation, useGetAppointmentDepartmentsQuery, useGetRoomsQuery, useUpdateRoomMutation } from '../api';
import type { Room } from '../types';
import { departmentName } from '../types';

const roomSchema = z.object({
  name: z.string().min(1, 'Room name required'),
  department: z.number({ invalid_type_error: 'Select a department' }),
  type: z.string().default('CONSULTATION'),
  status: z.string().default('AVAILABLE'),
});

type RoomValues = z.infer<typeof roomSchema>;

export default function RoomsAdmin() {
  const { enqueueSnackbar } = useSnackbar();
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading, error } = useGetRoomsQuery({ page_size: 100, status: statusFilter || undefined });
  const [createRoom, { isLoading: saving }] = useCreateRoomMutation();
  const [updateRoom] = useUpdateRoomMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const { data: departmentsData } = useGetAppointmentDepartmentsQuery({ page_size: 100 });
  const departments = useMemo(() => departmentsData?.results ?? [], [departmentsData]);

  const { control, handleSubmit, reset } = useForm<RoomValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: { name: '', department: undefined as unknown as number, type: 'CONSULTATION', status: 'AVAILABLE' },
  });

  const columns = useMemo(
    () => [
      { key: 'name', label: 'Room', render: (r: Room) => r.name },
      { key: 'department', label: 'Department', render: (r: Room) => departmentName(r.department) },
      { key: 'type', label: 'Type', render: (r: Room) => <StatusChip status={r.type} /> },
      { key: 'status', label: 'Status', render: (r: Room) => <StatusChip status={r.status} /> },
      {
        key: 'actions',
        label: '',
        render: (r: Room) => (
          <IconButton aria-label="Edit room" onClick={() => {
            setEditing(r);
            reset({
              name: r.name,
              department: typeof r.department === 'number' ? r.department : r.department.id,
              type: r.type,
              status: r.status,
            });
            setOpen(true);
          }}>
            <EditIcon />
          </IconButton>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [departments],
  );

  const onSave = handleSubmit(async (values: RoomValues) => {
    try {
      if (editing) {
        await updateRoom({ id: editing.id, body: values as unknown as Partial<Room> }).unwrap();
        enqueueSnackbar('Room updated', { variant: 'success' });
      } else {
        await createRoom(values as unknown as Partial<Room>).unwrap();
        enqueueSnackbar('Room created', { variant: 'success' });
      }
      setOpen(false);
      setEditing(null);
    } catch {
      enqueueSnackbar('Failed to save room', { variant: 'error' });
    }
  });

  return (
    <Box>
      <PageHeader
        title="Consultation rooms"
        subtitle="Manage rooms used for appointments"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); reset(); setOpen(true); }}>
            Add room
          </Button>
        }
      />
      <Box sx={{ width: 220, mb: 2 }}>
        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          fullWidth
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="AVAILABLE">Available</MenuItem>
          <MenuItem value="OCCUPIED">Occupied</MenuItem>
          <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
        </TextField>
      </Box>
      {error && <ErrorAlert error={error} />}
      <DataTable
        columns={columns}
        rows={data?.results ?? []}
        loading={isLoading}
        rowKey={(r) => String(r.id)}
        emptyState={<EmptyState icon={<MeetingRoomIcon />} title="No rooms" hint="Add a consultation or exam room." />}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit room' : 'Add room'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormTextField control={control} name="name" label="Room name" required />
            </Grid>
            <Grid item xs={12}>
              <FormAutocomplete
                control={control}
                name="department"
                label="Department"
                options={departments}
                getOptionLabel={(d) => d.name}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormSelect control={control} name="type" label="Type" options={['CONSULTATION', 'EXAM', 'PROCEDURE', 'EMERGENCY'].map((t) => ({ value: t, label: t }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormSelect control={control} name="status" label="Status" options={['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'].map((s) => ({ value: s, label: s }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={onSave} disabled={saving}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
