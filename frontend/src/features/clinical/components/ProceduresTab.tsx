import { useMemo, useState } from 'react';
import { Button, IconButton, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { FormTextField, EmptyState } from '../../../components/ui';
import { useCreateProcedureMutation, useDeleteProcedureMutation, useGetProceduresQuery } from '../api';
import type { ProcedureRecord } from '../types';
import { userName } from '../types';
import { SectionCard, SectionEmpty, SectionFormDialog } from './EncounterSection';

const procedureSchema = z.object({
  name: z.string().min(1, 'Procedure name required'),
  code: z.string().optional(),
  performed_at: z.string().optional(),
  notes: z.string().optional(),
  outcome: z.string().optional(),
});

type ProcedureValues = z.infer<typeof procedureSchema>;

export function ProceduresTab({ encounterId, readOnly }: { encounterId: number; readOnly?: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useGetProceduresQuery({ encounter: encounterId, page_size: 50 });
  const [createProcedure, { isLoading: saving }] = useCreateProcedureMutation();
  const [deleteProcedure] = useDeleteProcedureMutation();
  const [open, setOpen] = useState(false);
  const { control, handleSubmit, reset } = useForm<ProcedureValues>({
    resolver: zodResolver(procedureSchema),
    defaultValues: { name: '', code: '', performed_at: dayjs().format('YYYY-MM-DDTHH:mm'), notes: '', outcome: '' },
  });

  const rows = useMemo(() => data?.results ?? [], [data]);

  const onSave = handleSubmit(async (values: ProcedureValues) => {
    try {
      await createProcedure({
        encounter: encounterId,
        name: values.name,
        code: values.code ?? '',
        performed_at: values.performed_at ? dayjs(values.performed_at).toISOString() : dayjs().toISOString(),
        notes: values.notes ?? '',
        outcome: values.outcome ?? '',
      }).unwrap();
      enqueueSnackbar('Procedure recorded', { variant: 'success' });
      setOpen(false);
      reset();
    } catch {
      enqueueSnackbar('Failed to record procedure', { variant: 'error' });
    }
  });

  return (
    <SectionCard
      title="Procedures"
      action={!readOnly && (
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Record procedure</Button>
      )}
    >
      {isLoading ? (
        <SectionEmpty hint="Loading…" />
      ) : rows.length === 0 ? (
        <EmptyState title="No procedures" hint="Procedures performed during this encounter appear here." />
      ) : (
        <List dense>
          {rows.map((p: ProcedureRecord) => (
            <ListItem
              key={p.id}
              divider
              secondaryAction={
                !readOnly && (
                  <IconButton
                    edge="end"
                    aria-label="Delete procedure"
                    color="error"
                    onClick={async () => {
                      await deleteProcedure(p.id).unwrap();
                      enqueueSnackbar('Procedure deleted', { variant: 'success' });
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
                    <strong>{p.name}</strong>
                    {p.code && <span>({p.code})</span>}
                  </Stack>
                }
                secondary={
                  <>
                    <Typography variant="body2">
                      {p.performed_at ? dayjs(p.performed_at).format('DD MMM YYYY HH:mm') : '—'}
                      {p.performed_by ? ` • ${userName(p.performed_by)}` : ''}
                    </Typography>
                    {p.outcome && <Typography variant="body2">Outcome: {p.outcome}</Typography>}
                    {p.notes && <Typography variant="body2">{p.notes}</Typography>}
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
      <SectionFormDialog open={open} title="Record procedure" onClose={() => setOpen(false)} onSave={onSave} saving={saving}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormTextField control={control} name="name" label="Procedure name" required />
          <FormTextField control={control} name="code" label="Code (CPT/ICD-PCS)" />
          <FormTextField control={control} name="performed_at" label="Performed at (datetime)" />
          <FormTextField control={control} name="outcome" label="Outcome" />
          <FormTextField control={control} name="notes" label="Notes" multiline minRows={2} />
        </Stack>
      </SectionFormDialog>
    </SectionCard>
  );
}
