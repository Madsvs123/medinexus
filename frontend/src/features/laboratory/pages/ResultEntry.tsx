import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { PageHeader, FormTextField, StatusChip, LoadingOverlay, ErrorAlert } from '../../../components/ui';
import { useApproveLabResultMutation, useCreateLabResultMutation, useGetLabResultsQuery, useGetLabTestsQuery, useRejectLabResultMutation, useUpdateLabResultMutation } from '../api';
import type { LabResult, ResultFlag } from '../types';

const resultSchema = z.object({
  value: z.string().min(1, 'Value required'),
  unit: z.string().optional(),
  notes: z.string().optional(),
});

type ResultValues = z.infer<typeof resultSchema>;

function computeFlag(value: string, low: number | null, high: number | null): ResultFlag | null {
  const num = Number(value);
  if (!value || Number.isNaN(num)) return null;
  if (low !== null && high !== null) {
    if (num > high * 1.5 || num < low * 0.5) return 'CRITICAL';
    if (num < low || num > high) return 'ABNORMAL';
    return 'NORMAL';
  }
  return null;
}

export default function ResultEntry() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const orderId = Number(searchParams.get('order') ?? (id ? undefined : 0));
  const testId = Number(searchParams.get('test') ?? 0);
  const sampleId = searchParams.get('sample') ?? undefined;
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const { data: testsData, isLoading: testsLoading } = useGetLabTestsQuery({ page_size: 200, active: true });
  const { data: resultsData, isLoading: resultsLoading } = useGetLabResultsQuery({ order: orderId || undefined, page_size: 200 }, { skip: !orderId && !id });
  const [createResult, { isLoading: saving }] = useCreateLabResultMutation();
  const [updateResult] = useUpdateLabResultMutation();
  const [approveResult] = useApproveLabResultMutation();
  const [rejectResult] = useRejectLabResultMutation();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [created, setCreated] = useState<LabResult | null>(null);

  const tests = useMemo(() => testsData?.results ?? [], [testsData]);
  const allResults = useMemo(() => resultsData?.results ?? [], [resultsData]);
  const existing = id ? allResults.find((r) => r.id === Number(id)) ?? null : created;
  const test = existing ? (typeof existing.test === 'number' ? tests.find((t) => t.id === existing.test) ?? null : existing.test) : tests.find((t) => t.id === testId) ?? null;

  const { control, handleSubmit, reset, watch } = useForm<ResultValues>({
    resolver: zodResolver(resultSchema),
    defaultValues: { value: '', unit: test?.unit ?? '', notes: '' },
  });

  useEffect(() => {
    if (existing) {
      reset({ value: existing.value ?? '', unit: existing.unit ?? test?.unit ?? '', notes: existing.notes ?? '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing]);

  const value = watch('value');
  const flag = test ? computeFlag(value, test.ref_range_low, test.ref_range_high) : null;

  const onSave = handleSubmit(async (values: ResultValues) => {
    try {
      let result: LabResult;
      if (existing) {
        result = await updateResult({ id: existing.id, body: values }).unwrap();
      } else {
        if (!orderId || !testId) {
          enqueueSnackbar('Missing order or test — open from the work queue', { variant: 'warning' });
          return;
        }
        result = await createResult({ order: orderId, test: testId, ...values }).unwrap();
      }
      setCreated(result);
      enqueueSnackbar('Result saved', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to save result', { variant: 'error' });
    }
  });

  const doApprove = async () => {
    if (!existing) return;
    try {
      await approveResult(existing.id).unwrap();
      enqueueSnackbar(existing.flag === 'CRITICAL' ? 'Result approved — critical alert sent' : 'Result approved', { variant: 'success' });
      navigate('/laboratory/workqueue');
    } catch {
      enqueueSnackbar('Failed to approve result', { variant: 'error' });
    }
  };

  const doReject = async () => {
    if (!existing) return;
    try {
      await rejectResult({ id: existing.id, reason: rejectReason || 'Rejected by reviewer' }).unwrap();
      enqueueSnackbar('Result rejected', { variant: 'success' });
      setRejectOpen(false);
      setRejectReason('');
      navigate('/laboratory/workqueue');
    } catch {
      enqueueSnackbar('Failed to reject result', { variant: 'error' });
    }
  };

  if (testsLoading || resultsLoading) return <LoadingOverlay open />;
  if (!test) return <ErrorAlert error={{ data: { detail: 'Test not found — open this page from the work queue.' } }} />;

  return (
    <Box>
      <PageHeader title={existing ? `Result #${existing.id}` : `Enter result — ${test.name}`} subtitle={sampleId ? `Sample ${sampleId}` : `Order ${orderId || '—'}`} />
      <Stack spacing={2}>
        {existing && existing.flag === 'CRITICAL' && (
          <Alert severity="error" role="alert">
            <strong>CRITICAL RESULT.</strong> Approving this result will immediately notify the ordering doctor and admins.
          </Alert>
        )}
        {flag && flag !== (existing?.flag ?? null) && (
          <Alert severity={flag === 'CRITICAL' ? 'error' : flag === 'ABNORMAL' ? 'warning' : 'success'} role="alert">
            Flag preview: <strong>{flag}</strong> (reference range {test.ref_range_low ?? '—'}–{test.ref_range_high ?? '—'})
          </Alert>
        )}
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6">{test.name}</Typography>
              <StatusChip status={test.category} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Reference range: {test.ref_range_low ?? '—'} – {test.ref_range_high ?? '—'} {test.unit}
            </Typography>
            <form onSubmit={onSave} noValidate>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <FormTextField control={control} name="value" label="Value" required sx={{ flexGrow: 1 }} />
                <FormTextField control={control} name="unit" label="Unit" />
              </Stack>
              <FormTextField control={control} name="notes" label="Notes" multiline minRows={2} sx={{ mt: 2 }} />
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button type="submit" variant="contained" disabled={saving}>Save result</Button>
              </Stack>
            </form>
          </Stack>
        </Paper>
        {existing && existing.status !== 'APPROVED' && existing.status !== 'REJECTED' && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>Review</Typography>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" color="success" onClick={doApprove}>Approve</Button>
                <Button variant="outlined" color="error" onClick={() => setRejectOpen(true)}>Reject</Button>
              </Stack>
            </CardContent>
          </Card>
        )}
        {existing && existing.status === 'APPROVED' && (
          <Alert severity="success">This result has been approved.</Alert>
        )}
      </Stack>
      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Reject result</DialogTitle>
        <DialogContent>
          <TextField label="Reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} fullWidth multiline minRows={2} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={doReject}>Reject</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
