import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Link,
  MenuItem,
  Pagination,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useSnackbar } from 'notistack';
import { PageHeader, DataTable, StatusChip, EmptyState } from '../../../components/ui';
import { formatCurrency, formatDate } from '../../../utils/format';
import { useGetInvoicesQuery, useVoidInvoiceMutation, useIssueInvoiceMutation } from '../api';
import { num, patientLabel, type Invoice, type InvoiceStatus } from '../types';
import { useDebouncedValue } from '../components/PatientAutocomplete';

const STATUSES: InvoiceStatus[] = ['DRAFT', 'ISSUED', 'PARTIAL', 'PAID', 'VOID', 'REFUNDED'];

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

export default function InvoiceList() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [date, setDate] = useState('');
  const patientQ = useDebouncedValue(patientSearch);
  const { enqueueSnackbar } = useSnackbar();

  const params = useMemo(
    () => ({
      page,
      page_size: 20,
      ...(status ? { status } : {}),
      ...(date ? { date } : {}),
      ...(patientQ ? { patient: patientQ } : {}),
    }),
    [page, status, date, patientQ],
  );
  const { data, isLoading, error } = useGetInvoicesQuery(params);

  const [issueInvoice] = useIssueInvoiceMutation();
  const [voidInvoice] = useVoidInvoiceMutation();
  const [voidTarget, setVoidTarget] = useState<Invoice | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const handleIssue = async (id: number) => {
    try {
      await issueInvoice(id).unwrap();
      enqueueSnackbar('Invoice issued', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const handleVoid = async () => {
    if (!voidTarget) return;
    try {
      await voidInvoice({ id: voidTarget.id, reason: voidReason || 'No reason provided' }).unwrap();
      enqueueSnackbar('Invoice voided', { variant: 'success' });
      setVoidTarget(null);
      setVoidReason('');
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'number',
        label: 'Invoice',
        render: (r: Invoice) => (
          <Link component={RouterLink} to={`/billing/invoices/${r.id}`} underline="hover" fontWeight={600}>
            {r.invoice_number}
          </Link>
        ),
      },
      { key: 'patient', label: 'Patient', render: (r: Invoice) => patientLabel(r.patient) },
      {
        key: 'total',
        label: 'Total',
        align: 'right' as const,
        render: (r: Invoice) => (
          <Box>
            <Typography variant="body2" fontWeight={r.status === 'ISSUED' || r.status === 'PARTIAL' ? 700 : 400}>
              {formatCurrency(num(r.total))}
            </Typography>
            {r.status !== 'PAID' && r.status !== 'VOID' && r.status !== 'REFUNDED' && num(r.total) - num(r.paid_amount) > 0 && (
              <Typography variant="caption" color="error.main">
                Due {formatCurrency(num(r.total) - num(r.paid_amount))}
              </Typography>
            )}
          </Box>
        ),
      },
      { key: 'paid', label: 'Paid', align: 'right' as const, render: (r: Invoice) => formatCurrency(num(r.paid_amount)) },
      { key: 'date', label: 'Issued', render: (r: Invoice) => (r.issued_at ? formatDate(r.issued_at) : '—') },
      { key: 'status', label: 'Status', render: (r: Invoice) => <StatusChip status={r.status} /> },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right' as const,
        render: (r: Invoice) => (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
            {r.status === 'DRAFT' && (
              <Button size="small" variant="outlined" onClick={() => void handleIssue(r.id)}>
                Issue
              </Button>
            )}
            {(r.status === 'ISSUED' || r.status === 'PARTIAL' || r.status === 'DRAFT') && (
              <Button size="small" color="error" variant="text" onClick={() => setVoidTarget(r)}>
                Void
              </Button>
            )}
          </Box>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <Box>
      <PageHeader
        title="Invoices"
        subtitle="Manage patient invoices"
        actions={
          <Button component={RouterLink} to="/billing/invoices/new" variant="contained" startIcon={<AddIcon />}>
            New invoice
          </Button>
        }
      />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}>
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
        <Grid item xs={12} sm={4}>
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
              <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            label="Issued date"
            size="small"
            fullWidth
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setPage(1);
            }}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      </Grid>

      {error && <Chip label={getErr(error)} color="error" sx={{ mb: 2 }} />}

      {!isLoading && (data?.results.length ?? 0) === 0 ? (
        <EmptyState
          icon={<ReceiptLongIcon />}
          title="No invoices found"
          hint="Adjust your filters or create a new invoice."
          action={
            <Button component={RouterLink} to="/billing/invoices/new" variant="contained" startIcon={<AddIcon />}>
              New invoice
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

      {voidTarget && (
        <VoidDialog
          open
          invoice={voidTarget}
          reason={voidReason}
          onReasonChange={setVoidReason}
          onConfirm={() => void handleVoid()}
          onCancel={() => setVoidTarget(null)}
        />
      )}
    </Box>
  );
}

function VoidDialog({
  open,
  invoice,
  reason,
  onReasonChange,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  invoice: Invoice;
  reason: string;
  onReasonChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
      <DialogTitle>Void invoice {invoice.invoice_number}?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          This cannot be undone. The invoice total ({formatCurrency(num(invoice.total))}) will no longer be collectible.
        </Typography>
        <TextField
          autoFocus
          label="Reason (required)"
          fullWidth
          size="small"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button color="error" variant="contained" disabled={!reason.trim()} onClick={onConfirm}>
          Void invoice
        </Button>
      </DialogActions>
    </Dialog>
  );
}
