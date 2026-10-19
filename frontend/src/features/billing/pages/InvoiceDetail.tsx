import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  LinearProgress,
  Link,
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { useSnackbar } from 'notistack';
import { PageHeader, StatusChip, EmptyState } from '../../../components/ui';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/format';
import {
  useGetInvoiceQuery,
  useGetPaymentsQuery,
  useGetDepositsQuery,
  useGetClaimsQuery,
  useGetServicesQuery,
  useIssueInvoiceMutation,
  useVoidInvoiceMutation,
  usePayInvoiceMutation,
  useAddInvoiceItemMutation,
} from '../api';
import { num, patientLabel, type Invoice, type InvoiceItem, type Service } from '../types';

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

export default function InvoiceDetail() {
  const { id } = useParams();
  const invoiceId = Number(id);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const { data: invoice, isLoading, error } = useGetInvoiceQuery(invoiceId);
  const patientId = useMemo(() => {
    if (!invoice) return undefined;
    return typeof invoice.patient === 'object' ? invoice.patient.id : invoice.patient;
  }, [invoice]);

  const { data: paymentsData } = useGetPaymentsQuery({ invoice: invoiceId, page_size: 50 });
  const { data: depositsData } = useGetDepositsQuery({ patient: patientId, page_size: 100 }, { skip: !patientId });
  const { data: claimsData } = useGetClaimsQuery({ patient: patientId, page_size: 100 }, { skip: !patientId });
  const linkedClaims = useMemo(
    () => (claimsData?.results ?? []).filter((c) => (typeof c.invoice === 'object' ? c.invoice.id : c.invoice) === invoiceId),
    [claimsData, invoiceId],
  );

  const [issueInvoice] = useIssueInvoiceMutation();
  const [voidInvoice] = useVoidInvoiceMutation();
  const [payInvoice] = usePayInvoiceMutation();
  const [addItem] = useAddInvoiceItemMutation();

  const [payOpen, setPayOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  const remaining = invoice ? num(invoice.total) - num(invoice.paid_amount) : 0;

  const handleIssue = async () => {
    try {
      await issueInvoice(invoiceId).unwrap();
      enqueueSnackbar('Invoice issued', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const handleVoid = async () => {
    try {
      await voidInvoice({ id: invoiceId, reason: voidReason || 'No reason provided' }).unwrap();
      enqueueSnackbar('Invoice voided', { variant: 'success' });
      setVoidOpen(false);
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  if (isLoading) return <LinearProgress />;
  if (error || !invoice) {
    return <Alert severity="error" role="alert">Failed to load invoice.</Alert>;
  }

  return (
    <Box>
      <PageHeader
        title={`Invoice ${invoice.invoice_number}`}
        subtitle={`Patient: ${patientLabel(invoice.patient)} • Created ${formatDate(invoice.created_at)}`}
        actions={
          <>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/billing/invoices')}>
              Back
            </Button>
            <Button
              component={RouterLink}
              to={`/billing/invoices/${invoice.id}/edit`}
              variant="outlined"
              startIcon={<EditIcon />}
              disabled={invoice.status === 'VOID' || invoice.status === 'REFUNDED'}
            >
              Edit
            </Button>
            {invoice.status === 'DRAFT' && (
              <Button variant="contained" onClick={() => void handleIssue()}>
                Issue
              </Button>
            )}
            {(invoice.status === 'ISSUED' || invoice.status === 'PARTIAL') && (
              <Button variant="contained" color="success" onClick={() => setPayOpen(true)}>
                Record payment
              </Button>
            )}
            {invoice.status !== 'VOID' && invoice.status !== 'REFUNDED' && invoice.status !== 'PAID' && (
              <Button color="error" variant="outlined" onClick={() => setVoidOpen(true)}>
                Void
              </Button>
            )}
          </>
        }
      />

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6">Items</Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setItemOpen(true)}
                disabled={invoice.status === 'VOID' || invoice.status === 'REFUNDED' || invoice.status === 'PAID'}
              >
                Add item
              </Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Service</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Unit price</TableCell>
                    <TableCell align="right">Discount</TableCell>
                    <TableCell align="right">Tax</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoice.items.map((it, i) => (
                    <TableRow key={it.id ?? i}>
                      <TableCell>{serviceName(it.service)}</TableCell>
                      <TableCell align="right">{it.quantity}</TableCell>
                      <TableCell align="right">{formatCurrency(num(it.unit_price))}</TableCell>
                      <TableCell align="right">{formatCurrency(num(it.discount))}</TableCell>
                      <TableCell align="right">{formatCurrency(num(it.tax))}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(num(it.unit_price) * Number(it.quantity) - num(it.discount) + num(it.tax))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Box sx={{ minWidth: 260 }}>
                <SummaryRow label="Subtotal" value={num(invoice.subtotal)} />
                <SummaryRow label="Discount" value={-num(invoice.discount_total)} />
                <SummaryRow label="Tax" value={num(invoice.tax_total)} />
                <SummaryRow label="Total" value={num(invoice.total)} bold />
                <SummaryRow label="Paid" value={num(invoice.paid_amount)} />
                <SummaryRow label="Balance due" value={remaining} bold color={remaining > 0 ? 'error.main' : 'success.main'} />
              </Box>
            </Box>
            {invoice.notes && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                <strong>Notes:</strong> {invoice.notes}
              </Typography>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Payments</Typography>
            {paymentsData?.results.length ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Reference</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paymentsData.results.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDateTime(p.paid_at)}</TableCell>
                        <TableCell>{p.method}</TableCell>
                        <TableCell align="right">{formatCurrency(num(p.amount))}</TableCell>
                        <TableCell>{p.reference || '—'}</TableCell>
                        <TableCell><StatusChip status={p.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <EmptyState title="No payments yet" hint="Payments recorded against this invoice will appear here." />
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Linked insurance claims</Typography>
            {linkedClaims.length ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Claim</TableCell>
                      <TableCell align="right">Submitted</TableCell>
                      <TableCell align="right">Approved</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {linkedClaims.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Link component={RouterLink} to="/billing/claims" underline="hover">{c.claim_number}</Link>
                        </TableCell>
                        <TableCell align="right">{formatCurrency(num(c.submitted_amount))}</TableCell>
                        <TableCell align="right">{c.approved_amount != null ? formatCurrency(num(c.approved_amount)) : '—'}</TableCell>
                        <TableCell><StatusChip status={c.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <EmptyState title="No claims" hint="This invoice has no linked insurance claims." />
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Details</Typography>
            <DetailRow label="Status" value={<StatusChip status={invoice.status} />} />
            <DetailRow label="Issued" value={invoice.issued_at ? formatDateTime(invoice.issued_at) : 'Not issued'} />
            <DetailRow label="Due date" value={invoice.due_date ? formatDate(invoice.due_date) : '—'} />
            <DetailRow label="Encounter" value={invoice.encounter ? `#${invoice.encounter}` : '—'} />
            <DetailRow label="Patient" value={patientLabel(invoice.patient)} />
          </Paper>
        </Grid>
      </Grid>

      {payOpen && (
        <PayDialog
          open
          invoice={invoice}
          remaining={remaining}
          deposits={(depositsData?.results ?? []).filter((d) => d.status === 'ACTIVE' && num(d.balance) > 0)}
          onClose={() => setPayOpen(false)}
          onSubmit={async (payload) => {
            try {
              await payInvoice({ id: invoiceId, ...payload }).unwrap();
              enqueueSnackbar('Payment recorded', { variant: 'success' });
              setPayOpen(false);
            } catch (e) {
              enqueueSnackbar(getErr(e), { variant: 'error' });
            }
          }}
        />
      )}

      {itemOpen && (
        <AddItemDialog
          open
          onClose={() => setItemOpen(false)}
          onSubmit={async (body) => {
            try {
              await addItem({ id: invoiceId, body }).unwrap();
              enqueueSnackbar('Item added', { variant: 'success' });
              setItemOpen(false);
            } catch (e) {
              enqueueSnackbar(getErr(e), { variant: 'error' });
            }
          }}
        />
      )}

      <Dialog open={voidOpen} onClose={() => setVoidOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Void invoice {invoice.invoice_number}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            This cannot be undone. Balance of {formatCurrency(remaining)} will no longer be collectible.
          </Typography>
          <TextField
            autoFocus
            label="Reason (required)"
            fullWidth
            size="small"
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoidOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={!voidReason.trim()} onClick={() => void handleVoid()}>
            Void invoice
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function serviceName(s: InvoiceItem['service']): string {
  if (typeof s === 'number') return `Service #${s}`;
  return `${s.name}${s.code ? ` (${s.code})` : ''}`;
}

function SummaryRow({ label, value, bold, color }: { label: string; value: number; bold?: boolean; color?: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
      <Typography variant="body2" fontWeight={bold ? 700 : 400}>{label}</Typography>
      <Typography variant="body2" fontWeight={bold ? 700 : 400} color={color}>
        {value < 0 ? `-${formatCurrency(Math.abs(value))}` : formatCurrency(value)}
      </Typography>
    </Box>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}

function PayDialog({
  open,
  invoice,
  remaining,
  deposits,
  onClose,
  onSubmit,
}: {
  open: boolean;
  invoice: Invoice;
  remaining: number;
  deposits: Array<{ id: number; reference: string }>;
  onClose: () => void;
  onSubmit: (payload: { amount: number; method: string; reference?: string; deposit_id?: number }) => Promise<void>;
}) {
  const [amount, setAmount] = useState(String(remaining > 0 ? remaining : 0));
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');
  const [depositId, setDepositId] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Record payment — {invoice.invoice_number}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Amount"
            type="number"
            fullWidth
            size="small"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            helperText={`Balance due: ${formatCurrency(remaining)}`}
          />
          <TextField select label="Method" fullWidth size="small" value={method} onChange={(e) => setMethod(e.target.value)}>
            {['CASH', 'CARD', 'BANK', 'ONLINE'].map((m) => (
              <MenuItem key={m} value={m}>{m}</MenuItem>
            ))}
          </TextField>
          <TextField label="Reference" fullWidth size="small" value={reference} onChange={(e) => setReference(e.target.value)} />
          <TextField
            select
            label="Apply deposit (optional)"
            fullWidth
            size="small"
            value={depositId}
            onChange={(e) => setDepositId(e.target.value ? Number(e.target.value) : '')}
          >
            <MenuItem value="">No deposit</MenuItem>
            {deposits.map((d) => (
              <MenuItem key={d.id} value={d.id}>Deposit #{d.id}{d.reference ? ` (${d.reference})` : ''}</MenuItem>
            ))}
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color="success"
          disabled={!Number(amount) || Number(amount) <= 0 || submitting}
          onClick={async () => {
            setSubmitting(true);
            await onSubmit({
              amount: Number(amount),
              method,
              reference: reference || undefined,
              ...(depositId ? { deposit_id: Number(depositId) } : {}),
            });
            setSubmitting(false);
          }}
        >
          Record payment
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function AddItemDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (body: { service: number; quantity: number; unit_price?: number; discount?: number }) => Promise<void>;
}) {
  const { data: servicesData, isLoading: servicesLoading } = useGetServicesQuery({ page_size: 200 });
  const services = useMemo(() => servicesData?.results ?? [], [servicesData]);
  const [service, setService] = useState<Service | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  const pickService = (s: Service | null) => {
    setService(s);
    if (s) {
      setUnitPrice(String(num(s.price)));
      setDiscount('0');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Add item</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Autocomplete
            size="small"
            options={services}
            loading={servicesLoading}
            getOptionLabel={(s: Service) => `${s.code} — ${s.name} (${formatCurrency(num(s.price))})`}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={service}
            onChange={(_e, v) => pickService(v)}
            renderInput={(params) => <TextField {...params} label="Service *" size="small" />}
          />
          <TextField label="Quantity" type="number" fullWidth size="small" value={quantity} onChange={(e) => setQuantity(e.target.value)} inputProps={{ min: 1 }} />
          <TextField label="Unit price" type="number" fullWidth size="small" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} inputProps={{ min: 0, step: '0.01' }} />
          <TextField label="Discount" type="number" fullWidth size="small" value={discount} onChange={(e) => setDiscount(e.target.value)} inputProps={{ min: 0, step: '0.01' }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!service || !Number(quantity) || submitting}
          onClick={async () => {
            setSubmitting(true);
            await onSubmit({
              service: service!.id,
              quantity: Number(quantity),
              unit_price: Number(unitPrice),
              discount: Number(discount),
            });
            setSubmitting(false);
          }}
        >
          Add item
        </Button>
      </DialogActions>
    </Dialog>
  );
}
