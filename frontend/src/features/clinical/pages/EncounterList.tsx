import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Link, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import NotesIcon from '@mui/icons-material/Notes';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { PageHeader, DataTable, StatusChip, FormAutocomplete, FormSelect, EmptyState, ErrorAlert } from '../../../components/ui';
import {
  useCreateEncounterMutation,
  useGetEncounterDepartmentsQuery,
  useGetEncountersQuery,
  useSearchEncounterDoctorsQuery,
  useSearchEncounterPatientsQuery,
} from '../api';
import type { Encounter } from '../types';
import { ENCOUNTER_STATUSES, ENCOUNTER_TYPES, patientLabel, userName, departmentName } from '../types';

const newEncounterSchema = z.object({
  patient: z.number({ invalid_type_error: 'Select a patient' }),
  doctor: z.number({ invalid_type_error: 'Select a doctor' }),
  department: z.number({ invalid_type_error: 'Select a department' }),
  type: z.string().default('OUTPATIENT'),
  chief_complaint: z.string().optional(),
});

type NewEncounterValues = z.infer<typeof newEncounterSchema>;

export default function EncounterList() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [open, setOpen] = useState(false);

  const { data, isLoading, isFetching, error } = useGetEncountersQuery({
    page,
    page_size: pageSize,
    status: status || undefined,
    date: date || undefined,
  });
  const [createEncounter, { isLoading: creating }] = useCreateEncounterMutation();

  const { data: patientsData } = useSearchEncounterPatientsQuery({ page_size: 100 });
  const { data: doctorsData } = useSearchEncounterDoctorsQuery({ role: 'DOCTOR', page_size: 100 });
  const { data: departmentsData } = useGetEncounterDepartmentsQuery({ page_size: 100 });
  const patients = useMemo(() => patientsData?.results ?? [], [patientsData]);
  const doctors = useMemo(() => doctorsData?.results ?? [], [doctorsData]);
  const departments = useMemo(() => departmentsData?.results ?? [], [departmentsData]);

  const { control, handleSubmit, reset } = useForm<NewEncounterValues>({
    resolver: zodResolver(newEncounterSchema),
    defaultValues: {
      patient: undefined as unknown as number,
      doctor: undefined as unknown as number,
      department: undefined as unknown as number,
      type: 'OUTPATIENT',
      chief_complaint: '',
    },
  });

  const columns = useMemo(
    () => [
      { key: 'id', label: '#', render: (r: Encounter) => `E-${r.id}` },
      {
        key: 'patient',
        label: 'Patient',
        render: (r: Encounter) => (
          <Link component={RouterLink} to={`/patients/${typeof r.patient === 'number' ? r.patient : r.patient.id}`} underline="hover">
            {patientLabel(r.patient)}
          </Link>
        ),
      },
      { key: 'doctor', label: 'Doctor', render: (r: Encounter) => userName(r.doctor) },
      { key: 'department', label: 'Department', render: (r: Encounter) => departmentName(r.department) },
      { key: 'type', label: 'Type', render: (r: Encounter) => <StatusChip status={r.type} /> },
      {
        key: 'started',
        label: 'Started',
        render: (r: Encounter) => (
          <Box>
            <Typography variant="body2">{dayjs(r.started_at).format('DD MMM YYYY')}</Typography>
            <Typography variant="caption" color="text.secondary">{dayjs(r.started_at).format('HH:mm')}</Typography>
          </Box>
        ),
      },
      { key: 'complaint', label: 'Chief complaint', render: (r: Encounter) => r.chief_complaint || '—' },
      { key: 'status', label: 'Status', render: (r: Encounter) => <StatusChip status={r.status} /> },
    ],
    [],
  );

  const onCreate = handleSubmit(async (values: NewEncounterValues) => {
    try {
      const created = await createEncounter({
        patient: values.patient,
        doctor: values.doctor,
        department: values.department,
        type: values.type as Encounter['type'],
        chief_complaint: values.chief_complaint ?? '',
      }).unwrap();
      enqueueSnackbar('Encounter opened', { variant: 'success' });
      setOpen(false);
      reset();
      navigate(`/encounters/${created.id}`);
    } catch {
      enqueueSnackbar('Failed to create encounter', { variant: 'error' });
    }
  });

  return (
    <Box>
      <PageHeader
        title="Encounters"
        subtitle="Clinical visits and workspaces"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            New Encounter
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
            onChange={(e) => { setDate(e.target.value); setPage(1); }}
            fullWidth
          />
        </Box>
        <Box sx={{ width: 220 }}>
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            fullWidth
          >
            <MenuItem value="">All statuses</MenuItem>
            {ENCOUNTER_STATUSES.map((s) => (
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
        onPageSizeChange={(s: number) => { setPageSize(s); setPage(1); }}
        onRowClick={(r: Encounter) => navigate(`/encounters/${r.id}`)}
        emptyState={<EmptyState icon={<NotesIcon />} title="No encounters" hint="Open an encounter to start a clinical visit." />}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New encounter</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
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
                    onChange={(d) => field.onChange(d?.id ?? null)}
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
              <FormSelect control={control} name="type" label="Type" options={ENCOUNTER_TYPES.map((t) => ({ value: t, label: t }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={onCreate} disabled={creating}>Open encounter</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
