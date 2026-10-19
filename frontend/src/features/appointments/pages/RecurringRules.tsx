import { useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RepeatIcon from '@mui/icons-material/Repeat';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { PageHeader, DataTable, StatusChip, FormTextField, FormSelect, FormDatePicker, FormAutocomplete, ConfirmDialog, EmptyState, ErrorAlert } from '../../../components/ui';
import {
  useCreateRecurringRuleMutation,
  useDeleteRecurringRuleMutation,
  useGetAppointmentDepartmentsQuery,
  useGetRecurringRulesQuery,
  useSearchAppointmentDoctorsQuery,
  useSearchAppointmentPatientsQuery,
  useUpdateRecurringRuleMutation,
} from '../api';
import type { RecurringRule } from '../types';
import { WEEKDAYS, patientLabel, userName, departmentName } from '../types';

const ruleSchema = z.object({
  patient: z.number({ invalid_type_error: 'Select a patient' }),
  doctor: z.number({ invalid_type_error: 'Select a doctor' }),
  department: z.number({ invalid_type_error: 'Select a department' }),
  start_date: z.string().min(1, 'Start date required'),
  time: z.string().min(1, 'Time required'),
  duration_minutes: z.coerce.number().min(5, 'At least 5 minutes'),
  frequency: z.string().default('WEEKLY'),
  interval: z.coerce.number().min(1).default(1),
  weekday: z.number().nullable().optional(),
  end_date: z.string().nullable().optional(),
});

type RuleValues = z.infer<typeof ruleSchema>;

export default function RecurringRules() {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading, error } = useGetRecurringRulesQuery({ page_size: 100 });
  const [createRule, { isLoading: saving }] = useCreateRecurringRuleMutation();
  const [updateRule] = useUpdateRecurringRuleMutation();
  const [deleteRule] = useDeleteRecurringRuleMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRule | null>(null);
  const [toDelete, setToDelete] = useState<RecurringRule | null>(null);

  const { data: patientsData } = useSearchAppointmentPatientsQuery({ page_size: 100 });
  const { data: doctorsData } = useSearchAppointmentDoctorsQuery({ role: 'DOCTOR', page_size: 100 });
  const { data: departmentsData } = useGetAppointmentDepartmentsQuery({ page_size: 100 });
  const patients = useMemo(() => patientsData?.results ?? [], [patientsData]);
  const doctors = useMemo(() => doctorsData?.results ?? [], [doctorsData]);
  const departments = useMemo(() => departmentsData?.results ?? [], [departmentsData]);

  const { control, handleSubmit, watch, reset } = useForm<RuleValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      patient: undefined as unknown as number,
      doctor: undefined as unknown as number,
      department: undefined as unknown as number,
      start_date: dayjs().format('YYYY-MM-DD'),
      time: '09:00',
      duration_minutes: 30,
      frequency: 'WEEKLY',
      interval: 1,
      weekday: dayjs().day(),
      end_date: null,
    },
  });
  const frequency = watch('frequency');

  const columns = useMemo(
    () => [
      { key: 'patient', label: 'Patient', render: (r: RecurringRule) => patientLabel(r.patient) },
      { key: 'doctor', label: 'Doctor', render: (r: RecurringRule) => userName(r.doctor) },
      { key: 'department', label: 'Department', render: (r: RecurringRule) => departmentName(r.department) },
      {
        key: 'schedule',
        label: 'Schedule',
        render: (r: RecurringRule) =>
          `${r.frequency.toLowerCase()} every ${r.interval} • ${r.time} (${r.duration_minutes} min)${
            r.frequency === 'WEEKLY' && r.weekday !== null ? ` • ${WEEKDAYS[r.weekday]}` : ''
          }`,
      },
      { key: 'range', label: 'Range', render: (r: RecurringRule) => `${r.start_date} → ${r.end_date ?? 'open'}` },
      { key: 'status', label: 'Status', render: (r: RecurringRule) => <StatusChip status={r.is_active ? 'ACTIVE' : 'INACTIVE'} /> },
      {
        key: 'actions',
        label: '',
        render: (r: RecurringRule) => (
          <Stack direction="row" spacing={0.5}>
            <IconButton aria-label="Edit rule" onClick={() => openEditor(r)}><EditIcon /></IconButton>
            <IconButton aria-label="Delete rule" color="error" onClick={() => setToDelete(r)}><DeleteIcon /></IconButton>
          </Stack>
        ),
      },
    ],
    [],
  );

  const openEditor = (r: RecurringRule) => {
    setEditing(r);
    reset({
      patient: typeof r.patient === 'number' ? r.patient : r.patient.id,
      doctor: typeof r.doctor === 'number' ? r.doctor : r.doctor.id,
      department: typeof r.department === 'number' ? r.department : r.department.id,
      start_date: r.start_date,
      time: r.time,
      duration_minutes: r.duration_minutes,
      frequency: r.frequency,
      interval: r.interval,
      weekday: r.weekday,
      end_date: r.end_date,
    });
    setOpen(true);
  };

  const onSave = handleSubmit(async (values: RuleValues) => {
    const body: Partial<RecurringRule> = {
      ...(values as unknown as Partial<RecurringRule>),
      weekday: values.frequency === 'WEEKLY' ? values.weekday : null,
      end_date: values.end_date || null,
    };
    try {
      if (editing) {
        await updateRule({ id: editing.id, body }).unwrap();
        enqueueSnackbar('Rule updated', { variant: 'success' });
      } else {
        await createRule(body).unwrap();
        enqueueSnackbar('Recurring rule created — appointments generated', { variant: 'success' });
      }
      setOpen(false);
      setEditing(null);
    } catch {
      enqueueSnackbar('Failed to save rule', { variant: 'error' });
    }
  });

  const doDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteRule(toDelete.id).unwrap();
      enqueueSnackbar('Rule deleted', { variant: 'success' });
      setToDelete(null);
    } catch {
      enqueueSnackbar('Failed to delete rule', { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader
        title="Recurring rules"
        subtitle="Auto-generate repeating appointments"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); reset(); setOpen(true); }}>
            New rule
          </Button>
        }
      />
      {error && <ErrorAlert error={error} />}
      <DataTable
        columns={columns}
        rows={data?.results ?? []}
        loading={isLoading}
        rowKey={(r) => String(r.id)}
        emptyState={<EmptyState icon={<RepeatIcon />} title="No recurring rules" hint="Create a rule to auto-schedule follow-ups." />}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit rule' : 'New recurring rule'}</DialogTitle>
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
              <FormDatePicker control={control} name="start_date" label="Start date" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="time" label="Time (HH:mm)" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="duration_minutes" label="Duration (minutes)" type="number" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormSelect control={control} name="frequency" label="Frequency" options={['DAILY', 'WEEKLY', 'MONTHLY'].map((f) => ({ value: f, label: f }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="interval" label="Interval" type="number" helperText="Every N periods" />
            </Grid>
            {frequency === 'WEEKLY' && (
              <Grid item xs={12} sm={6}>
                <FormSelect control={control} name="weekday" label="Weekday" options={WEEKDAYS.map((w, i) => ({ value: i, label: w }))} />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <FormDatePicker control={control} name="end_date" label="End date (optional)" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={onSave} disabled={saving}>Save rule</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={!!toDelete}
        title="Delete recurring rule?"
        message="Existing generated appointments are kept, but no new ones will be created."
        confirmLabel="Delete"
        onConfirm={doDelete}
        onCancel={() => setToDelete(null)}
      />
    </Box>
  );
}
