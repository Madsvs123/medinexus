import { useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { PageHeader, DataTable, StatusChip, FormSelect, FormTextField, FormAutocomplete, EmptyState, ErrorAlert, ConfirmDialog } from '../../../components/ui';
import { useCreateInteractionMutation, useDeleteInteractionMutation, useGetInteractionsQuery, useGetMedicationsQuery, useUpdateInteractionMutation } from '../api';
import type { DrugInteraction } from '../types';
import { interactionMeds } from '../types';

const interactionSchema = z.object({
  medication_a: z.number({ invalid_type_error: 'Select medication A' }),
  medication_b: z.number({ invalid_type_error: 'Select medication B' }),
  severity: z.string().default('MODERATE'),
  description: z.string().min(1, 'Description required'),
});

type InteractionValues = z.infer<typeof interactionSchema>;

export default function InteractionsAdmin() {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading, error } = useGetInteractionsQuery({ page_size: 100 });
  const { data: medsData } = useGetMedicationsQuery({ page_size: 200 });
  const [createInteraction, { isLoading: saving }] = useCreateInteractionMutation();
  const [updateInteraction] = useUpdateInteractionMutation();
  const [deleteInteraction] = useDeleteInteractionMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DrugInteraction | null>(null);
  const [toDelete, setToDelete] = useState<DrugInteraction | null>(null);
  const meds = useMemo(() => medsData?.results ?? [], [medsData]);

  const { control, handleSubmit, reset } = useForm<InteractionValues>({
    resolver: zodResolver(interactionSchema),
    defaultValues: {
      medication_a: undefined as unknown as number,
      medication_b: undefined as unknown as number,
      severity: 'MODERATE',
      description: '',
    },
  });

  const columns = useMemo(
    () => [
      { key: 'a', label: 'Medication A', render: (r: DrugInteraction) => interactionMeds(r.medication_a) },
      { key: 'b', label: 'Medication B', render: (r: DrugInteraction) => interactionMeds(r.medication_b) },
      { key: 'severity', label: 'Severity', render: (r: DrugInteraction) => <StatusChip status={r.severity} /> },
      { key: 'description', label: 'Description', render: (r: DrugInteraction) => r.description },
      {
        key: 'actions',
        label: '',
        render: (r: DrugInteraction) => (
          <Stack direction="row" spacing={0.5}>
            <IconButton
              aria-label="Edit interaction"
              onClick={() => {
                setEditing(r);
                reset({
                  medication_a: typeof r.medication_a === 'number' ? r.medication_a : r.medication_a.id,
                  medication_b: typeof r.medication_b === 'number' ? r.medication_b : r.medication_b.id,
                  severity: r.severity,
                  description: r.description,
                });
                setOpen(true);
              }}
            >
              <EditIcon />
            </IconButton>
            <IconButton aria-label="Delete interaction" color="error" onClick={() => setToDelete(r)}><DeleteIcon /></IconButton>
          </Stack>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const onSave = handleSubmit(async (values: InteractionValues) => {
    if (values.medication_a === values.medication_b) {
      enqueueSnackbar('Select two different medications', { variant: 'warning' });
      return;
    }
    try {
      if (editing) {
        await updateInteraction({ id: editing.id, body: values as never }).unwrap();
        enqueueSnackbar('Interaction updated', { variant: 'success' });
      } else {
        await createInteraction(values as never).unwrap();
        enqueueSnackbar('Interaction created', { variant: 'success' });
      }
      setOpen(false);
      setEditing(null);
      reset();
    } catch {
      enqueueSnackbar('Failed to save interaction', { variant: 'error' });
    }
  });

  const doDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteInteraction(toDelete.id).unwrap();
      enqueueSnackbar('Interaction deleted', { variant: 'success' });
      setToDelete(null);
    } catch {
      enqueueSnackbar('Failed to delete interaction', { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader
        title="Drug interactions"
        subtitle="Known interactions between formulary medications"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); reset(); setOpen(true); }}>
            New interaction
          </Button>
        }
      />
      {error && <ErrorAlert error={error} />}
      <DataTable
        columns={columns}
        rows={data?.results ?? []}
        loading={isLoading}
        rowKey={(r) => String(r.id)}
        emptyState={<EmptyState icon={<SwapHorizIcon />} title="No interactions" hint="Define drug-drug interactions to power prescription warnings." />}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit interaction' : 'New interaction'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <Controller
                control={control}
                name="medication_a"
                render={({ field, fieldState }) => (
                  <FormAutocomplete
                    label="Medication A"
                    options={meds}
                    getOptionLabel={(m) => `${m.name}${m.strength ? ` ${m.strength}` : ''}`}
                    value={meds.find((m) => m.id === field.value) ?? null}
                    onChange={(m) => field.onChange(m?.id ?? null)}
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
                name="medication_b"
                render={({ field, fieldState }) => (
                  <FormAutocomplete
                    label="Medication B"
                    options={meds}
                    getOptionLabel={(m) => `${m.name}${m.strength ? ` ${m.strength}` : ''}`}
                    value={meds.find((m) => m.id === field.value) ?? null}
                    onChange={(m) => field.onChange(m?.id ?? null)}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    required
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <FormSelect control={control} name="severity" label="Severity" options={['MILD', 'MODERATE', 'SEVERE'].map((s) => ({ value: s, label: s }))} />
            </Grid>
            <Grid item xs={12}>
              <FormTextField control={control} name="description" label="Description" required multiline minRows={2} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={onSave} disabled={saving}>Save</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={!!toDelete}
        title="Delete interaction?"
        message="Prescription warnings will no longer include this pair."
        confirmLabel="Delete"
        onConfirm={doDelete}
        onCancel={() => setToDelete(null)}
      />
    </Box>
  );
}
