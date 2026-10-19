import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Chip, Grid, Paper, Stack, Typography } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import {
  PageHeader,
  FormTextField,
  FormSelect,
  FormDatePicker,
  FormAutocomplete,
  LoadingOverlay,
  EmptyState,
} from '../../../components/ui';
import {
  useCreateAppointmentMutation,
  useGetAppointmentQuery,
  useGetAppointmentDepartmentsQuery,
  useGetAvailabilitySlotsQuery,
  useGetRoomsQuery,
  useSearchAppointmentDoctorsQuery,
  useSearchAppointmentPatientsQuery,
  useUpdateAppointmentMutation,
} from '../api';
import type { Appointment } from '../types';
import { APPOINTMENT_TYPES } from '../types';

const bookingSchema = z.object({
  patient: z.number({ invalid_type_error: 'Select a patient' }),
  doctor: z.number({ invalid_type_error: 'Select a doctor' }),
  department: z.number({ invalid_type_error: 'Select a department' }),
  date: z.string().min(1, 'Pick a date'),
  start: z.string().min(1, 'Pick a start time'),
  end: z.string().min(1, 'Pick an end time'),
  room: z.number().nullable().optional(),
  type: z.string().default('CONSULTATION'),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

type BookingValues = z.infer<typeof bookingSchema>;

export default function BookingForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();

  const { data: existing, isLoading: loadingExisting } = useGetAppointmentQuery(Number(id), { skip: !isEdit });
  const [createAppointment, { isLoading: saving }] = useCreateAppointmentMutation();
  const [updateAppointment] = useUpdateAppointmentMutation();

  const { data: patientsData } = useSearchAppointmentPatientsQuery({ page_size: 100 });
  const { data: doctorsData } = useSearchAppointmentDoctorsQuery({ role: 'DOCTOR', page_size: 100 });
  const { data: departmentsData } = useGetAppointmentDepartmentsQuery({ page_size: 100 });
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(searchParams.get('date') ?? dayjs().format('YYYY-MM-DD'));

  const { control, handleSubmit, watch, reset, setValue } = useForm<BookingValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      patient: undefined as unknown as number,
      doctor: undefined as unknown as number,
      department: undefined as unknown as number,
      date: searchParams.get('date') ?? dayjs().format('YYYY-MM-DD'),
      start: '',
      end: '',
      room: null,
      type: 'CONSULTATION',
      reason: '',
      notes: '',
    },
  });

  const watchedDoctor = watch('doctor');
  const watchedDepartment = watch('department');
  const watchedDate = watch('date');

  useEffect(() => {
    if (isEdit && existing) {
      reset({
        patient: typeof existing.patient === 'number' ? existing.patient : existing.patient.id,
        doctor: typeof existing.doctor === 'number' ? existing.doctor : existing.doctor.id,
        department: typeof existing.department === 'number' ? existing.department : existing.department.id,
        date: dayjs(existing.start).format('YYYY-MM-DD'),
        start: dayjs(existing.start).format('HH:mm'),
        end: dayjs(existing.end).format('HH:mm'),
        room: typeof existing.room === 'number' ? existing.room : existing.room?.id ?? null,
        type: existing.type,
        reason: existing.reason ?? '',
        notes: existing.notes ?? '',
      });
      setSelectedDoctor(typeof existing.doctor === 'number' ? existing.doctor : existing.doctor.id);
      setSelectedDate(dayjs(existing.start).format('YYYY-MM-DD'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, existing]);

  const { data: slotsData, isFetching: slotsLoading } = useGetAvailabilitySlotsQuery(
    { doctor: watchedDoctor || selectedDoctor || undefined, date: watchedDate || selectedDate || undefined },
    { skip: !watchedDoctor && !selectedDoctor },
  );

  const { data: roomsData } = useGetRoomsQuery({ page_size: 100, status: 'AVAILABLE' });

  const patients = useMemo(() => patientsData?.results ?? [], [patientsData]);
  const doctors = useMemo(() => doctorsData?.results ?? [], [doctorsData]);
  const departments = useMemo(() => departmentsData?.results ?? [], [departmentsData]);
  const slots = useMemo(() => slotsData?.slots ?? [], [slotsData]);
  const rooms = useMemo(() => roomsData?.results ?? [], [roomsData]);

  const onSubmit = async (values: BookingValues) => {
    const payload: Partial<Appointment> = {
      patient: values.patient,
      doctor: values.doctor,
      department: values.department,
      room: values.room ?? null,
      type: values.type as Appointment['type'],
      reason: values.reason ?? '',
      notes: values.notes ?? '',
      start: dayjs(`${values.date}T${values.start}`).toISOString(),
      end: dayjs(`${values.date}T${values.end}`).toISOString(),
    };
    try {
      if (isEdit) {
        await updateAppointment({ id: Number(id), body: payload }).unwrap();
        enqueueSnackbar('Appointment updated', { variant: 'success' });
      } else {
        await createAppointment(payload).unwrap();
        enqueueSnackbar('Appointment booked', { variant: 'success' });
      }
      navigate('/appointments');
    } catch (e) {
      const err = e as { data?: { detail?: string } };
      enqueueSnackbar(err.data?.detail ?? 'Booking failed — check for conflicts', { variant: 'error' });
    }
  };

  const pickSlot = (start: string) => {
    setValue('start', start);
    setValue('end', dayjs(`${watchedDate}T${start}`).add(30, 'minute').format('HH:mm'));
  };

  if (loadingExisting) return <LoadingOverlay open />;

  return (
    <Box>
      <PageHeader title={isEdit ? 'Edit appointment' : 'Book appointment'} subtitle="Pick patient, doctor and an available slot" />
      <Paper sx={{ p: 3, maxWidth: 860 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
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
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                control={control}
                name="doctor"
                render={({ field, fieldState }) => (
                  <FormAutocomplete
                    label="Doctor"
                    options={doctors}
                    getOptionLabel={(d) => `${d.first_name} ${d.last_name}`}
                    value={doctors.find((d) => d.id === field.value) ?? null}
                    onChange={(d) => {
                      field.onChange(d?.id ?? null);
                      setSelectedDoctor(d?.id ?? null);
                    }}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    required
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                control={control}
                name="department"
                render={({ field, fieldState }) => (
                  <FormAutocomplete
                    label="Department"
                    options={departments}
                    getOptionLabel={(d) => d.name}
                    value={departments.find((d) => d.id === field.value) ?? null}
                    onChange={(d) => field.onChange(d?.id ?? null)}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    required
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormDatePicker control={control} name="date" label="Date" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormSelect
                control={control}
                name="type"
                label="Appointment type"
                options={APPOINTMENT_TYPES.map((t) => ({ value: t, label: t }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                control={control}
                name="room"
                render={({ field }) => (
                  <FormAutocomplete
                    label="Room (optional)"
                    options={rooms}
                    getOptionLabel={(r) => `${r.name} (${r.type})`}
                    value={rooms.find((r) => r.id === field.value) ?? null}
                    onChange={(r) => field.onChange(r?.id ?? null)}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <FormTextField control={control} name="reason" label="Reason" />
            </Grid>
            <Grid item xs={12}>
              <FormTextField control={control} name="notes" label="Notes" multiline minRows={2} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Available slots {slotsLoading ? '(loading…)' : `for ${watchedDate}`}
              </Typography>
              {!watchedDoctor ? (
                <EmptyState title="Select a doctor first" hint="Availability slots are generated from the doctor's schedule." />
              ) : slots.length === 0 ? (
                <Alert severity="info" role="alert">No available slots for this doctor on {watchedDate}.</Alert>
              ) : (
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {slots.map((s) => {
                    const t = dayjs(s.start).format('HH:mm');
                    const taken = watch('start') === t;
                    return (
                      <Chip
                        key={s.start}
                        label={t}
                        color={taken ? 'primary' : 'default'}
                        onClick={() => pickSlot(t)}
                        sx={{ cursor: 'pointer' }}
                      />
                    );
                  })}
                </Stack>
              )}
              {slots.length > 0 && (
                <Alert severity="warning" role="alert" sx={{ mt: 2 }}>
                  Booking a slot not listed above may fail — the server rejects overlapping appointments.
                </Alert>
              )}
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button type="submit" variant="contained" disabled={saving}>
              {isEdit ? 'Save changes' : 'Book appointment'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/appointments')}>Cancel</Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
