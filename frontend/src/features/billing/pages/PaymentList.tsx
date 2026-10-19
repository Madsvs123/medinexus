import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Pagination,
  TextField,
  Typography,
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import { Link as RouterLink } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { PageHeader, DataTable, StatusChip, EmptyState } from '../../../components/ui';
import { formatCurrency, formatDateTime } from '../../../utils/format';
import { useGetPaymentsQuery, useRefundPaymentMutation } from '../api';
import { num, patientLabel, type Payment } from '../types';
import { useDebouncedValue } from '../components/PatientAutocomplete';

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

export default function PaymentList() {
  const [page, setPage] = useState(1);
  const [patientSearch, setPatientSearch] = useState('');
  const patientQ = useDebouncedValue(patientSearch);
  const { enqueueSnackbar } = useSnackbar();

  const params = useMemo(
    () => ({ page, page_size: 20, ...(patientQ ? { patient: patientQ } : {}) }),
    [page, patientQ],
  );
  const { data, isLoading, error } = useGetPaymentsQuery(params);

  const [refundPayment] = useRefundPaymentMutation();
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const openRefund = (p: Payment) => {
    setRefundTarget(p);
    setAmount(String(num(p.amount)));
    setReason('');
  };

  const handleRefund = async () => {
    if (!refundTarget) return;
    try {
      await refundPayment({ id: refundTarget.id, amount: Number(amount), reason }).unwrap();
      enqueueSnackbar('Refund requested', { variant: 'success' });
      setRefundTarget(null);
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'date',
        label: 'Date',
        render: (r: Payment) => formatDateTime(r.paid_at),
      },
      {
        key: 'invoice',
        label: 'Invoice',
        render: (r: Payment) =>
          r.invoice ? (
            <Box
              component={RouterLink}
              to={`/billing/invoices/${r.invoice}`}
              sx={{ color: 'primary.main', textDecoration: 'none' }}
            >
              #{r.invoice}
            </Box>
          ) : (
            'Deposit'
          ),
      },
      { key: 'patient', label: 'Patient', render: (r: Payment) => patientLabel(r.patient) },
      { key: 'method', label: 'Method', render: (r: Payment) => r.method },
      { key: 'amount', label: 'Amount', align: 'right' as const, render: (r: Payment) => formatCurrency(num(r.amount)) },
      { key: 'reference', label: 'Reference', render: (r: Payment) => r.reference || '—' },
      { key: 'status', label: 'Status', render: (r: Payment) => <StatusChip status={r.status} /> },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right' as const,
        render: (r: Payment) =>
          r.status === 'COMPLETED' ? (
            <Button size="small" color="error" variant="outlined" onClick={() => openRefund(r)}>
              Refund
            </Button>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <Box>
      <PageHeader title="Payments" subtitle="All recorded payments" />
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
        <EmptyState icon={<PaymentsIcon />} title="No payments found" hint="Payments will appear here once recorded." />
      ) : (
        <DataTable columns={columns} rows={data?.results ?? []} loading={isLoading} rowKey={(r) => String(r.id)} />
      )}

      {(data?.count ?? 0) > 20 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination page={page} count={Math.ceil((data?.count ?? 0) / 20)} onChange={(_e, p) => setPage(p)} />
        </Box>
      )}

      <Dialog open={refundTarget !== null} onClose={() => setRefundTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Request refund</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {refundTarget && (
              <Typography variant="body2" color="text.secondary">
                Payment of {formatCurrency(num(refundTarget.amount))} by {refundTarget.method} on {formatDateTime(refundTarget.paid_at)}.
              </Typography>
            )}
            <TextField
              label="Amount"
              type="number"
              fullWidth
              size="small"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputProps={{ min: 0, step: '0.01' }}
            />
            <TextField
              label="Reason"
              fullWidth
              size="small"
              multiline
              minRows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefundTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" disabled={!Number(amount) || Number(amount) <= 0 || !reason.trim()} onClick={() => void handleRefund()}>
            Request refund
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
