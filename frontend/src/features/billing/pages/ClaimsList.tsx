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
import DescriptionIcon from '@mui/icons-material/Description';
import AddIcon from '@mui/icons-material/Add';
import { Link as RouterLink } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { PageHeader, DataTable, StatusChip, EmptyState } from '../../../components/ui';
import { formatCurrency, formatDateTime } from '../../../utils/format';
import {
  useGetClaimsQuery,
  useGetInvoicesQuery,
  useGetPatientInsurancesQuery,
  useCreateClaimMutation,
  useSubmitClaimMutation,
  useApproveClaimMutation,
  useRejectClaimMutation,
  useResubmitClaimMutation,
  useMarkClaimPaidMutation,
} from '../api';
import { num, type ClaimStatus, type InsuranceClaim } from '../types';
import { useDebouncedValue } from '../components/PatientAutocomplete';

const STATUSES: ClaimStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'RESUBMITTED', 'PAID'];

const createSchema = z.object({
  invoice: z.coerce.number().min(1, 'Invoice is required'),
  patient_insurance: z.coerce.number().min(1, 'Patient insurance is required'),
  notes: z.string().optional(),
});
type CreateFormValues = z.infer<typeof createSchema>;

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

export default function ClaimsList() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const patientQ = useDebouncedValue(patientSearch);
  const { enqueueSnackbar } = useSnackbar();

  const params = useMemo(
    () => ({ page, page_size: 20, ...(status ? { status } : {}), ...(patientQ ? { patient: patientQ } : {}) }),
    [page, status, patientQ],
  );
  const { data, isLoading, error } = useGetClaimsQuery(params);

  const [createOpen, setCreateOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<InsuranceClaim | null>(null);
  const [approveAmount, setApproveAmount] = useState('');
  const [rejectTarget, setRejectTarget] = useState<InsuranceClaim | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [submitClaim] = useSubmitClaimMutation();
  const [approveClaim] = useApproveClaimMutation();
  const [rejectClaim] = useRejectClaimMutation();
  const [resubmitClaim] = useResubmitClaimMutation();
  const [markClaimPaid] = useMarkClaimPaidMutation();

  const run = async (fn: () => Promise<unknown>, successMsg: string) => {
    try {
      await fn();
      enqueueSnackbar(successMsg, { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const handleApprove = async () => {
    if (!approveTarget) return;
    await run(
      () => approveClaim({ id: approveTarget.id, approved_amount: Number(approveAmount) }).unwrap(),
      'Claim approved',
    );
    setApproveTarget(null);
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    await run(() => rejectClaim({ id: rejectTarget.id, reason: rejectReason }).unwrap(), 'Claim rejected');
    setRejectTarget(null);
  };

  const columns = useMemo(
    () => [
      { key: 'number', label: 'Claim', render: (r: InsuranceClaim) => r.claim_number },
      {
        key: 'invoice',
        label: 'Invoice',
        render: (r: InsuranceClaim) => (
          <Box
            component={RouterLink}
            to={`/billing/invoices/${typeof r.invoice === 'object' ? r.invoice.id : r.invoice}`}
            sx={{ color: 'primary.main', textDecoration: 'none' }}
          >
            {typeof r.invoice === 'object' ? r.invoice.invoice_number : `#${r.invoice}`}
          </Box>
        ),
      },
      { key: 'submitted', label: 'Submitted', align: 'right' as const, render: (r: InsuranceClaim) => formatCurrency(num(r.submitted_amount)) },
      { key: 'approved', label: 'Approved', align: 'right' as const, render: (r: InsuranceClaim) => (r.approved_amount != null ? formatCurrency(num(r.approved_amount)) : '—') },
      { key: 'submitted_at', label: 'Submitted at', render: (r: InsuranceClaim) => (r.submitted_at ? formatDateTime(r.submitted_at) : '—') },
      { key: 'status', label: 'Status', render: (r: InsuranceClaim) => <StatusChip status={r.status} /> },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right' as const,
        render: (r: InsuranceClaim) => (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {r.status === 'DRAFT' && (
              <Button size="small" variant="outlined" onClick={() => void run(() => submitClaim(r.id).unwrap(), 'Claim submitted')}>
                Submit
              </Button>
            )}
            {r.status === 'SUBMITTED' && (
              <>
                <Button size="small" color="success" variant="outlined" onClick={() => { setApproveTarget(r); setApproveAmount(String(num(r.submitted_amount))); }}>
                  Approve
                </Button>
                <Button size="small" color="error" variant="outlined" onClick={() => { setRejectTarget(r); setRejectReason(''); }}>
                  Reject
                </Button>
              </>
            )}
            {r.status === 'REJECTED' && (
              <Button size="small" variant="outlined" onClick={() => void run(() => resubmitClaim(r.id).unwrap(), 'Claim resubmitted')}>
                Resubmit
              </Button>
            )}
            {r.status === 'APPROVED' && (
              <Button size="small" color="success" variant="outlined" onClick={() => void run(() => markClaimPaid(r.id).unwrap(), 'Claim marked paid')}>
                Mark paid
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
        title="Insurance claims"
        subtitle="Track claims through the payer lifecycle"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New claim
          </Button>
        }
      />
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
          icon={<DescriptionIcon />}
          title="No claims found"
          hint="Create a claim from an issued invoice."
          action={
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
              New claim
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

      {createOpen && <CreateClaimDialog open onClose={() => setCreateOpen(false)} />}

      <Dialog open={approveTarget !== null} onClose={() => setApproveTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Approve claim</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {approveTarget?.claim_number} — submitted {approveTarget ? formatCurrency(num(approveTarget.submitted_amount)) : ''}
            </Typography>
            <TextField
              label="Approved amount"
              type="number"
              fullWidth
              size="small"
              value={approveAmount}
              onChange={(e) => setApproveAmount(e.target.value)}
              inputProps={{ min: 0, step: '0.01' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveTarget(null)}>Cancel</Button>
          <Button color="success" variant="contained" disabled={!Number(approveAmount) || Number(approveAmount) < 0} onClick={() => void handleApprove()}>
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rejectTarget !== null} onClose={() => setRejectTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Reject claim</DialogTitle>
        <DialogContent>
          <TextField
            label="Rejection reason"
            fullWidth
            size="small"
            multiline
            minRows={2}
            sx={{ mt: 1 }}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={!rejectReason.trim()} onClick={() => void handleReject()}>
            Reject claim
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function CreateClaimDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data: invoicesData } = useGetInvoicesQuery({ page_size: 200 });
  const invoices = useMemo(
    () => (invoicesData?.results ?? []).filter((inv) => inv.status === 'ISSUED' || inv.status === 'PARTIAL'),
    [invoicesData],
  );
  const { data: piData } = useGetPatientInsurancesQuery({ page_size: 200 });
  const patientInsurances = useMemo(() => piData?.results ?? [], [piData]);

  const [createClaim] = useCreateClaimMutation();
  const [submitClaim] = useSubmitClaimMutation();

  const { control, handleSubmit, watch, formState } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { invoice: 0, patient_insurance: 0, notes: '' },
  });

  const selectedInvoice = watch('invoice') ? invoices.find((i) => i.id === Number(watch('invoice'))) : null;
  const invoicePatientId = selectedInvoice
    ? typeof selectedInvoice.patient === 'object'
      ? selectedInvoice.patient.id
      : selectedInvoice.patient
    : null;
  const eligibleInsurances = invoicePatientId
    ? patientInsurances.filter((pi) => (typeof pi.patient === 'object' ? pi.patient.id : pi.patient) === invoicePatientId)
    : [];

  const onSubmit = async (values: CreateFormValues) => {
    try {
      const claim = await createClaim({
        invoice: values.invoice,
        patient_insurance: values.patient_insurance,
        notes: values.notes || undefined,
        submitted_amount: selectedInvoice ? num(selectedInvoice.total) : undefined,
      }).unwrap();
      await submitClaim(claim.id).unwrap();
      enqueueSnackbar(`Claim ${claim.claim_number} created and submitted`, { variant: 'success' });
      onClose();
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>New claim</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Controller
              name="invoice"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  select
                  label="Invoice *"
                  fullWidth
                  size="small"
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(Number(e.target.value));
                  }}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                >
                  <MenuItem value={0}>Select an issued invoice</MenuItem>
                  {invoices.map((inv) => (
                    <MenuItem key={inv.id} value={inv.id}>
                      {inv.invoice_number} — {formatCurrency(num(inv.total))}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="patient_insurance"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  select
                  label="Patient insurance *"
                  fullWidth
                  size="small"
                  value={field.value}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message || (invoicePatientId && eligibleInsurances.length === 0 ? 'No insurance on file for this patient' : undefined)}
                >
                  <MenuItem value={0}>Select patient insurance</MenuItem>
                  {eligibleInsurances.map((pi) => (
                    <MenuItem key={pi.id} value={pi.id}>
                      {pi.policy_number} — {typeof pi.plan === 'object' ? pi.plan.name : `Plan #${pi.plan}`}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="notes"
              control={control}
              render={({ field }) => <TextField label="Notes" fullWidth size="small" multiline minRows={2} {...field} />}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={formState.isSubmitting}>
            Create & submit claim
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
