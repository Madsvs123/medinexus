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
  MenuItem,
  Pagination,
  TextField,
} from '@mui/material';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import { useSnackbar } from 'notistack';
import { PageHeader, DataTable, StatusChip, EmptyState, ConfirmDialog } from '../../../components/ui';
import { formatCurrency, formatDateTime } from '../../../utils/format';
import { useGetRefundsQuery, useProcessRefundMutation } from '../api';
import { num, type Refund, type RefundStatus } from '../types';

const STATUSES: RefundStatus[] = ['PENDING', 'COMPLETED', 'REJECTED'];

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

export default function RefundList() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  const params = useMemo(
    () => ({ page, page_size: 20, ...(status ? { status } : {}) }),
    [page, status],
  );
  const { data, isLoading, error } = useGetRefundsQuery(params);

  const [processRefund] = useProcessRefundMutation();
  const [target, setTarget] = useState<Refund | null>(null);
  const [approve, setApprove] = useState(false);

  const handleProcess = async () => {
    if (!target) return;
    try {
      await processRefund({ id: target.id, approved: approve }).unwrap();
      enqueueSnackbar(approve ? 'Refund approved and processed' : 'Refund rejected', { variant: 'success' });
      setTarget(null);
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const columns = useMemo(
    () => [
      { key: 'id', label: 'Refund', render: (r: Refund) => `#${r.id}` },
      {
        key: 'payment',
        label: 'Payment',
        render: (r: Refund) => (typeof r.payment === 'object' ? `#${r.payment.id} (${r.payment.method})` : `#${r.payment}`),
      },
      { key: 'amount', label: 'Amount', align: 'right' as const, render: (r: Refund) => formatCurrency(num(r.amount)) },
      { key: 'reason', label: 'Reason', render: (r: Refund) => r.reason || '—' },
      { key: 'requested', label: 'Requested', render: (r: Refund) => formatDateTime(r.created_at) },
      { key: 'status', label: 'Status', render: (r: Refund) => <StatusChip status={r.status} /> },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right' as const,
        render: (r: Refund) =>
          r.status === 'PENDING' ? (
            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
              <Button
                size="small"
                color="success"
                variant="outlined"
                onClick={() => {
                  setTarget(r);
                  setApprove(true);
                }}
              >
                Approve
              </Button>
              <Button
                size="small"
                color="error"
                variant="outlined"
                onClick={() => {
                  setTarget(r);
                  setApprove(false);
                }}
              >
                Reject
              </Button>
            </Box>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <Box>
      <PageHeader title="Refunds" subtitle="Process refund requests" />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            label="Status"
            size="small"
            fullWidth
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="">All statuses</MenuItem>
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      {error && <Chip label={getErr(error)} color="error" sx={{ mb: 2 }} />}

      {!isLoading && (data?.results.length ?? 0) === 0 ? (
        <EmptyState icon={<CurrencyExchangeIcon />} title="No refunds found" hint="Refund requests will appear here." />
      ) : (
        <DataTable columns={columns} rows={data?.results ?? []} loading={isLoading} rowKey={(r) => String(r.id)} />
      )}

      {(data?.count ?? 0) > 20 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination page={page} count={Math.ceil((data?.count ?? 0) / 20)} onChange={(_e, p) => setPage(p)} />
        </Box>
      )}

      <ConfirmDialog
        open={target !== null}
        title={approve ? 'Approve refund?' : 'Reject refund?'}
        message={
          target
            ? approve
              ? `This will mark refund #${target.id} (${formatCurrency(num(target.amount))}) as completed and reverse the payment.`
              : `This will reject refund #${target.id} (${formatCurrency(num(target.amount))}).`
            : undefined
        }
        confirmLabel={approve ? 'Approve' : 'Reject'}
        severity={approve ? undefined : 'error'}
        onConfirm={() => void handleProcess()}
        onCancel={() => setTarget(null)}
      />
    </Box>
  );
}
