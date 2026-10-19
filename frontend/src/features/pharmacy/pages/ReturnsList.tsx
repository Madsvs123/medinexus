import { useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { PageHeader, DataTable, FormTextField, FormAutocomplete, EmptyState, ErrorAlert } from '../../../components/ui';
import { useCreateReturnMutation, useGetBatchesQuery, useGetReturnsQuery, useUpdateReturnMutation } from '../api';
import type { StockReturn } from '../types';
import { returnBatchLabel, userName } from '../types';

const returnSchema = z.object({
  batch: z.number({ invalid_type_error: 'Select a batch' }),
  quantity: z.coerce.number().int().min(1),
  reason: z.string().min(1, 'Reason required'),
});

type ReturnValues = z.infer<typeof returnSchema>;

export default function ReturnsList() {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading, error } = useGetReturnsQuery({ page_size: 100 });
  const { data: batchesData } = useGetBatchesQuery({ page_size: 500 });
  const [createReturn, { isLoading: saving }] = useCreateReturnMutation();
  const [updateReturn] = useUpdateReturnMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StockReturn | null>(null);
  const batches = useMemo(() => batchesData?.results ?? [], [batchesData]);

  const { control, handleSubmit, reset } = useForm<ReturnValues>({
    resolver: zodResolver(returnSchema),
    defaultValues: { batch: undefined as unknown as number, quantity: 1, reason: '' },
  });

  const columns = useMemo(
    () => [
      { key: 'batch', label: 'Batch', render: (r: StockReturn) => returnBatchLabel(r.batch) },
      { key: 'quantity', label: 'Qty', render: (r: StockReturn) => r.quantity },
      { key: 'reason', label: 'Reason', render: (r: StockReturn) => r.reason },
      {
        key: 'returned',
        label: 'Returned',
        render: (r: StockReturn) => (
          <Box>
            <Typography variant="body2">{dayjs(r.returned_at).format('DD MMM YYYY HH:mm')}</Typography>
            <Typography variant="caption" color="text.secondary">{userName(r.returned_by)}</Typography>
          </Box>
        ),
      },
    ],
    [],
  );

  const onSave = handleSubmit(async (values: ReturnValues) => {
    try {
      if (editing) {
        await updateReturn({ id: editing.id, body: values }).unwrap();
        enqueueSnackbar('Return updated', { variant: 'success' });
      } else {
        await createReturn(values).unwrap();
        enqueueSnackbar('Return recorded — stock restored', { variant: 'success' });
      }
      setOpen(false);
      setEditing(null);
      reset();
    } catch {
      enqueueSnackbar('Failed to save return', { variant: 'error' });
    }
  });

  return (
    <Box>
      <PageHeader
        title="Stock returns"
        subtitle="Returned goods from batches"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); reset(); setOpen(true); }}>
            Record return
          </Button>
        }
      />
      {error && <ErrorAlert error={error} />}
      <DataTable
        columns={columns}
        rows={data?.results ?? []}
        loading={isLoading}
        rowKey={(r) => String(r.id)}
        emptyState={<EmptyState icon={<AssignmentReturnIcon />} title="No returns" hint="Record returned stock to restore batch quantities." />}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit return' : 'Record return'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Controller
                control={control}
                name="batch"
                render={({ field, fieldState }) => (
                  <FormAutocomplete
                    label="Batch"
                    options={batches}
                    getOptionLabel={(b) => `${b.batch_no} — ${b.medication && typeof b.medication === 'object' ? b.medication.name : ''} (${b.quantity} left)`}
                    value={batches.find((b) => b.id === field.value) ?? null}
                    onChange={(b) => field.onChange(b?.id ?? null)}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    required
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="quantity" label="Quantity" type="number" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="reason" label="Reason" required />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={onSave} disabled={saving}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
