import { useMemo, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { FormTextField, StatusChip, EmptyState } from '../../../components/ui';
import {
  useCreateDischargeSummaryMutation,
  useFinalizeDischargeSummaryMutation,
  useGetDischargeSummariesQuery,
  useUpdateDischargeSummaryMutation,
} from '../api';
import { SectionCard, SectionEmpty, SectionFormDialog } from './EncounterSection';

const summarySchema = z.object({
  summary: z.string().min(1, 'Summary required'),
  diagnosis_at_discharge: z.string().optional(),
  medications_at_discharge: z.string().optional(),
  follow_up_instructions: z.string().optional(),
});

type SummaryValues = z.infer<typeof summarySchema>;

export function DischargeTab({ encounterId, readOnly }: { encounterId: number; readOnly?: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useGetDischargeSummariesQuery({ encounter: encounterId, page_size: 10 });
  const [createSummary, { isLoading: saving }] = useCreateDischargeSummaryMutation();
  const [updateSummary] = useUpdateDischargeSummaryMutation();
  const [finalizeSummary] = useFinalizeDischargeSummaryMutation();
  const [open, setOpen] = useState(false);
  const { control, handleSubmit, reset } = useForm<SummaryValues>({
    resolver: zodResolver(summarySchema),
    defaultValues: { summary: '', diagnosis_at_discharge: '', medications_at_discharge: '', follow_up_instructions: '' },
  });

  const summaries = useMemo(() => data?.results ?? [], [data]);
  const latest = summaries[0] ?? null;

  const onSave = handleSubmit(async (values: SummaryValues) => {
    try {
      if (latest && latest.status === 'DRAFT') {
        await updateSummary({ id: latest.id, body: values }).unwrap();
        enqueueSnackbar('Discharge summary updated', { variant: 'success' });
      } else {
        await createSummary({ encounter: encounterId, status: 'DRAFT', ...values }).unwrap();
        enqueueSnackbar('Discharge summary drafted', { variant: 'success' });
      }
      setOpen(false);
      reset();
    } catch {
      enqueueSnackbar('Failed to save discharge summary', { variant: 'error' });
    }
  });

  return (
    <SectionCard
      title="Discharge summary"
      action={
        !readOnly && latest?.status !== 'FINAL' && (
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => {
            if (latest) {
              reset({
                summary: latest.summary ?? '',
                diagnosis_at_discharge: latest.diagnosis_at_discharge ?? '',
                medications_at_discharge: latest.medications_at_discharge ?? '',
                follow_up_instructions: latest.follow_up_instructions ?? '',
              });
            }
            setOpen(true);
          }}>
            {latest ? 'Edit draft' : 'Draft summary'}
          </Button>
        )
      }
    >
      {isLoading ? (
        <SectionEmpty hint="Loading…" />
      ) : !latest ? (
        <EmptyState title="No discharge summary" hint="Draft the discharge summary for this encounter." />
      ) : (
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <StatusChip status={latest.status} />
            {latest.signed_by && <Typography variant="caption" color="text.secondary">Signed by {latest.signed_by.first_name} {latest.signed_by.last_name}</Typography>}
          </Stack>
          <Typography variant="subtitle2">Summary</Typography>
          <Typography variant="body2" paragraph sx={{ whiteSpace: 'pre-wrap' }}>{latest.summary || '—'}</Typography>
          <Typography variant="subtitle2">Diagnosis at discharge</Typography>
          <Typography variant="body2" paragraph sx={{ whiteSpace: 'pre-wrap' }}>{latest.diagnosis_at_discharge || '—'}</Typography>
          <Typography variant="subtitle2">Medications at discharge</Typography>
          <Typography variant="body2" paragraph sx={{ whiteSpace: 'pre-wrap' }}>{latest.medications_at_discharge || '—'}</Typography>
          <Typography variant="subtitle2">Follow-up instructions</Typography>
          <Typography variant="body2" paragraph sx={{ whiteSpace: 'pre-wrap' }}>{latest.follow_up_instructions || '—'}</Typography>
          {!readOnly && latest.status === 'DRAFT' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<AssignmentTurnedInIcon />}
              onClick={async () => {
                try {
                  await finalizeSummary(latest.id).unwrap();
                  enqueueSnackbar('Discharge summary finalized', { variant: 'success' });
                } catch {
                  enqueueSnackbar('Failed to finalize summary', { variant: 'error' });
                }
              }}
            >
              Finalize
            </Button>
          )}
        </Box>
      )}
      <SectionFormDialog open={open} title="Discharge summary" onClose={() => setOpen(false)} onSave={onSave} saving={saving}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormTextField control={control} name="summary" label="Summary" required multiline minRows={4} />
          <FormTextField control={control} name="diagnosis_at_discharge" label="Diagnosis at discharge" multiline minRows={2} />
          <FormTextField control={control} name="medications_at_discharge" label="Medications at discharge" multiline minRows={2} />
          <FormTextField control={control} name="follow_up_instructions" label="Follow-up instructions" multiline minRows={2} />
        </Stack>
      </SectionFormDialog>
    </SectionCard>
  );
}
