import { useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import InventoryIcon from '@mui/icons-material/Inventory';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { PageHeader, DataTable, FormTextField, FormAutocomplete, MoneyText, EmptyState, ErrorAlert } from '../../../components/ui';
import { useCreateBatchMutation, useGetBatchesQuery, useGetMedicationsQuery, useGetSuppliersQuery } from '../api';
import type { MedicationBatch } from '../types';
import { batchMedName, batchSupplierName } from '../types';

const batchSchema = z.object({
  medication: z.number({ invalid_type_error: 'Select a medication' }),
  batch_no: z.string().min(1, 'Batch number required'),
  supplier: z.number().nullable().optional(),
  quantity: z.coerce.number().int().min(1),
  expiry_date: z.string().min(1, 'Expiry date required'),
  received_date: z.string().optional(),
  unit_cost: z.coerce.number().min(0).default(0),
});

type BatchValues = z.infer<typeof batchSchema>;

export default function BatchList() {
  const { enqueueSnackbar } = useSnackbar();
  const [filter, setFilter] = useState<'all' | 'expiring' | 'expired'>('all');
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading, isFetching, error } = useGetBatchesQuery({
    page,
    page_size: pageSize,
    expiring_soon: filter === 'expiring' || undefined,
    expired: filter === 'expired' || undefined,
  });
  const { data: medsData } = useGetMedicationsQuery({ page_size: 100 });
  const { data: suppliersData } = useGetSuppliersQuery({ page_size: 100 });
  const [createBatch, { isLoading: saving }] = useCreateBatchMutation();
  const meds = useMemo(() => medsData?.results ?? [], [medsData]);
  const suppliers = useMemo(() => suppliersData?.results ?? [], [suppliersData]);

  const { control, handleSubmit, reset } = useForm<BatchValues>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      medication: undefined as unknown as number,
      batch_no: '',
      supplier: null,
      quantity: 1,
      expiry_date: '',
      received_date: dayjs().format('YYYY-MM-DD'),
      unit_cost: 0,
    },
  });

  const isExpired = (b: MedicationBatch) => dayjs(b.expiry_date).isBefore(dayjs(), 'day');
  const isExpiring = (b: MedicationBatch) => !isExpired(b) && dayjs(b.expiry_date).isBefore(dayjs().add(90, 'day'), 'day');

  const columns = useMemo(
    () => [
      { key: 'medication', label: 'Medication', render: (r: MedicationBatch) => batchMedName(r.medication) },
      { key: 'batch', label: 'Batch no', render: (r: MedicationBatch) => <strong>{r.batch_no}</strong> },
      { key: 'supplier', label: 'Supplier', render: (r: MedicationBatch) => batchSupplierName(r.supplier) },
      { key: 'quantity', label: 'Qty', render: (r: MedicationBatch) => r.quantity },
      {
        key: 'expiry',
        label: 'Expiry',
        render: (r: MedicationBatch) => {
          const expired = isExpired(r);
          const expiring = isExpiring(r);
          return (
            <Box>
              <Typography variant="body2" color={expired ? 'error.main' : expiring ? 'warning.main' : 'inherit'} sx={{ fontWeight: 600 }}>
                {dayjs(r.expiry_date).format('DD MMM YYYY')}
              </Typography>
              {expired && <Typography variant="caption" color="error">EXPIRED</Typography>}
              {expiring && !expired && <Typography variant="caption" color="warning.main">expiring soon</Typography>}
            </Box>
          );
        },
      },
      { key: 'received', label: 'Received', render: (r: MedicationBatch) => dayjs(r.received_date).format('DD MMM YYYY') },
      { key: 'cost', label: 'Unit cost', render: (r: MedicationBatch) => <MoneyText value={r.unit_cost} /> },
    ],
    [],
  );

  const onSave = handleSubmit(async (values: BatchValues) => {
    try {
      await createBatch({
        medication: values.medication,
        batch_no: values.batch_no,
        supplier: values.supplier ?? null,
        quantity: values.quantity,
        expiry_date: dayjs(values.expiry_date as string).format('YYYY-MM-DD'),
        received_date: values.received_date ? dayjs(values.received_date as string).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        unit_cost: values.unit_cost,
      }).unwrap();
      enqueueSnackbar('Batch added to stock', { variant: 'success' });
      setOpen(false);
      reset();
    } catch {
      enqueueSnackbar('Failed to add batch', { variant: 'error' });
    }
  });

  return (
    <Box>
      <PageHeader
        title="Medication batches"
        subtitle="Track lots, suppliers and expiry"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Add batch</Button>
        }
      />
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        {(['all', 'expiring', 'expired'] as const).map((f) => (
          <Button key={f} size="small" variant={filter === f ? 'contained' : 'outlined'} color={f === 'expired' ? 'error' : f === 'expiring' ? 'warning' : 'primary'} onClick={() => { setFilter(f); setPage(1); }}>
            {f === 'all' ? 'All batches' : f === 'expiring' ? 'Expiring ≤90d' : 'Expired'}
          </Button>
        ))}
      </Stack>
      {error && <ErrorAlert error={error} />}
      <DataTable
        columns={columns}
        rows={data?.results ?? []}
        loading={isLoading || isFetching}
        rowKey={(r) => String(r.id)}
        page={page}
        pageSize={pageSize}
        count={data?.count ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(s: number) => { setPageSize(s); setPage(1); }}
        emptyState={<EmptyState icon={<InventoryIcon />} title="No batches" hint="Add a batch to stock a medication." />}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add batch</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
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
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="batch_no" label="Batch number" required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="quantity" label="Quantity" type="number" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="expiry_date" label="Expiry date (YYYY-MM-DD)" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="received_date" label="Received date (YYYY-MM-DD)" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="unit_cost" label="Unit cost" type="number" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                control={control}
                name="supplier"
                render={({ field }) => (
                  <FormAutocomplete
                    label="Supplier (optional)"
                    options={suppliers}
                    getOptionLabel={(s) => s.name}
                    value={suppliers.find((s) => s.id === field.value) ?? null}
                    onChange={(s) => field.onChange(s?.id ?? null)}
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={onSave} disabled={saving}>Add batch</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
