import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useSnackbar } from 'notistack';
import { PageHeader, StatusChip, EmptyState } from '../../../components/ui';
import { formatCurrency, formatDate } from '../../../utils/format';
import { useGetPortalInvoicesQuery, usePayPortalInvoiceMutation } from '../api';
import type { PortalInvoice } from '../types';

function getErr(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = (e as { data?: unknown }).data as Record<string, unknown> | undefined;
    if (data?.detail) return String(data.detail);
    const first = Object.values(data ?? {}).find((v) => v !== undefined && v !== null);
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return 'Payment failed. Please try again.';
}

export default function PortalInvoices() {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading, error } = useGetPortalInvoicesQuery();
  const [payTarget, setPayTarget] = useState<PortalInvoice | null>(null);
  const [method, setMethod] = useState('ONLINE');
  const [pay] = usePayPortalInvoiceMutation();

  const totalOutstanding = (data ?? []).reduce((sum, inv) => {
    if (inv.status === 'ISSUED' || inv.status === 'PARTIAL') {
      return sum + (Number(inv.total) - Number(inv.paid_amount));
    }
    return sum;
  }, 0);

  const handlePay = async () => {
    if (!payTarget) return;
    try {
      await pay({ id: payTarget.id, method }).unwrap();
      enqueueSnackbar('Payment submitted — it will be confirmed shortly', { variant: 'success' });
      setPayTarget(null);
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader title="My invoices" subtitle={`Outstanding balance: ${formatCurrency(totalOutstanding)}`} />
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Chip label="Failed to load invoices." color="error" sx={{ mb: 2 }} />}

      {!isLoading && (data?.length ?? 0) === 0 ? (
        <EmptyState icon={<ReceiptLongIcon />} title="No invoices" hint="Invoices from your visits will appear here." />
      ) : (
        <Paper variant="outlined">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Invoice</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Paid</TableCell>
                  <TableCell align="right">Balance</TableCell>
                  <TableCell>Due date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data ?? []).map((inv) => {
                  const balance = Number(inv.total) - Number(inv.paid_amount);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.invoice_number}</TableCell>
                      <TableCell align="right">{formatCurrency(Number(inv.total))}</TableCell>
                      <TableCell align="right">{formatCurrency(Number(inv.paid_amount))}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color={balance > 0 ? 'error.main' : 'success.main'} fontWeight={600}>
                          {formatCurrency(balance)}
                        </Typography>
                      </TableCell>
                      <TableCell>{inv.due_date ? formatDate(inv.due_date) : '—'}</TableCell>
                      <TableCell><StatusChip status={inv.status} /></TableCell>
                      <TableCell align="right">
                        {balance > 0 && (inv.status === 'ISSUED' || inv.status === 'PARTIAL') && (
                          <Button size="small" variant="contained" color="success" onClick={() => setPayTarget(inv)}>
                            Pay now
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog open={payTarget !== null} onClose={() => setPayTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Pay {payTarget?.invoice_number}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Amount due: {payTarget ? formatCurrency(Number(payTarget.total) - Number(payTarget.paid_amount)) : ''}
            </Typography>
            <TextField select label="Payment method" fullWidth size="small" value={method} onChange={(e) => setMethod(e.target.value)}>
              <MenuItem value="ONLINE">Online card</MenuItem>
              <MenuItem value="CARD">Card on arrival</MenuItem>
            </TextField>
            <Typography variant="caption" color="text.secondary">
              Demo payment — a pending payment will be created and confirmed by staff.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayTarget(null)}>Cancel</Button>
          <Button color="success" variant="contained" onClick={() => void handlePay()}>
            Pay {payTarget ? formatCurrency(Number(payTarget.total) - Number(payTarget.paid_amount)) : ''}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
