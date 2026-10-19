import { useMemo, useState } from 'react';
import { Alert, Box, Button, Checkbox, FormControlLabel, IconButton, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import MedicationIcon from '@mui/icons-material/Medication';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { FormTextField, FormSelect, FormAutocomplete, StatusChip, EmptyState } from '../../../components/ui';
import {
  useCancelPrescriptionMutation,
  useCreatePrescriptionMutation,
  useDeletePrescriptionMutation,
  useGetPrescriptionMedicationsQuery,
  useGetPrescriptionsQuery,
} from '../api';
import type { Prescription, PrescriptionWarning } from '../types';
import { medicationName } from '../types';
import { SectionCard, SectionEmpty, SectionFormDialog } from './EncounterSection';

const rxSchema = z.object({
  medication: z.number({ invalid_type_error: 'Select a medication' }),
  dosage: z.string().min(1, 'Dosage required (e.g. 500mg)'),
  frequency: z.string().min(1, 'Frequency required (e.g. 2x daily)'),
  route: z.string().default('ORAL'),
  duration_days: z.coerce.number().int().min(1).nullable().optional(),
  instructions: z.string().optional(),
  refills: z.coerce.number().int().min(0).default(0),
});

type RxValues = z.infer<typeof rxSchema>;

export function PrescriptionsTab({ encounterId, readOnly }: { encounterId: number; readOnly?: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useGetPrescriptionsQuery({ encounter: encounterId, page_size: 50 });
  const { data: medsData } = useGetPrescriptionMedicationsQuery({ page_size: 100 });
  const [createRx, { isLoading: saving }] = useCreatePrescriptionMutation();
  const [cancelRx] = useCancelPrescriptionMutation();
  const [deleteRx] = useDeletePrescriptionMutation();
  const [open, setOpen] = useState(false);
  const [overrideSevere, setOverrideSevere] = useState(false);
  const [serverWarnings, setServerWarnings] = useState<PrescriptionWarning[]>([]);
  const meds = useMemo(() => medsData?.results ?? [], [medsData]);

  const { control, handleSubmit, reset } = useForm<RxValues>({
    resolver: zodResolver(rxSchema),
    defaultValues: {
      medication: undefined as unknown as number,
      dosage: '',
      frequency: '',
      route: 'ORAL',
      duration_days: null,
      instructions: '',
      refills: 0,
    },
  });

  const rows = useMemo(() => data?.results ?? [], [data]);
  const hasSevere = serverWarnings.some((w) => w.severity === 'SEVERE');

  const onSave = handleSubmit(async (values: RxValues) => {
    setServerWarnings([]);
    try {
      const created = await createRx({
        body: {
          encounter: encounterId,
          medication: values.medication,
          dosage: values.dosage,
          frequency: values.frequency,
          route: values.route as Prescription['route'],
          duration_days: values.duration_days ?? null,
          instructions: values.instructions ?? '',
          refills: values.refills,
          override: overrideSevere,
        },
      }).unwrap();
      enqueueSnackbar('Prescription added', { variant: 'success' });
      if (created.warnings?.length) {
        setServerWarnings(created.warnings);
      }
      setOpen(false);
      setOverrideSevere(false);
      reset();
    } catch (e) {
      const err = e as { data?: { detail?: string; warnings?: PrescriptionWarning[] } };
      if (err.data?.warnings?.length) {
        setServerWarnings(err.data.warnings);
        enqueueSnackbar(err.data.detail ?? 'Prescription blocked due to warnings', { variant: 'error' });
      } else {
        enqueueSnackbar(err.data?.detail ?? 'Failed to add prescription', { variant: 'error' });
      }
    }
  });

  return (
    <SectionCard
      title="Prescriptions"
      action={!readOnly && (
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => { setServerWarnings([]); setOverrideSevere(false); reset(); setOpen(true); }}>Add prescription</Button>
      )}
    >
      {isLoading ? (
        <SectionEmpty hint="Loading…" />
      ) : rows.length === 0 ? (
        <EmptyState icon={<MedicationIcon />} title="No prescriptions" hint="Prescribe medications for this encounter." />
      ) : (
        <List dense>
          {rows.map((p) => (
            <ListItem
              key={p.id}
              divider
              alignItems="flex-start"
              secondaryAction={
                !readOnly && (
                  <Stack direction="row" spacing={0.5}>
                    {p.status === 'ACTIVE' && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={async () => {
                          await cancelRx(p.id).unwrap();
                          enqueueSnackbar('Prescription cancelled', { variant: 'success' });
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                    <IconButton
                      edge="end"
                      aria-label="Delete prescription"
                      color="error"
                      onClick={async () => {
                        await deleteRx(p.id).unwrap();
                        enqueueSnackbar('Prescription deleted', { variant: 'success' });
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                )
              }
            >
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <strong>{medicationName(p.medication)}</strong>
                    <span>{p.dosage} • {p.frequency} • {p.route}</span>
                    <StatusChip status={p.status} />
                  </Stack>
                }
                secondary={
                  <Box>
                    {p.duration_days && <Typography variant="body2">Duration: {p.duration_days} days • refills: {p.refills}</Typography>}
                    {p.instructions && <Typography variant="body2">{p.instructions}</Typography>}
                    <WarningsPanel warnings={p.warnings ?? []} />
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
      <SectionFormDialog open={open} title="Add prescription" onClose={() => setOpen(false)} onSave={onSave} saving={saving}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Controller
            control={control}
            name="medication"
            render={({ field, fieldState }) => (
              <FormAutocomplete
                label="Medication"
                options={meds}
                getOptionLabel={(m) => `${m.name}${m.strength ? ` ${m.strength}` : ''} (${m.code})`}
                value={meds.find((m) => m.id === field.value) ?? null}
                onChange={(m) => field.onChange(m?.id ?? null)}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                required
              />
            )}
          />
          <Stack direction="row" spacing={2}>
            <FormTextField control={control} name="dosage" label="Dosage (e.g. 500mg)" required />
            <FormTextField control={control} name="frequency" label="Frequency (e.g. 2x daily)" required />
          </Stack>
          <Stack direction="row" spacing={2}>
            <FormSelect control={control} name="route" label="Route" options={['ORAL', 'IV', 'IM', 'TOPICAL', 'INHALATION', 'SUBLINGUAL'].map((r) => ({ value: r, label: r }))} sx={{ flexGrow: 1 }} />
            <FormTextField control={control} name="duration_days" label="Duration (days)" type="number" />
            <FormTextField control={control} name="refills" label="Refills" type="number" />
          </Stack>
          <FormTextField control={control} name="instructions" label="Instructions" multiline minRows={2} />
          {serverWarnings.length > 0 && (
            <Alert severity={hasSevere ? 'error' : 'warning'} role="alert">
              <WarningsPanel warnings={serverWarnings} />
            </Alert>
          )}
          {hasSevere && (
            <FormControlLabel
              control={<Checkbox checked={overrideSevere} onChange={(e) => setOverrideSevere(e.target.checked)} />}
              label="Override severe warnings and prescribe anyway"
            />
          )}
        </Stack>
      </SectionFormDialog>
    </SectionCard>
  );
}

export function WarningsPanel({ warnings }: { warnings: PrescriptionWarning[] }) {
  if (!warnings || warnings.length === 0) return null;
  return (
    <Box sx={{ mt: 0.5 }}>
      {warnings.map((w, i) => (
        <Typography key={i} variant="body2" color={w.severity === 'SEVERE' ? 'error' : 'warning.main'}>
          ⚠ [{w.severity} {w.type}] {w.message}
        </Typography>
      ))}
    </Box>
  );
}
