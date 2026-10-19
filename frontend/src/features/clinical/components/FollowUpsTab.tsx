import { useMemo, useState } from 'react';
import { Button, IconButton, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { FormDatePicker, FormSelect, FormTextField, StatusChip, EmptyState } from '../../../components/ui';
import { useCreateFollowUpMutation, useDeleteFollowUpMutation, useGetFollowUpsQuery, useUpdateFollowUpMutation } from '../api';
import type { FollowUp } from '../types';
import { SectionCard, SectionEmpty, SectionFormDialog } from './EncounterSection';

const followUpSchema = z.object({
  scheduled_date: z.string().min(1, 'Date required'),
  instructions: z.string().optional(),
  status: z.string().default('PENDING'),
});

type FollowUpValues = z.infer<typeof followUpSchema>;

export function FollowUpsTab({ encounterId, readOnly }: { encounterId: number; readOnly?: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useGetFollowUpsQuery({ encounter: encounterId, page_size: 50 });
  const [createFollowUp, { isLoading: saving }] = useCreateFollowUpMutation();
  const [updateFollowUp] = useUpdateFollowUpMutation();
  const [deleteFollowUp] = useDeleteFollowUpMutation();
  const [open, setOpen] = useState(false);
  const { control, handleSubmit, reset } = useForm<FollowUpValues>({
    resolver: zodResolver(followUpSchema),
    defaultValues: { scheduled_date: dayjs().add(7, 'day').format('YYYY-MM-DD'), instructions: '', status: 'PENDING' },
  });

  const rows = useMemo(() => data?.results ?? [], [data]);

  const onSave = handleSubmit(async (values: FollowUpValues) => {
    try {
      await createFollowUp({
        encounter: encounterId,
        scheduled_date: dayjs(values.scheduled_date as string).format('YYYY-MM-DD'),
        instructions: values.instructions ?? '',
        status: values.status as FollowUp['status'],
      }).unwrap();
      enqueueSnackbar('Follow-up scheduled', { variant: 'success' });
      setOpen(false);
      reset();
    } catch {
      enqueueSnackbar('Failed to schedule follow-up', { variant: 'error' });
    }
  });

  return (
    <SectionCard
      title="Follow-ups"
      action={!readOnly && (
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Schedule follow-up</Button>
      )}
    >
      {isLoading ? (
        <SectionEmpty hint="Loading…" />
      ) : rows.length === 0 ? (
        <EmptyState title="No follow-ups" hint="Schedule the next review for this patient." />
      ) : (
        <List dense>
          {rows.map((f) => (
            <ListItem
              key={f.id}
              divider
              secondaryAction={
                !readOnly && (
                  <Stack direction="row" spacing={0.5}>
                    {f.status === 'PENDING' && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={async () => {
                          await updateFollowUp({ id: f.id, body: { status: 'COMPLETED' } }).unwrap();
                          enqueueSnackbar('Follow-up completed', { variant: 'success' });
                        }}
                      >
                        Complete
                      </Button>
                    )}
                    <IconButton
                      edge="end"
                      aria-label="Delete follow-up"
                      color="error"
                      onClick={async () => {
                        await deleteFollowUp(f.id).unwrap();
                        enqueueSnackbar('Follow-up deleted', { variant: 'success' });
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
                    <strong>{dayjs(f.scheduled_date).format('DD MMM YYYY')}</strong>
                    <StatusChip status={f.status} />
                  </Stack>
                }
                secondary={<Typography variant="body2">{f.instructions || 'No instructions'}</Typography>}
              />
            </ListItem>
          ))}
        </List>
      )}
      <SectionFormDialog open={open} title="Schedule follow-up" onClose={() => setOpen(false)} onSave={onSave} saving={saving}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormDatePicker control={control} name="scheduled_date" label="Scheduled date" />
          <FormTextField control={control} name="instructions" label="Instructions" multiline minRows={2} />
          <FormSelect control={control} name="status" label="Status" options={['PENDING', 'COMPLETED', 'CANCELLED'].map((s) => ({ value: s, label: s }))} />
        </Stack>
      </SectionFormDialog>
    </SectionCard>
  );
}
