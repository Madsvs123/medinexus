import { useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { PageHeader, DataTable, StatusChip, FormAutocomplete, EmptyState, ErrorAlert, ConfirmDialog } from '../../../components/ui';
import { useCancelTransferMutation, useCompleteTransferMutation, useCreateTransferMutation, useGetMedicationsQuery, useGetPharmacyBranchesQuery, useGetTransfersQuery } from '../api';
import type { StockTransfer } from '../types';
import { branchName, userName } from '../types';

interface TransferLine {
  medication_id: number;
  quantity: number;
}

const lineSchema = z.object({
  medication: z.number({ invalid_type_error: 'Select a medication' }),
  quantity: z.coerce.number().int().min(1),
});

export default function TransfersList() {
  const { enqueueSnackbar } = useSnackbar();
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading, error } = useGetTransfersQuery({ page_size: 100, status: statusFilter || undefined });
  const { data: branchesData } = useGetPharmacyBranchesQuery({ page_size: 100 });
  const { data: medsData } = useGetMedicationsQuery({ page_size: 200 });
  const [createTransfer, { isLoading: saving }] = useCreateTransferMutation();
  const [completeTransfer] = useCompleteTransferMutation();
  const [cancelTransfer] = useCancelTransferMutation();
  const [open, setOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<StockTransfer | null>(null);
  const branches = useMemo(() => branchesData?.results ?? [], [branchesData]);
  const meds = useMemo(() => medsData?.results ?? [], [medsData]);
  const [fromBranch, setFromBranch] = useState<number | null>(null);
  const [toBranch, setToBranch] = useState<number | null>(null);
  const [lines, setLines] = useState<TransferLine[]>([]);

  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(lineSchema),
    defaultValues: { medication: undefined as unknown as number, quantity: 1 },
  });

  const columns = useMemo(
    () => [
      { key: 'from', label: 'From branch', render: (r: StockTransfer) => branchName(r.from_branch) },
      { key: 'to', label: 'To branch', render: (r: StockTransfer) => branchName(r.to_branch) },
      {
        key: 'items',
        label: 'Items',
        render: (r: StockTransfer) =>
          r.items.map((i) => `${meds.find((m) => m.id === i.medication_id)?.name ?? `Med #${i.medication_id}`} ×${i.quantity}`).join(', '),
      },
      { key: 'status', label: 'Status', render: (r: StockTransfer) => <StatusChip status={r.status} /> },
      {
        key: 'requested',
        label: 'Requested by',
        render: (r: StockTransfer) => `${userName(r.requested_by)}${r.created_at ? ` • ${dayjs(r.created_at).format('DD MMM')}` : ''}`,
      },
      {
        key: 'actions',
        label: '',
        render: (r: StockTransfer) =>
          r.status === 'PENDING' ? (
            <Stack direction="row" spacing={0.5}>
              <Button size="small" variant="contained" color="success" onClick={async () => {
                await completeTransfer(r.id).unwrap();
                enqueueSnackbar('Transfer completed — stock moved', { variant: 'success' });
              }}>
                Complete
              </Button>
              <Button size="small" variant="outlined" color="error" onClick={() => setCancelTarget(r)}>Cancel</Button>
            </Stack>
          ) : null,
      },
    ],
    [meds],
  );

  const addLine = handleSubmit((values) => {
    setLines((prev) => [...prev, { medication_id: values.medication, quantity: values.quantity }]);
    reset();
  });

  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const doCreate = async () => {
    if (!fromBranch || !toBranch) {
      enqueueSnackbar('Select both branches', { variant: 'warning' });
      return;
    }
    if (fromBranch === toBranch) {
      enqueueSnackbar('Branches must differ', { variant: 'warning' });
      return;
    }
    if (lines.length === 0) {
      enqueueSnackbar('Add at least one item', { variant: 'warning' });
      return;
    }
    try {
      await createTransfer({ from_branch: fromBranch, to_branch: toBranch, items: lines, status: 'PENDING' }).unwrap();
      enqueueSnackbar('Transfer requested', { variant: 'success' });
      setOpen(false);
      setLines([]);
      setFromBranch(null);
      setToBranch(null);
    } catch {
      enqueueSnackbar('Failed to create transfer', { variant: 'error' });
    }
  };

  const doCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelTransfer(cancelTarget.id).unwrap();
      enqueueSnackbar('Transfer cancelled', { variant: 'success' });
      setCancelTarget(null);
    } catch {
      enqueueSnackbar('Failed to cancel transfer', { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader
        title="Stock transfers"
        subtitle="Move stock between branches"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>New transfer</Button>
        }
      />
      <Box sx={{ width: 220, mb: 2 }}>
        <TextField select size="small" label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} fullWidth>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="PENDING">Pending</MenuItem>
          <MenuItem value="COMPLETED">Completed</MenuItem>
          <MenuItem value="CANCELLED">Cancelled</MenuItem>
        </TextField>
      </Box>
      {error && <ErrorAlert error={error} />}
      <DataTable
        columns={columns}
        rows={data?.results ?? []}
        loading={isLoading}
        rowKey={(r) => String(r.id)}
        emptyState={<EmptyState icon={<SwapHorizIcon />} title="No transfers" hint="Request stock movement between branches." />}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New stock transfer</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <Controller
                control={control}
                name="medication"
                render={({ field }) => (
                  <FormAutocomplete
                    label="Medication"
                    options={meds}
                    getOptionLabel={(m) => `${m.name}${m.strength ? ` ${m.strength}` : ''}`}
                    value={meds.find((m) => m.id === field.value) ?? null}
                    onChange={(m) => field.onChange(m?.id ?? null)}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Quantity" type="number" size="small" fullWidth {...control.register('quantity')} />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button variant="contained" onClick={addLine} sx={{ mt: 0.5 }}>Add</Button>
            </Grid>
            <Grid item xs={12}>
              {lines.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No items added.</Typography>
              ) : (
                lines.map((l, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                      {meds.find((m) => m.id === l.medication_id)?.name ?? `Med #${l.medication_id}`} × {l.quantity}
                    </Typography>
                    <IconButton size="small" color="error" aria-label="Remove line" onClick={() => removeLine(i)}>✕</IconButton>
                  </Stack>
                ))
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormAutocomplete
                label="From branch"
                options={branches}
                getOptionLabel={(b) => b.name}
                value={branches.find((b) => b.id === fromBranch) ?? null}
                onChange={(b) => setFromBranch(b?.id ?? null)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormAutocomplete
                label="To branch"
                options={branches}
                getOptionLabel={(b) => b.name}
                value={branches.find((b) => b.id === toBranch) ?? null}
                onChange={(b) => setToBranch(b?.id ?? null)}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={doCreate} disabled={saving}>Request transfer</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel transfer?"
        message="The transfer will be voided and no stock will move."
        confirmLabel="Cancel transfer"
        onConfirm={doCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </Box>
  );
}
