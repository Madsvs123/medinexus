import { useMemo, useState } from 'react';
import { Button, IconButton, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SignpostIcon from '@mui/icons-material/Signpost';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { FormTextField, FormSelect, StatusChip, EmptyState } from '../../../components/ui';
import { useCreateNoteMutation, useDeleteNoteMutation, useGetNotesQuery, useSignNoteMutation } from '../api';
import type { ClinicalNote } from '../types';
import { SectionCard, SectionEmpty, SectionFormDialog } from './EncounterSection';

const noteSchema = z.object({
  note_type: z.string().default('PROGRESS'),
  content: z.string().min(1, 'Note content required'),
});

type NoteValues = z.infer<typeof noteSchema>;

export function NotesTab({ encounterId, readOnly }: { encounterId: number; readOnly?: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useGetNotesQuery({ encounter: encounterId, page_size: 50 });
  const [createNote, { isLoading: saving }] = useCreateNoteMutation();
  const [signNote] = useSignNoteMutation();
  const [deleteNote] = useDeleteNoteMutation();
  const [open, setOpen] = useState(false);
  const { control, handleSubmit, reset } = useForm<NoteValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { note_type: 'PROGRESS', content: '' },
  });

  const rows = useMemo(() => data?.results ?? [], [data]);

  const onSave = handleSubmit(async (values: NoteValues) => {
    try {
      await createNote({ encounter: encounterId, ...values } as never).unwrap();
      enqueueSnackbar('Note saved', { variant: 'success' });
      setOpen(false);
      reset();
    } catch {
      enqueueSnackbar('Failed to save note', { variant: 'error' });
    }
  });

  return (
    <SectionCard
      title="Clinical notes"
      action={!readOnly && (
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>New note</Button>
      )}
    >
      {isLoading ? (
        <SectionEmpty hint="Loading…" />
      ) : rows.length === 0 ? (
        <EmptyState title="No notes" hint="Progress notes, admission and operation notes live here." />
      ) : (
        <List dense>
          {rows.map((n: ClinicalNote) => (
            <ListItem
              key={n.id}
              divider
              alignItems="flex-start"
              secondaryAction={
                !readOnly && (
                  <IconButton
                    edge="end"
                    aria-label="Delete note"
                    color="error"
                    onClick={async () => {
                      await deleteNote(n.id).unwrap();
                      enqueueSnackbar('Note deleted', { variant: 'success' });
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
                    <StatusChip status={n.note_type} />
                    {n.is_signed ? <StatusChip status="SIGNED" /> : <StatusChip status="DRAFT" />}
                    {n.author && <Typography variant="caption" color="text.secondary">{n.author.first_name} {n.author.last_name}</Typography>}
                  </Stack>
                }
                secondary={
                  <>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{n.content}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {dayjs(n.created_at ?? n.signed_at ?? undefined).format('DD MMM YYYY HH:mm')}
                      {n.is_signed && n.signed_at ? ` • signed ${dayjs(n.signed_at).format('DD MMM YYYY HH:mm')}` : ''}
                    </Typography>
                  </>
                }
              />
              {!readOnly && !n.is_signed && (
                <Button
                  size="small"
                  startIcon={<SignpostIcon />}
                  onClick={async () => {
                    await signNote(n.id).unwrap();
                    enqueueSnackbar('Note signed', { variant: 'success' });
                  }}
                  sx={{ ml: 2 }}
                >
                  Sign
                </Button>
              )}
            </ListItem>
          ))}
        </List>
      )}
      <SectionFormDialog open={open} title="New note" onClose={() => setOpen(false)} onSave={onSave} saving={saving}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormSelect control={control} name="note_type" label="Note type" options={['PROGRESS', 'ADMISSION', 'OPERATION', 'DISCHARGE', 'OTHER'].map((t) => ({ value: t, label: t }))} />
          <FormTextField control={control} name="content" label="Content" required multiline minRows={4} />
        </Stack>
      </SectionFormDialog>
    </SectionCard>
  );
}
