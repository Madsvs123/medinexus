import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Stack, Typography, Chip, Card, CardContent, Divider } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { PageHeader, FormTextField, FormSelect, FormDatePicker, FormAutocomplete, LoadingOverlay, EmptyState } from '../../../components/ui';
import { useCreateAdmissionMutation, useGetInpatientRoomsQuery, useGetWardsQuery, useSearchAdmissionPatientsQuery } from '../api';
import type { AdmissionType, Bed, InpatientRoom } from '../types';
import { bedLabel } from '../types';

const admissionSchema = z.object({
  patient: z.number({ invalid_type_error: 'Select a patient' }),
  admission_type: z.string().default('EMERGENCY'),
  expected_discharge_date: z.string().nullable().optional(),
  diagnosis_on_admission: z.string().optional(),
});

type AdmissionValues = z.infer<typeof admissionSchema>;

export default function AdmissionForm() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);

  const { data: roomsData, isLoading: roomsLoading } = useGetInpatientRoomsQuery({ page_size: 200 });
  const { data: patientsData } = useSearchAdmissionPatientsQuery({ page_size: 100 });
  const { data: wardsData } = useGetWardsQuery({ page_size: 100 });
  const [createAdmission, { isLoading: saving }] = useCreateAdmissionMutation();

  const rooms = useMemo(() => roomsData?.results ?? [], [roomsData]);
  const patients = useMemo(() => patientsData?.results ?? [], [patientsData]);
  const wards = useMemo(() => wardsData?.results ?? [], [wardsData]);

  // Group rooms by ward for display
  const roomsByWard = useMemo(() => {
    const map = new Map<number, { wardName: string; rooms: InpatientRoom[] }>();
    rooms.forEach((r) => {
      const wardId = typeof r.ward === 'number' ? r.ward : r.ward.id;
      const wardName = typeof r.ward === 'number' ? `Ward #${wardId}` : r.ward.name;
      if (!map.has(wardId)) map.set(wardId, { wardName, rooms: [] });
      map.get(wardId)?.rooms.push(r);
    });
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
  }, [rooms]);

  const availableBeds = useMemo(
    () => rooms.flatMap((r) => (r.beds ?? []).filter((b) => b.status === 'AVAILABLE')),
    [rooms],
  );

  const { control, handleSubmit, reset } = useForm<AdmissionValues>({
    resolver: zodResolver(admissionSchema),
    defaultValues: {
      patient: undefined as unknown as number,
      admission_type: 'EMERGENCY',
      expected_discharge_date: null,
      diagnosis_on_admission: '',
    },
  });

  const onSubmit = handleSubmit(async (values: AdmissionValues) => {
    if (!selectedBed) {
      enqueueSnackbar('Select a bed', { variant: 'warning' });
      return;
    }
    try {
      const created = await createAdmission({
        patient: values.patient,
        bed: selectedBed.id,
        admission_type: values.admission_type as AdmissionType,
        expected_discharge_date: values.expected_discharge_date ? dayjs(values.expected_discharge_date as string).format('YYYY-MM-DD') : null,
        diagnosis_on_admission: values.diagnosis_on_admission ?? '',
      }).unwrap();
      enqueueSnackbar('Patient admitted', { variant: 'success' });
      reset();
      navigate(`/inpatient/admissions/${created.id}`);
    } catch {
      enqueueSnackbar('Failed to create admission', { variant: 'error' });
    }
  });

  return (
    <Box>
      <PageHeader title="New admission" subtitle="Assign a patient to an available bed" />
      <Paper sx={{ p: 3, maxWidth: 1000 }}>
        <form onSubmit={onSubmit} noValidate>
          <Stack spacing={2}>
            <Controller
              control={control}
              name="patient"
              render={({ field, fieldState }) => (
                <FormAutocomplete
                  label="Patient"
                  options={patients}
                  getOptionLabel={(p) => `${p.full_name ?? `${p.first_name} ${p.last_name}`} (${p.mrn})`}
                  value={patients.find((p) => p.id === field.value) ?? null}
                  onChange={(p) => field.onChange(p?.id ?? null)}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  required
                />
              )}
            />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormSelect
                control={control}
                name="admission_type"
                label="Admission type"
                options={['EMERGENCY', 'ELECTIVE', 'TRANSFER'].map((t) => ({ value: t, label: t }))}
                sx={{ flexGrow: 1 }}
              />
              <FormDatePicker control={control} name="expected_discharge_date" label="Expected discharge (optional)" />
            </Stack>
            <FormTextField control={control} name="diagnosis_on_admission" label="Diagnosis on admission" multiline minRows={2} />
          </Stack>

          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Select bed</Typography>
          {roomsLoading ? (
            <LoadingOverlay open />
          ) : availableBeds.length === 0 ? (
            <EmptyState title="No available beds" hint="Free a bed or mark one available in Bed Admin first." />
          ) : (
            <Stack spacing={1.5} sx={{ maxHeight: 420, overflow: 'auto' }}>
              {roomsByWard.map(({ id, wardName, rooms: wardRooms }) => {
                const beds = wardRooms.flatMap((r) => (r.beds ?? []).filter((b) => b.status === 'AVAILABLE'));
                if (beds.length === 0) return null;
                return (
                  <Card key={id} variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{wardName}</Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                        {wardRooms.map((r) => {
                          const roomBeds = (r.beds ?? []).filter((b) => b.status === 'AVAILABLE');
                          if (roomBeds.length === 0) return null;
                          return (
                            <Box key={r.id}>
                              <Divider sx={{ mb: 0.5 }} />
                              <Typography variant="caption" color="text.secondary">{r.room_number} ({r.room_type})</Typography>
                              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                {roomBeds.map((b) => {
                                  const selected = selectedBed?.id === b.id;
                                  return (
                                    <Chip
                                      key={b.id}
                                      label={b.bed_number}
                                      color={selected ? 'primary' : 'default'}
                                      variant={selected ? 'filled' : 'outlined'}
                                      onClick={() => setSelectedBed(b)}
                                      sx={{ cursor: 'pointer' }}
                                    />
                                  );
                                })}
                              </Stack>
                            </Box>
                          );
                        })}
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
          {selectedBed && (
            <Typography variant="body2" sx={{ mt: 2 }}>
              Selected: <strong>{bedLabel(selectedBed)}</strong> {wards.length === 0 ? '' : ''}
            </Typography>
          )}
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button type="submit" variant="contained" disabled={saving}>Admit patient</Button>
            <Button variant="outlined" onClick={() => navigate('/inpatient/admissions')}>Cancel</Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
