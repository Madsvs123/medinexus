import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Pagination,
  TextField,
  Typography,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AddIcon from '@mui/icons-material/Add';
import { useSnackbar } from 'notistack';
import { PageHeader, DataTable, StatusChip, EmptyState } from '../../../components/ui';
import { formatCurrency, formatDateTime } from '../../../utils/format';
import {
  useGetDepositsQuery,
  useCreateDepositMutation,
  useApplyDepositMutation,
  useGetInvoicesQuery,
} from '../api';
import { num, patientLabel, type Deposit } from '../types';
import { useDebouncedValue } from '../components/PatientAutocomplete';
import PatientAutocomplete from '../components/PatientAutocomplete';

const depositSchema = z.object({
  patient: z.custom<{ id: number; label: string } | null>((v) => !!v && typeof v === 'object' && 'id' in v, 'Patient is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  method: z.enum(['CASH', 'CARD', 'BANK', 'ONLINE']),
  reference: z.string().optional(),
});

type DepositFormValues = z.infer<typeof depositSchema>;

function getErr(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = (e as { data?: unknown }).data as Record<string, unknown> | undefined;
    if (data?.detail) return String(data.detail);
    const first = Object.values(data ?? {}).find((v) => v !== undefined && v !== null);
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
    if (typeof first === 'number') return String(first);
  }
  return 'Something went wrong. Please try again.';
}

