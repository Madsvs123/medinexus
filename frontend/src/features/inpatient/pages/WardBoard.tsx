import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import { PageHeader, EmptyState, ErrorAlert } from '../../../components/ui';
import { useAssignBedMutation, useFreeBedMutation, useGetAdmissionsQuery, useGetInpatientRoomsQuery, useGetWardsQuery } from '../api';
import type { Bed } from '../types';
import { bedLabel, patientLabel } from '../types';

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: '#10B981',
  OCCUPIED: '#EF4444',
  MAINTENANCE: '#F59E0B',
};

export default function WardBoard() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data: roomsData, isLoading, error } = useGetInpatientRoomsQuery({ page_size: 200 });
  const { data: wardsData } = useGetWardsQuery({ page_size: 100 });
  const { data: admissionsData } = useGetAdmissionsQuery({ status: 'ACTIVE', page_size: 100 });
  const [assignBed] = useAssignBedMutation();
  const [freeBed] = useFreeBedMutation();
  const [assignTarget, setAssignTarget] = useState<Bed | null>(null);
  const [admissionId, setAdmissionId] = useState<number | null>(null);

  const rooms = useMemo(() => roomsData?.results ?? [], [roomsData]);
  const wards = useMemo(() => wardsData?.results ?? [], [wardsData]);
  const admissions = useMemo(() => admissionsData?.results ?? [], [admissionsData]);

  const roomsByWard = useMemo(() => {
    const map = new Map<number, { wardName: string; rooms: typeof rooms }>();
    rooms.forEach((r) => {
      const wardId = typeof r.ward === 'number' ? r.ward : r.ward.id;
      const wardName = typeof r.ward === 'number' ? `Ward #${wardId}` : r.ward.name;
      if (!map.has(wardId)) map.set(wardId, { wardName, rooms: [] });
      map.get(wardId)?.rooms.push(r);
    });
    // Sort by original ward list order when possible
    const wardOrder = new Map(wards.map((w, i) => [w.id, i]));
    return Array.from(map.entries())
      .sort((a, b) => (wardOrder.get(a[0]) ?? 999) - (wardOrder.get(b[0]) ?? 999))
      .map(([id, v]) => ({ id, ...v }));
  }, [rooms, wards]);

  const handleFree = async (bed: Bed) => {
    try {
      await freeBed(bed.id).unwrap();
      enqueueSnackbar(`Bed ${bedLabel(bed)} freed`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to free bed', { variant: 'error' });
    }
  };

  const doAssign = async () => {
    if (!assignTarget || !admissionId) return;
    try {
      await assignBed({ id: assignTarget.id, admission_id: admissionId }).unwrap();
      enqueueSnackbar(`Bed ${bedLabel(assignTarget)} assigned`, { variant: 'success' });
      setAssignTarget(null);
      setAdmissionId(null);
    } catch {
      enqueueSnackbar('Failed to assign bed', { variant: 'error' });
    }
  };

  if (error) return <ErrorAlert error={error} />;

  return (
    <Box>
      <PageHeader title="Ward board" subtitle="Live bed occupancy — click a bed to assign or free it" />
      {isLoading ? (
        <EmptyState title="Loading board…" hint="" />
      ) : roomsByWard.length === 0 ? (
        <EmptyState title="No wards configured" hint="Set up wards, rooms and beds in Bed Admin." />
      ) : (
        <Stack spacing={2}>
          {roomsByWard.map(({ id, wardName, rooms: wardRooms }) => (
            <Card key={id} variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>{wardName}</Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  {wardRooms.map((r) => (
                    <Box key={r.id} sx={{ minWidth: 200, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                      <Typography variant="subtitle2">{r.room_number} <span style={{ fontWeight: 400, color: 'text.secondary' }}>({r.room_type})</span></Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                        {(r.beds ?? []).map((b) => (
                          <Chip
                            key={b.id}
                            label={b.bed_number}
                            sx={{
                              bgcolor: STATUS_COLORS[b.status],
                              color: '#fff',
                              fontWeight: 600,
                              cursor: b.status === 'AVAILABLE' || b.status === 'OCCUPIED' ? 'pointer' : 'default',
                              '&:hover': { opacity: 0.9 },
                            }}
                            onClick={() => {
                              if (b.status === 'AVAILABLE') setAssignTarget(b);
                              else if (b.status === 'OCCUPIED') handleFree(b);
                            }}
                            title={b.status === 'AVAILABLE' ? 'Click to assign' : b.status === 'OCCUPIED' ? 'Click to free' : 'Under maintenance'}
                          />
                        ))}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
      <Dialog open={!!assignTarget} onClose={() => setAssignTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Assign bed {assignTarget ? bedLabel(assignTarget) : ''}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
            Select an active admission to place in this bed. Or{' '}
            <Button size="small" onClick={() => navigate('/inpatient/admissions/new')}>create a new admission</Button>.
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {admissions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No active admissions.</Typography>
            ) : (
              admissions.map((a) => (
                <Chip
                  key={a.id}
                  label={`A-${a.id} — ${patientLabel(a.patient)}`}
                  color={admissionId === a.id ? 'primary' : 'default'}
                  variant={admissionId === a.id ? 'filled' : 'outlined'}
                  onClick={() => setAdmissionId(a.id)}
                  sx={{ cursor: 'pointer' }}
                />
              ))
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAssignTarget(null); setAdmissionId(null); }}>Cancel</Button>
          <Button variant="contained" onClick={doAssign} disabled={!admissionId}>Assign</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
