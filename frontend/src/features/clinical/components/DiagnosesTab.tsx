import { useMemo, useState } from 'react';
import { Button, IconButton, List, ListItem, ListItemText, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { FormTextField, FormSelect, StatusChip, EmptyState } from '../../../components/ui';
import { useCreateDiagnosisMutation, useDeleteDiagnosisMutation, useGetDiagnosesQuery } from '../api';
import { SectionCard, SectionEmpty, SectionFormDialog } from './EncounterSection';

const diagnosisSchema = z.object({
  name: z.string().min(1, 'Diagnosis required'),
  icd_code: z.string().optional(),
  type: z.string().default('PRIMARY'),
  status: z.string().default('ACTIVE'),
  notes: z.string().optional(),
});

type DiagnosisValues = z.infer<typeof diagnosisSchema>;

export function DiagnosesTab({ encounterId, readOnly }: { encounterId: number; readOnly?: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useGetDiagnosesQuery({ encounter: encounterId, page_size: 50 });
  const [createDiagnosis, { isLoading: saving }] = useCreateDiagnosisMutation();
  const [deleteDiagnosis] = useDeleteDiagnosisMutation();
  const [open, setOpen] = useState(false);
  const { control, handleSubmit, reset } = useForm<DiagnosisValues>({
    resolver: zodResolver(diagnosisSchema),
    defaultValues: { name: '', icd_code: '', type: 'PRIMARY', status: 'ACTIVE', notes: '' },
  });

  const rows = useMemo(() => data?.results ?? [], [data]);

  const onSave = handleSubmit(async (values: DiagnosisValues) => {
    try {
      await createDiagnosis({ encounter: encounterId, ...values } as never).unwrap();
      enqueueSnackbar('Diagnosis added', { variant: 'success' });
      setOpen(false);
      reset();
    } catch {
      enqueueSnackbar('Failed to add diagnosis', { variant: 'error' });
    }
  });

  return (
    <SectionCard
      title="Diagnoses"
      action={!readOnly && (
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Add diagnosis</Button>
      )}
    >
      {isLoading ? (
        <SectionEmpty hint="Loading…" />
      ) : rows.length === 0 ? (
        <EmptyState title="No diagnoses" hint="Add the primary and secondary diagnoses for this encounter." />
      ) : (
        <List dense>
          {rows.map((d) => (
            <ListItem
              key={d.id}
              divider
              secondaryAction={
                !readOnly && (
                  <IconButton
                    edge="end"
                    aria-label="Delete diagnosis"
                    color="error"
                    onClick={async () => {
                      await deleteDiagnosis(d.id).unwrap();
                      enqueueSnackbar('Diagnosis removed', { variant: 'success' });
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                )
              }
            >
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <strong>{d.name}</strong>
                    {d.icd_code && <span>({d.icd_code})</span>}
                    <StatusChip status={d.type} />
                    <StatusChip status={d.status} />
                  </Stack>
                }
                secondary={d.notes || undefined}
              />
            </ListItem>
          ))}
        </List>
      )}
      <SectionFormDialog open={open} title="Add diagnosis" onClose={() => setOpen(false)} onSave={onSave} saving={saving}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormTextField control={control} name="name" label="Diagnosis" required />
          <FormTextField control={control} name="icd_code" label="ICD code" />
          <FormSelect control={control} name="type" label="Type" options={['PRIMARY', 'SECONDARY', 'DIFFERENTIAL'].map((t) => ({ value: t, label: t }))} />
          <FormSelect control={control} name="status" label="Status" options={['ACTIVE', 'RESOLVED'].map((s) => ({ value: s, label: s }))} />
          <FormTextField control={control} name="notes" label="Notes" multiline minRows={2} />
        </Stack>
      </SectionFormDialog>
    </SectionCard>
  );
}
