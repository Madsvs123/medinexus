import { useMemo, useState } from 'react';
import { Box, Button, Checkbox, FormControlLabel, IconButton, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ScienceIcon from '@mui/icons-material/Science';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { FormSelect, FormTextField, StatusChip, EmptyState } from '../../../components/ui';
import { useCreateLabOrderMutation, useDeleteLabOrderMutation, useGetClinicalLabOrdersQuery, useGetLabTestsCatalogQuery } from '../api';
import type { LabOrder } from '../types';
import { SectionCard, SectionEmpty, SectionFormDialog } from './EncounterSection';

const labOrderSchema = z.object({
  tests: z.array(z.number()).min(1, 'Select at least one test'),
  priority: z.string().default('ROUTINE'),
  notes: z.string().optional(),
});

type LabOrderValues = z.infer<typeof labOrderSchema>;

const testName = (t: LabOrder['tests'][number]): string => {
  if (typeof t === 'number') return `Test #${t}`;
  return `${t.name} (${t.code})`;
};

export function LabOrdersTab({ encounterId, patientId, readOnly }: { encounterId: number; patientId: number; readOnly?: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useGetClinicalLabOrdersQuery({ encounter: encounterId, page_size: 50 });
  const { data: testsData } = useGetLabTestsCatalogQuery({ page_size: 100, active: true });
  const [createOrder, { isLoading: saving }] = useCreateLabOrderMutation();
  const [deleteOrder] = useDeleteLabOrderMutation();
  const [open, setOpen] = useState(false);
  const tests = useMemo(() => testsData?.results ?? [], [testsData]);
  const { control, handleSubmit, reset, watch, setValue } = useForm<LabOrderValues>({
    resolver: zodResolver(labOrderSchema),
    defaultValues: { tests: [], priority: 'ROUTINE', notes: '' },
  });
  const selected = watch('tests');

  const rows = useMemo(() => data?.results ?? [], [data]);

  const toggleTest = (id: number) => {
    const next = selected.includes(id) ? selected.filter((t) => t !== id) : [...selected, id];
    setValue('tests', next, { shouldValidate: true });
  };

  const onSave = handleSubmit(async (values: LabOrderValues) => {
    try {
      await createOrder({ patient: patientId, encounter: encounterId, tests: values.tests, priority: values.priority as LabOrder['priority'], notes: values.notes ?? '' }).unwrap();
      enqueueSnackbar('Lab order placed', { variant: 'success' });
      setOpen(false);
      reset();
    } catch {
      enqueueSnackbar('Failed to place lab order', { variant: 'error' });
    }
  });

  return (
    <SectionCard
      title="Laboratory orders"
      action={!readOnly && (
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Order tests</Button>
      )}
    >
      {isLoading ? (
        <SectionEmpty hint="Loading…" />
      ) : rows.length === 0 ? (
        <EmptyState icon={<ScienceIcon />} title="No lab orders" hint="Order laboratory tests for this patient." />
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
                    aria-label="Delete lab order"
                    color="error"
                    onClick={async () => {
                      await deleteOrder(o.id).unwrap();
                      enqueueSnackbar('Lab order deleted', { variant: 'success' });
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
                    <strong>Order #{o.id}</strong>
                    <StatusChip status={o.priority} />
                    <StatusChip status={o.status} />
                  </Stack>
                }
                secondary={
                  <>
                    <Typography variant="body2">{o.tests.map((t) => testName(t)).join(', ')}</Typography>
                    <Typography variant="caption" color="text.secondary">{dayjs(o.ordered_at).format('DD MMM YYYY HH:mm')}{o.notes ? ` • ${o.notes}` : ''}</Typography>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
      <SectionFormDialog open={open} title="Order laboratory tests" onClose={() => setOpen(false)} onSave={onSave} saving={saving}>
        <Box sx={{ mt: 1 }}>
          <Typography variant="subtitle2" gutterBottom>Tests</Typography>
          {tests.length === 0 ? (
            <SectionEmpty hint="No active tests in the catalog." />
          ) : (
            <List dense sx={{ maxHeight: 260, overflow: 'auto' }}>
              {tests.map((t) => (
                <ListItem key={t.id} disableGutters>
                  <FormControlLabel
                    control={<Checkbox checked={selected.includes(t.id)} onChange={() => toggleTest(t.id)} />}
                    label={`${t.name} (${t.code})${t.category ? ` — ${t.category}` : ''}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
          <FormSelect control={control} name="priority" label="Priority" options={['ROUTINE', 'URGENT', 'STAT'].map((p) => ({ value: p, label: p }))} sx={{ mt: 1 }} />
          <FormTextField control={control} name="notes" label="Notes" multiline minRows={2} sx={{ mt: 1 }} />
        </Box>
      </SectionFormDialog>
    </SectionCard>
  );
}
