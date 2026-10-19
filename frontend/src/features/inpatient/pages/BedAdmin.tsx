import { useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import HotelIcon from '@mui/icons-material/Hotel';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { PageHeader, DataTable, StatusChip, FormTextField, FormSelect, FormAutocomplete, EmptyState, ErrorAlert } from '../../../components/ui';
import { useCreateBedMutation, useCreateInpatientRoomMutation, useCreateWardMutation, useGetBedsQuery, useGetInpatientRoomsQuery, useGetWardsQuery, useMaintenanceBedMutation, useUpdateBedMutation, useUpdateInpatientRoomMutation, useUpdateWardMutation } from '../api';
import type { Bed, InpatientRoom, Ward } from '../types';
import { BED_STATUSES, wardName } from '../types';

const bedSchema = z.object({
  bed_number: z.string().min(1, 'Bed number required'),
  status: z.string().default('AVAILABLE'),
  notes: z.string().optional(),
});

type BedValues = z.infer<typeof bedSchema>;

const wardSchema = z.object({
  name: z.string().min(1, 'Ward name required'),
  location: z.string().optional(),
  is_active: z.boolean().default(true),
});

const roomSchema = z.object({
  ward: z.number({ invalid_type_error: 'Select a ward' }),
  room_number: z.string().min(1, 'Room number required'),
  room_type: z.string().default('GENERAL'),
  is_active: z.boolean().default(true),
});

type RoomValues = z.infer<typeof roomSchema>;

export default function BedAdmin() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: bedsData, isLoading, error } = useGetBedsQuery({ page_size: 200 });
  const { data: roomsData } = useGetInpatientRoomsQuery({ page_size: 200 });
  const { data: wardsData } = useGetWardsQuery({ page_size: 100 });
  const [createBed, { isLoading: savingBed }] = useCreateBedMutation();
  const [updateBed] = useUpdateBedMutation();
  const [maintenanceBed] = useMaintenanceBedMutation();
  const [createRoom] = useCreateInpatientRoomMutation();
  const [updateRoom] = useUpdateInpatientRoomMutation();
  const [createWard, { isLoading: savingWard }] = useCreateWardMutation();
  const [updateWard] = useUpdateWardMutation();

  const [bedDialog, setBedDialog] = useState(false);
  const [editingBed, setEditingBed] = useState<Bed | null>(null);
  const [roomDialog, setRoomDialog] = useState(false);
  const [editingRoom, setEditingRoom] = useState<InpatientRoom | null>(null);
  const [wardDialog, setWardDialog] = useState(false);
  const [editingWard, setEditingWard] = useState<Ward | null>(null);

  const beds = useMemo(() => bedsData?.results ?? [], [bedsData]);
  const rooms = useMemo(() => roomsData?.results ?? [], [roomsData]);
  const wards = useMemo(() => wardsData?.results ?? [], [wardsData]);

  const bedForm = useForm<BedValues>({
    resolver: zodResolver(bedSchema),
    defaultValues: { bed_number: '', status: 'AVAILABLE', notes: '' },
  });
  const roomForm = useForm<RoomValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: { ward: undefined as unknown as number, room_number: '', room_type: 'GENERAL', is_active: true },
  });
  const wardForm = useForm({
    resolver: zodResolver(wardSchema),
    defaultValues: { name: '', location: '', is_active: true },
  });

  const columns = useMemo(
    () => [
      { key: 'bed', label: 'Bed', render: (r: Bed) => r.bed_number },
      { key: 'room', label: 'Room', render: (r: Bed) => (typeof r.room === 'object' ? r.room.room_number : `Room #${r.room}`) },
      { key: 'ward', label: 'Ward', render: (r: Bed) => (typeof r.room === 'object' ? wardName(r.room.ward) : '—') },
      { key: 'status', label: 'Status', render: (r: Bed) => <StatusChip status={r.status} /> },
      {
        key: 'actions',
        label: '',
        render: (r: Bed) => (
          <Stack direction="row" spacing={0.5}>
            <IconButton
              aria-label="Edit bed"
              onClick={() => {
                setEditingBed(r);
                bedForm.reset({ bed_number: r.bed_number, status: r.status, notes: r.notes ?? '' });
                setBedDialog(true);
              }}
            >
              <EditIcon />
            </IconButton>
            {r.status !== 'MAINTENANCE' && (
              <Button
                size="small"
                variant="outlined"
                color="warning"
                onClick={async () => {
                  await maintenanceBed(r.id).unwrap();
                  enqueueSnackbar('Bed marked for maintenance', { variant: 'success' });
                }}
              >
                Maintenance
              </Button>
            )}
          </Stack>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rooms],
  );

  const saveBed = bedForm.handleSubmit(async (values: BedValues) => {
    try {
      if (editingBed) {
        await updateBed({ id: editingBed.id, body: values as never }).unwrap();
        enqueueSnackbar('Bed updated', { variant: 'success' });
      } else {
        await createBed(values as never).unwrap();
        enqueueSnackbar('Bed created', { variant: 'success' });
      }
      setBedDialog(false);
      setEditingBed(null);
      bedForm.reset();
    } catch {
      enqueueSnackbar('Failed to save bed', { variant: 'error' });
    }
  });

  const saveRoom = roomForm.handleSubmit(async (values: RoomValues) => {
    try {
      if (editingRoom) {
        await updateRoom({ id: editingRoom.id, body: values as never }).unwrap();
        enqueueSnackbar('Room updated', { variant: 'success' });
      } else {
        await createRoom(values as never).unwrap();
        enqueueSnackbar('Room created', { variant: 'success' });
      }
      setRoomDialog(false);
      setEditingRoom(null);
      roomForm.reset();
    } catch {
      enqueueSnackbar('Failed to save room', { variant: 'error' });
    }
  });

  const saveWard = wardForm.handleSubmit(async (values) => {
    try {
      if (editingWard) {
        await updateWard({ id: editingWard.id, body: values }).unwrap();
        enqueueSnackbar('Ward updated', { variant: 'success' });
      } else {
        await createWard(values).unwrap();
        enqueueSnackbar('Ward created', { variant: 'success' });
      }
      setWardDialog(false);
      setEditingWard(null);
      wardForm.reset();
    } catch {
      enqueueSnackbar('Failed to save ward', { variant: 'error' });
    }
  });

  return (
    <Box>
      <PageHeader
        title="Bed administration"
        subtitle="Manage wards, rooms and beds"
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => { setEditingWard(null); wardForm.reset(); setWardDialog(true); }}>Ward</Button>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => { setEditingRoom(null); roomForm.reset(); setRoomDialog(true); }}>Room</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingBed(null); bedForm.reset(); setBedDialog(true); }}>Bed</Button>
          </Stack>
        }
      />
      {error && <ErrorAlert error={error} />}
      <DataTable
        columns={columns}
        rows={beds}
        loading={isLoading}
        rowKey={(r) => String(r.id)}
        emptyState={<EmptyState icon={<HotelIcon />} title="No beds" hint="Add a bed to a room to start." />}
      />
      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Rooms & wards</Typography>
      <Grid container spacing={2}>
        {wards.map((w) => (
          <Grid item xs={12} md={6} lg={4} key={w.id}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{w.name}</Typography>
                  <IconButton
                    aria-label="Edit ward"
                    size="small"
                    onClick={() => {
                      setEditingWard(w);
                      wardForm.reset({ name: w.name, location: w.location ?? '', is_active: w.is_active });
                      setWardDialog(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                </Stack>
                <Typography variant="caption" color="text.secondary">{w.location || 'No location'}</Typography>
                {rooms.filter((r) => (typeof r.ward === 'number' ? r.ward : r.ward.id) === w.id).map((r) => (
                  <Stack key={r.id} direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                    <Typography variant="body2">{r.room_number} ({r.room_type})</Typography>
                    <IconButton
                      aria-label="Edit room"
                      size="small"
                      onClick={() => {
                        setEditingRoom(r);
                        roomForm.reset({ ward: typeof r.ward === 'number' ? r.ward : r.ward.id, room_number: r.room_number, room_type: r.room_type, is_active: r.is_active });
                        setRoomDialog(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <Typography variant="caption" color="text.secondary">
                      {(r.beds ?? []).map((b) => b.bed_number).join(', ') || 'no beds'}
                    </Typography>
                  </Stack>
                ))}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Bed dialog */}
      <Dialog open={bedDialog} onClose={() => setBedDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editingBed ? 'Edit bed' : 'Add bed'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormTextField control={bedForm.control} name="bed_number" label="Bed number" required />
            <FormSelect control={bedForm.control} name="status" label="Status" options={BED_STATUSES.map((s) => ({ value: s, label: s }))} />
            <FormTextField control={bedForm.control} name="notes" label="Notes" multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBedDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveBed} disabled={savingBed}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Room dialog */}
      <Dialog open={roomDialog} onClose={() => setRoomDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editingRoom ? 'Edit room' : 'Add room'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormAutocomplete
              control={roomForm.control}
              name="ward"
              label="Ward"
              options={wards}
              getOptionLabel={(w) => w.name}
              required
            />
            <FormTextField control={roomForm.control} name="room_number" label="Room number" required />
            <FormSelect control={roomForm.control} name="room_type" label="Room type" options={['PRIVATE', 'SEMI_PRIVATE', 'GENERAL', 'ICU'].map((t) => ({ value: t, label: t }))} />
            <TextField
              label="Active"
              select
              size="small"
              value={roomForm.watch('is_active') ? 'true' : 'false'}
              onChange={(e) => roomForm.setValue('is_active', e.target.value === 'true')}
            >
              <MenuItem value="true">Yes</MenuItem>
              <MenuItem value="false">No</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoomDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveRoom}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Ward dialog */}
      <Dialog open={wardDialog} onClose={() => setWardDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editingWard ? 'Edit ward' : 'Add ward'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormTextField control={wardForm.control} name="name" label="Ward name" required />
            <FormTextField control={wardForm.control} name="location" label="Location" />
            <TextField
              label="Active"
              select
              size="small"
              value={wardForm.watch('is_active') ? 'true' : 'false'}
              onChange={(e) => wardForm.setValue('is_active', e.target.value === 'true')}
            >
              <MenuItem value="true">Yes</MenuItem>
              <MenuItem value="false">No</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWardDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveWard} disabled={savingWard}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
