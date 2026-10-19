import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Pagination,
  TextField,
  Tooltip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSnackbar } from 'notistack';
import { PageHeader, DataTable, StatusChip, EmptyState, ConfirmDialog } from '../../../components/ui';
import {
  useGetPatientInsurancesQuery,
  useCreatePatientInsuranceMutation,
  useUpdatePatientInsuranceMutation,
  useDeletePatientInsuranceMutation,
  useGetInsurancePlansQuery,
} from '../api';
import { patientLabel, planName, type PatientInsurance } from '../types';
import PatientAutocomplete from '../components/PatientAutocomplete';
import { useDebouncedValue } from '../components/PatientAutocomplete';

const piSchema = z.object({
  patient: z.custom<{ id: number; label: string } | null>((v) => !!v && typeof v === 'object' && 'id' in v, 'Patient is required'),
  plan: z.coerce.number().min(1, 'Plan is required'),
  policy_number: z.string().min(1, 'Policy number is required'),
  coverage_percentage: z.coerce.number().min(0).max(100, 'Coverage must be 0-100'),
  valid_until: z.string().nullable().optional(),
  is_primary: z.boolean(),
});

type PiFormValues = z.infer<typeof piSchema>;

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

export default function PatientInsuranceList() {
  const [page, setPage] = useState(1);
  const [patientSearch, setPatientSearch] = useState('');
  const patientQ = useDebouncedValue(patientSearch);
  const { enqueueSnackbar } = useSnackbar();

  const params = useMemo(
    () => ({ page, page_size: 20, ...(patientQ ? { patient: patientQ } : {}) }),
    [page, patientQ],
  );
  const { data, isLoading, error } = useGetPatientInsurancesQuery(params);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PatientInsurance | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PatientInsurance | null>(null);

  const [deletePi] = useDeletePatientInsuranceMutation();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePi(deleteTarget.id).unwrap();
      enqueueSnackbar('Patient insurance removed', { variant: 'success' });
      setDeleteTarget(null);
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const columns = useMemo(
    () => [
      { key: 'patient', label: 'Patient', render: (r: PatientInsurance) => patientLabel(r.patient) },
      { key: 'plan', label: 'Plan', render: (r: PatientInsurance) => planName(r.plan) },
      { key: 'policy', label: 'Policy #', render: (r: PatientInsurance) => r.policy_number },
      {
        key: 'coverage',
        label: 'Coverage',
        align: 'right' as const,
        render: (r: PatientInsurance) => `${Number(r.coverage_percentage)}%`,
      },
      {
        key: 'valid',
        label: 'Valid until',
        render: (r: PatientInsurance) => (r.valid_until ? dayjs(r.valid_until).format('YYYY-MM-DD') : '—'),
      },
      {
        key: 'primary',
        label: 'Primary',
        render: (r: PatientInsurance) => (r.is_primary ? <Chip label="Primary" color="primary" size="small" /> : '—'),
      },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right' as const,
        render: (r: PatientInsurance) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Tooltip title="Edit">
              <IconButton
                aria-label="Edit"
                size="small"
                onClick={() => {
                  setEditing(r);
                  setDialogOpen(true);
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton aria-label="Delete" size="small" color="error" onClick={() => setDeleteTarget(r)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <Box>
      <PageHeader
        title="Patient insurance"
        subtitle="Enroll patients in insurance plans"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            Add insurance
          </Button>
        }
      />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Patient (name / MRN)"
            size="small"
            fullWidth
            value={patientSearch}
            onChange={(e) => {
              setPatientSearch(e.target.value);
              setPage(1);
            }}
          />
        </Grid>
      </Grid>

      {error && <Chip label={getErr(error)} color="error" sx={{ mb: 2 }} />}

      {!isLoading && (data?.results.length ?? 0) === 0 ? (
        <EmptyState
          icon={<HealthAndSafetyIcon />}
          title="No patient insurance records"
          hint="Add insurance to a patient to enable claims."
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              Add insurance
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={data?.results ?? []} loading={isLoading} rowKey={(r) => String(r.id)} />
      )}

      {(data?.count ?? 0) > 20 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination page={page} count={Math.ceil((data?.count ?? 0) / 20)} onChange={(_e, p) => setPage(p)} />
        </Box>
      )}

      {dialogOpen && (
        <PiDialog
          open
          record={editing}
          onClose={() => setDialogOpen(false)}
          onSaved={() => {
            setDialogOpen(false);
            enqueueSnackbar(editing ? 'Record updated' : 'Insurance added', { variant: 'success' });
          }}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove patient insurance?"
        message={deleteTarget ? `${patientLabel(deleteTarget.patient)} — ${planName(deleteTarget.plan)} will be removed.` : undefined}
        confirmLabel="Remove"
        severity="error"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}

function PiDialog({ open, record, onClose, onSaved }: { open: boolean; record: PatientInsurance | null; onClose: () => void; onSaved: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data: plansData } = useGetInsurancePlansQuery({ page_size: 200 });
  const plans = useMemo(() => plansData?.results ?? [], [plansData]);
  const [createPi] = useCreatePatientInsuranceMutation();
  const [updatePi] = useUpdatePatientInsuranceMutation();

  const { control, handleSubmit, formState } = useForm<PiFormValues>({
    resolver: zodResolver(piSchema),
    defaultValues: record
      ? {
          patient: typeof record.patient === 'object' ? { id: record.patient.id, label: patientLabel(record.patient) } : null,
          plan: typeof record.plan === 'object' ? record.plan.id : record.plan,
          policy_number: record.policy_number,
          coverage_percentage: Number(record.coverage_percentage),
          valid_until: record.valid_until,
          is_primary: record.is_primary,
        }
      : { patient: null, plan: 0, policy_number: '', coverage_percentage: 80, valid_until: null, is_primary: false },
  });

  const onSubmit = async (values: PiFormValues) => {
    const payload = {
      patient: values.patient?.id,
      plan: values.plan,
      policy_number: values.policy_number,
      coverage_percentage: values.coverage_percentage,
      valid_until: values.valid_until || null,
      is_primary: values.is_primary,
    };
    try {
      if (record) {
        await updatePi({ id: record.id, body: payload }).unwrap();
      } else {
        await createPi(payload).unwrap();
      }
      onSaved();
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{record ? 'Edit patient insurance' : 'Add patient insurance'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {record ? (
              <PatientAutocomplete name="patient" control={control} label="Patient *" disabled />
            ) : (
              <PatientAutocomplete name="patient" control={control} label="Patient *" />
            )}
            <Controller
              name="plan"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  select
                  label="Plan *"
                  fullWidth
                  size="small"
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                >
                  <MenuItem value={0}>Select a plan</MenuItem>
                  {plans.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name} ({p.carrier})</MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="policy_number"
              control={control}
              render={({ field, fieldState }) => (
                <TextField label="Policy number *" fullWidth size="small" {...field} error={!!fieldState.error} helperText={fieldState.error?.message} />
              )}
            />
            <Controller
              name="coverage_percentage"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  label="Coverage %"
                  type="number"
                  fullWidth
                  size="small"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  inputProps={{ min: 0, max: 100 }}
                />
              )}
            />
            <Controller
              name="valid_until"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Valid until"
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(d) => field.onChange(d ? d.format('YYYY-MM-DD') : null)}
                />
              )}
            />
            <Controller
              name="is_primary"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                  label="Primary insurance"
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={formState.isSubmitting}>
            {record ? 'Save changes' : 'Add insurance'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
