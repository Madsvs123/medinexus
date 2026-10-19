import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Link, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import MedicationIcon from '@mui/icons-material/Medication';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { PageHeader, DataTable, StatusChip, SearchField, FormTextField, EmptyState, ErrorAlert, ConfirmDialog, MoneyText } from '../../../components/ui';
import { useDebounce } from '../../../hooks/useDebounce';
import { useDeleteMedicationMutation, useGetMedicationsQuery, useStockAdjustMutation } from '../api';
import type { Medication } from '../types';
import { MEDICATION_CATEGORIES } from '../types';

const adjustSchema = z.object({
  quantity: z.coerce.number().int().refine((v) => v !== 0, 'Quantity cannot be zero'),
  reason: z.string().min(1, 'Reason required'),
});

type AdjustValues = z.infer<typeof adjustSchema>;

export default function MedicationList() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [adjustTarget, setAdjustTarget] = useState<Medication | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Medication | null>(null);
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isFetching, error } = useGetMedicationsQuery({
    page,
    page_size: pageSize,
    search: debouncedSearch || undefined,
    category: category || undefined,
    low_stock: lowStock || undefined,
  });
  const [stockAdjust] = useStockAdjustMutation();
  const [deleteMedication] = useDeleteMedicationMutation();

  const { control, handleSubmit, reset } = useForm<AdjustValues>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { quantity: 0, reason: '' },
  });

  const columns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Medication',
        render: (r: Medication) => (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.name}</Typography>
            <Typography variant="caption" color="text.secondary">{r.code} • {r.generic_name || '—'} • {r.strength}</Typography>
          </Box>
        ),
      },
      { key: 'category', label: 'Category', render: (r: Medication) => <StatusChip status={r.category} /> },
      { key: 'form', label: 'Form', render: (r: Medication) => r.form },
      {
        key: 'stock',
        label: 'Stock',
        render: (r: Medication) => (
          <Typography variant="body2" color={r.current_stock <= r.reorder_level ? 'error.main' : 'inherit'} sx={{ fontWeight: 600 }}>
            {r.current_stock} {r.unit}
            {r.current_stock <= r.reorder_level ? ' (low)' : ''}
          </Typography>
        ),
      },
      { key: 'reorder', label: 'Reorder level', render: (r: Medication) => r.reorder_level },
      { key: 'price', label: 'Price', render: (r: Medication) => <MoneyText value={r.price} /> },
      { key: 'status', label: 'Status', render: (r: Medication) => <StatusChip status={r.active ? 'ACTIVE' : 'INACTIVE'} /> },
      {
        key: 'actions',
        label: '',
        render: (r: Medication) => (
          <Stack direction="row" spacing={0.5}>
            <Button size="small" variant="outlined" onClick={() => setAdjustTarget(r)}>Adjust</Button>
            <Link component={RouterLink} to={`/pharmacy/medications/${r.id}/edit`} aria-label={`Edit ${r.name}`}>
              <EditIcon fontSize="small" />
            </Link>
            <Button size="small" variant="outlined" color="error" onClick={() => setDeleteTarget(r)}>Delete</Button>
          </Stack>
        ),
      },
    ],
    [],
  );

  const onAdjust = handleSubmit(async (values: AdjustValues) => {
    if (!adjustTarget) return;
    try {
      const updated = await stockAdjust({ id: adjustTarget.id, quantity: values.quantity, reason: values.reason }).unwrap();
      enqueueSnackbar(`Stock updated — now ${updated.current_stock}`, { variant: 'success' });
      setAdjustTarget(null);
      reset();
    } catch {
      enqueueSnackbar('Stock adjustment failed', { variant: 'error' });
    }
  });

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMedication(deleteTarget.id).unwrap();
      enqueueSnackbar('Medication deleted', { variant: 'success' });
      setDeleteTarget(null);
    } catch {
      enqueueSnackbar('Failed to delete medication', { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader
        title="Medications"
        subtitle="Formulary and stock management"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/pharmacy/medications/new')}>
            New Medication
          </Button>
        }
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Box sx={{ flexGrow: 1, maxWidth: 400 }}>
          <SearchField value={search} onChange={(v: string) => { setSearch(v); setPage(1); }} placeholder="Search name, code, generic…" />
        </Box>
        <Box sx={{ width: 220 }}>
          <TextField select size="small" label="Category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} fullWidth>
            <MenuItem value="">All categories</MenuItem>
            {MEDICATION_CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>
        </Box>
        <Button variant={lowStock ? 'contained' : 'outlined'} color={lowStock ? 'warning' : 'primary'} onClick={() => { setLowStock(!lowStock); setPage(1); }}>
          Low stock only
        </Button>
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
        emptyState={<EmptyState icon={<MedicationIcon />} title="No medications" hint="Add medications to the formulary." />}
      />
      <Dialog open={!!adjustTarget} onClose={() => setAdjustTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Stock adjust — {adjustTarget?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Current stock: {adjustTarget?.current_stock} {adjustTarget?.unit}. Use a negative value to deduct.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormTextField control={control} name="quantity" label="Quantity (signed delta)" type="number" required />
            </Grid>
            <Grid item xs={12}>
              <FormTextField control={control} name="reason" label="Reason" required multiline minRows={2} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustTarget(null)}>Cancel</Button>
          <Button variant="contained" onClick={onAdjust}>Apply</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete medication?"
        message="This removes the medication from the formulary."
        confirmLabel="Delete"
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