export default function DepositList() {
  const [page, setPage] = useState(1);
  const [patientSearch, setPatientSearch] = useState('');
  const patientQ = useDebouncedValue(patientSearch);
  const { enqueueSnackbar } = useSnackbar();

  const params = useMemo(
    () => ({ page, page_size: 20, ...(patientQ ? { patient: patientQ } : {}) }),
    [page, patientQ],
  );
  const { data, isLoading, error } = useGetDepositsQuery(params);

  const [createOpen, setCreateOpen] = useState(false);
  const [applyTarget, setApplyTarget] = useState<Deposit | null>(null);
  const [applyInvoice, setApplyInvoice] = useState('');
  const [applyAmount, setApplyAmount] = useState('');

  const [applyDeposit] = useApplyDepositMutation();

  const applyPatientId = useMemo(() => {
    if (!applyTarget) return undefined;
    return typeof applyTarget.patient === 'object' ? applyTarget.patient.id : applyTarget.patient;
  }, [applyTarget]);

  const { data: invoicesData } = useGetInvoicesQuery(
    { patient: applyPatientId, page_size: 100 },
    { skip: !applyPatientId },
  );
  const outstandingInvoices = useMemo(
    () =>
      (invoicesData?.results ?? []).filter(
        (inv) => (inv.status === 'ISSUED' || inv.status === 'PARTIAL') && num(inv.total) - num(inv.paid_amount) > 0,
      ),
    [invoicesData],
  );

  const handleApply = async () => {
    if (!applyTarget) return;
    try {
      await applyDeposit({
        id: applyTarget.id,
        invoice_id: Number(applyInvoice),
        amount: Number(applyAmount),
      }).unwrap();
      enqueueSnackbar('Deposit applied to invoice', { variant: 'success' });
      setApplyTarget(null);
      setApplyInvoice('');
      setApplyAmount('');
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const columns = useMemo(
    () => [
      { key: 'id', label: 'Deposit', render: (r: Deposit) => `#${r.id}` },
      { key: 'patient', label: 'Patient', render: (r: Deposit) => patientLabel(r.patient) },
      { key: 'amount', label: 'Amount', align: 'right' as const, render: (r: Deposit) => formatCurrency(num(r.amount)) },
      { key: 'balance', label: 'Balance', align: 'right' as const, render: (r: Deposit) => formatCurrency(num(r.balance)) },
      { key: 'method', label: 'Method', render: (r: Deposit) => r.method },
      { key: 'reference', label: 'Reference', render: (r: Deposit) => r.reference || '—' },
      { key: 'date', label: 'Created', render: (r: Deposit) => formatDateTime(r.created_at) },
      { key: 'status', label: 'Status', render: (r: Deposit) => <StatusChip status={r.status} /> },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right' as const,
        render: (r: Deposit) =>
          r.status === 'ACTIVE' && num(r.balance) > 0 ? (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setApplyTarget(r);
                setApplyAmount(String(num(r.balance)));
                setApplyInvoice('');
              }}
            >
              Apply to invoice
            </Button>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <Box>
      <PageHeader
        title="Deposits"
        subtitle="Patient prepayment wallet"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New deposit
          </Button>
        }
      />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Patient (name / MRN)"
            size="small"
            fullWidth
            value={patientSearch}
            onChange={(e) => {
              setPatientSearch(e.target.value);
              setPage(1);
            }}
          />
        </Grid>
      </Grid>

      {error && <Chip label={getErr(error)} color="error" sx={{ mb: 2 }} />}

      {!isLoading && (data?.results.length ?? 0) === 0 ? (
        <EmptyState
          icon={<AccountBalanceWalletIcon />}
          title="No deposits found"
          hint="Create a deposit to start a prepayment wallet."
          action={
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
              New deposit
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={data?.results ?? []} loading={isLoading} rowKey={(r) => String(r.id)} />
      )}

      {(data?.count ?? 0) > 20 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination page={page} count={Math.ceil((data?.count ?? 0) / 20)} onChange={(_e, p) => setPage(p)} />
        </Box>
      )}

      {createOpen && <CreateDepositDialog open onClose={() => setCreateOpen(false)} />}

      <Dialog open={applyTarget !== null} onClose={() => setApplyTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Apply deposit to invoice</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {applyTarget && (
              <Typography variant="body2" color="text.secondary">
                {patientLabel(applyTarget.patient)} — available balance {formatCurrency(num(applyTarget.balance))}
              </Typography>
            )}
            <TextField
              select
              label="Invoice"
              fullWidth
              size="small"
              value={applyInvoice}
              onChange={(e) => setApplyInvoice(e.target.value)}
            >
              {outstandingInvoices.length === 0 && <MenuItem value="">No outstanding invoices</MenuItem>}
              {outstandingInvoices.map((inv) => (
                <MenuItem key={inv.id} value={inv.id}>
                  {inv.invoice_number} — due {formatCurrency(num(inv.total) - num(inv.paid_amount))}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Amount"
              type="number"
              fullWidth
              size="small"
              value={applyAmount}
              onChange={(e) => setApplyAmount(e.target.value)}
              inputProps={{ min: 0.01, step: '0.01' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApplyTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              !applyInvoice ||
              !Number(applyAmount) ||
              Number(applyAmount) <= 0 ||
              (applyTarget ? Number(applyAmount) > num(applyTarget.balance) : false)
            }
            onClick={() => void handleApply()}
          >
            Apply deposit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function CreateDepositDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [createDeposit] = useCreateDepositMutation();
  const { control, handleSubmit, reset, formState } = useForm<DepositFormValues>({
    resolver: zodResolver(depositSchema),
    defaultValues: { patient: null, amount: undefined, method: 'CASH', reference: '' },
  });

  const onSubmit = async (values: DepositFormValues) => {
    try {
      await createDeposit({
        patient: values.patient?.id,
        amount: values.amount,
        method: values.method,
        reference: values.reference || undefined,
      }).unwrap();
      enqueueSnackbar('Deposit created', { variant: 'success' });
      reset();
      onClose();
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>New deposit</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <PatientAutocomplete name="patient" control={control} label="Patient *" />
            <Controller
              name="amount"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  label="Amount"
                  type="number"
                  fullWidth
                  size="small"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  inputProps={{ min: 0.01, step: '0.01' }}
                />
              )}
            />
            <Controller
              name="method"
              control={control}
              render={({ field }) => (
                <TextField select label="Method" fullWidth size="small" value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                  {['CASH', 'CARD', 'BANK', 'ONLINE'].map((m) => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="reference"
              control={control}
              render={({ field }) => (
                <TextField label="Reference" fullWidth size="small" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)} />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={formState.isSubmitting}>
            Create deposit
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
