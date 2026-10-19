import { useMemo, useState } from 'react';
import { Button, IconButton, List, ListItem, ListItemText, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { FormTextField, FormSelect, StatusChip, EmptyState } from '../../../components/ui';
import { useCreateTreatmentPlanMutation, useDeleteTreatmentPlanMutation, useGetTreatmentPlansQuery, useUpdateTreatmentPlanMutation } from '../api';
import type { TreatmentPlan } from '../types';
import { SectionCard, SectionEmpty, SectionFormDialog } from './EncounterSection';

const planSchema = z.object({
  title: z.string().min(1, 'Title required'),
  instructions: z.string().optional(),
  goals: z.string().optional(),
  status: z.string().default('ACTIVE'),
});

type PlanValues = z.infer<typeof planSchema>;

export function TreatmentPlanTab({ encounterId, readOnly }: { encounterId: number; readOnly?: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useGetTreatmentPlansQuery({ encounter: encounterId, page_size: 50 });
  const [createPlan, { isLoading: saving }] = useCreateTreatmentPlanMutation();
  const [updatePlan] = useUpdateTreatmentPlanMutation();
  const [deletePlan] = useDeleteTreatmentPlanMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TreatmentPlan | null>(null);
  const { control, handleSubmit, reset } = useForm<PlanValues>({
    resolver: zodResolver(planSchema),
    defaultValues: { title: '', instructions: '', goals: '', status: 'ACTIVE' },
  });

  const rows = useMemo(() => data?.results ?? [], [data]);

  const onSave = handleSubmit(async (values: PlanValues) => {
    try {
      if (editing) {
        await updatePlan({ id: editing.id, body: values as never }).unwrap();
        enqueueSnackbar('Plan updated', { variant: 'success' });
      } else {
        await createPlan({ encounter: encounterId, ...values } as never).unwrap();
        enqueueSnackbar('Plan created', { variant: 'success' });
      }
      setOpen(false);
      setEditing(null);
      reset();
    } catch {
      enqueueSnackbar('Failed to save plan', { variant: 'error' });
    }
  });

  return (
    <SectionCard
      title="Treatment plans"
      action={!readOnly && (
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); reset(); setOpen(true); }}>New plan</Button>
      )}
    >
      {isLoading ? (
        <SectionEmpty hint="Loading…" />
      ) : rows.length === 0 ? (
        <EmptyState title="No treatment plans" hint="Document the treatment approach for this patient." />
      ) : (
        <List dense>
          {rows.map((p) => (
            <ListItem
              key={p.id}
              divider
              secondaryAction={
                !readOnly && (
                  <Stack direction="row" spacing={0.5}>
                    <IconButton
                      edge="end"
                      aria-label="Edit plan"
                      onClick={() => {
                        setEditing(p);
                        reset({ title: p.title, instructions: p.instructions ?? '', goals: p.goals ?? '', status: p.status });
                        setOpen(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="Delete plan"
                      color="error"
                      onClick={async () => {
                        await deletePlan(p.id).unwrap();
                        enqueueSnackbar('Plan deleted', { variant: 'success' });
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
                    <strong>{p.title}</strong>
                    <StatusChip status={p.status} />
                  </Stack>
                }
                secondary={
                  <>
                    {p.goals && <div><em>Goals:</em> {p.goals}</div>}
                    {p.instructions && <div><em>Instructions:</em> {p.instructions}</div>}
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
      <SectionFormDialog open={open} title={editing ? 'Edit plan' : 'New treatment plan'} onClose={() => setOpen(false)} onSave={onSave} saving={saving}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormTextField control={control} name="title" label="Title" required />
          <FormTextField control={control} name="goals" label="Goals" multiline minRows={2} />
          <FormTextField control={control} name="instructions" label="Instructions" multiline minRows={2} />
          <FormSelect control={control} name="status" label="Status" options={['ACTIVE', 'COMPLETED', 'ON_HOLD'].map((s) => ({ value: s, label: s }))} />
        </Stack>
      </SectionFormDialog>
    </SectionCard>
  );
}
