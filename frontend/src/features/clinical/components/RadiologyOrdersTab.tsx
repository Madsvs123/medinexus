import { useMemo, useState } from 'react';
import { IconButton, List, ListItem, ListItemText, Stack, Typography, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { FormSelect, FormTextField, StatusChip, EmptyState } from '../../../components/ui';
import { useCreateRadiologyOrderMutation, useDeleteRadiologyOrderMutation, useGetClinicalRadiologyOrdersQuery } from '../api';
import type { ClinicalRadiologyOrder } from '../types';
import { RADIOLOGY_MODALITIES } from '../types';
import { SectionCard, SectionEmpty, SectionFormDialog } from './EncounterSection';

const radOrderSchema = z.object({
  modality: z.string().min(1, 'Select a modality'),
  body_part: z.string().min(1, 'Body part required'),
  clinical_indication: z.string().optional(),
  priority: z.string().default('ROUTINE'),
  notes: z.string().optional(),
});

type RadOrderValues = z.infer<typeof radOrderSchema>;

export function RadiologyOrdersTab({ encounterId, patientId, readOnly }: { encounterId: number; patientId: number; readOnly?: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useGetClinicalRadiologyOrdersQuery({ encounter: encounterId, page_size: 50 });
  const [createOrder, { isLoading: saving }] = useCreateRadiologyOrderMutation();
  const [deleteOrder] = useDeleteRadiologyOrderMutation();
  const [open, setOpen] = useState(false);
  const { control, handleSubmit, reset } = useForm<RadOrderValues>({
    resolver: zodResolver(radOrderSchema),
    defaultValues: { modality: '', body_part: '', clinical_indication: '', priority: 'ROUTINE', notes: '' },
  });

  const rows = useMemo(() => data?.results ?? [], [data]);

  const onSave = handleSubmit(async (values: RadOrderValues) => {
    try {
      await createOrder({
        patient: patientId,
        encounter: encounterId,
        modality: values.modality as ClinicalRadiologyOrder['modality'],
        body_part: values.body_part,
        clinical_indication: values.clinical_indication ?? '',
        priority: values.priority as ClinicalRadiologyOrder['priority'],
        notes: values.notes ?? '',
      }).unwrap();
      enqueueSnackbar('Radiology order placed', { variant: 'success' });
      setOpen(false);
      reset();
    } catch {
      enqueueSnackbar('Failed to place radiology order', { variant: 'error' });
    }
  });

  return (
    <SectionCard
      title="Radiology orders"
      action={!readOnly && (
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Order imaging</Button>
      )}
    >
      {isLoading ? (
        <SectionEmpty hint="Loading…" />
      ) : rows.length === 0 ? (
        <EmptyState title="No radiology orders" hint="Order X-ray, CT, MRI, ultrasound and other imaging." />
      ) : (
        <List dense>
          {rows.map((o) => (
            <ListItem
              key={o.id}
              divider
              secondaryAction={
                !readOnly && (
                  <IconButton
                    edge="end"
                    aria-label="Delete radiology order"
                    color="error"
                    onClick={async () => {
                      await deleteOrder(o.id).unwrap();
                      enqueueSnackbar('Radiology order deleted', { variant: 'success' });
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
                    <strong>{o.modality} — {o.body_part}</strong>
                    <StatusChip status={o.priority} />
                    <StatusChip status={o.status} />
                  </Stack>
                }
                secondary={
                  <>
                    {o.clinical_indication && <Typography variant="body2">Indication: {o.clinical_indication}</Typography>}
                    <Typography variant="caption" color="text.secondary">{dayjs(o.ordered_at).format('DD MMM YYYY HH:mm')}{o.notes ? ` • ${o.notes}` : ''}</Typography>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
      <SectionFormDialog open={open} title="Order imaging" onClose={() => setOpen(false)} onSave={onSave} saving={saving}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormSelect control={control} name="modality" label="Modality" options={RADIOLOGY_MODALITIES.map((m) => ({ value: m, label: m }))} />
          <FormTextField control={control} name="body_part" label="Body part" required />
          <FormTextField control={control} name="clinical_indication" label="Clinical indication" multiline minRows={2} />
          <FormSelect control={control} name="priority" label="Priority" options={['ROUTINE', 'URGENT', 'STAT'].map((p) => ({ value: p, label: p }))} />
          <FormTextField control={control} name="notes" label="Notes" multiline minRows={2} />
        </Stack>
      </SectionFormDialog>
    </SectionCard>
  );
}
