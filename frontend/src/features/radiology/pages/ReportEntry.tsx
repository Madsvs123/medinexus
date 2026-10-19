import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { PageHeader, FormTextField, StatusChip, LoadingOverlay } from '../../../components/ui';
import { useCreateRadiologyReportMutation, useFinalizeRadiologyReportMutation, useGetRadiologyOrderQuery, useGetRadiologyReportsQuery, useUpdateRadiologyReportMutation } from '../api';
import type { RadiologyReport } from '../types';
import { patientLabel } from '../types';

const reportSchema = z.object({
  findings: z.string().min(1, 'Findings required'),
  impression: z.string().min(1, 'Impression required'),
});

type ReportValues = z.infer<typeof reportSchema>;

export default function ReportEntry() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const orderId = Number(id ? undefined : searchParams.get('order'));
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [attachment, setAttachment] = useState<File | null>(null);

  const { data: reportsData, isLoading: reportsLoading } = useGetRadiologyReportsQuery(
    { order: orderId || undefined, page_size: 10 },
    { skip: !orderId && !id },
  );
  const reports = useMemo(() => reportsData?.results ?? [], [reportsData]);
  const existing: RadiologyReport | null = id ? reports.find((r) => r.id === Number(id)) ?? null : reports[0] ?? null;

  const order = useGetRadiologyOrderQuery(typeof existing?.order === 'number' ? existing.order : existing?.order?.id ?? orderId, {
    skip: !existing && !orderId,
  }).data;

  const [createReport, { isLoading: saving }] = useCreateRadiologyReportMutation();
  const [updateReport] = useUpdateRadiologyReportMutation();
  const [finalizeReport] = useFinalizeRadiologyReportMutation();

  const { control, handleSubmit, reset } = useForm<ReportValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { findings: '', impression: '' },
  });

  useEffect(() => {
    if (existing) {
      reset({ findings: existing.findings ?? '', impression: existing.impression ?? '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing]);

  const onSave = handleSubmit(async (values: ReportValues) => {
    try {
      if (existing) {
        await updateReport({ id: existing.id, body: values }).unwrap();
        enqueueSnackbar('Report draft saved', { variant: 'success' });
      } else {
        if (!orderId) {
          enqueueSnackbar('Missing order — open from an order page', { variant: 'warning' });
          return;
        }
        await createReport({ order: orderId, status: 'DRAFT', ...values }).unwrap();
        enqueueSnackbar('Report draft created', { variant: 'success' });
      }
    } catch {
      enqueueSnackbar('Failed to save report', { variant: 'error' });
    }
  });

  const uploadAttachment = async () => {
    if (!existing || !attachment) return;
    const fd = new FormData();
    fd.append('attachment', attachment);
    try {
      await updateReport({ id: existing.id, body: fd }).unwrap();
      enqueueSnackbar('Attachment uploaded', { variant: 'success' });
      setAttachment(null);
    } catch {
      enqueueSnackbar('Attachment upload failed', { variant: 'error' });
    }
  };

  const doFinalize = async () => {
    if (!existing) return;
    try {
      await finalizeReport(existing.id).unwrap();
      enqueueSnackbar('Report finalized — ordering doctor notified', { variant: 'success' });
      navigate('/radiology/reports');
    } catch {
      enqueueSnackbar('Failed to finalize report', { variant: 'error' });
    }
  };

  if (reportsLoading) return <LoadingOverlay open />;

  return (
    <Box>
      <PageHeader
        title={existing ? `Report #${existing.id}` : 'New radiology report'}
        subtitle={order ? `${order.modality} ${order.body_part} — ${patientLabel(order.patient)}` : `Order ${orderId || '—'}`}
      />
      <Stack spacing={2}>
        {existing && (
          <Stack direction="row" spacing={1} alignItems="center">
            <StatusChip status={existing.status} />
            {existing.status === 'FINAL' && <Alert severity="success">This report is final and locked.</Alert>}
          </Stack>
        )}
        <Paper sx={{ p: 3 }}>
          <form onSubmit={onSave} noValidate>
            <Stack spacing={2}>
              <FormTextField control={control} name="findings" label="Findings" required multiline minRows={4} disabled={existing?.status === 'FINAL'} />
              <FormTextField control={control} name="impression" label="Impression" required multiline minRows={3} disabled={existing?.status === 'FINAL'} />
              <Stack direction="row" spacing={1}>
                {existing?.status !== 'FINAL' && (
                  <Button type="submit" variant="contained" disabled={saving}>Save draft</Button>
                )}
                {existing?.status === 'FINAL' && (
                  <Button variant="outlined" onClick={() => navigate('/radiology/reports')}>Back to reports</Button>
                )}
              </Stack>
            </Stack>
          </form>
        </Paper>
        {existing && existing.status !== 'FINAL' && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Attachment & finalize</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button component="label" variant="outlined" startIcon={<UploadIcon />}>
                {attachment ? attachment.name : 'Attach image'}
                <input type="file" hidden accept="image/*,application/pdf" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} />
              </Button>
              {attachment && (
                <Button variant="outlined" onClick={uploadAttachment}>Upload</Button>
              )}
              <Box sx={{ flexGrow: 1 }} />
              <Button variant="contained" color="success" startIcon={<AssignmentTurnedInIcon />} onClick={doFinalize}>
                Finalize report
              </Button>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}
