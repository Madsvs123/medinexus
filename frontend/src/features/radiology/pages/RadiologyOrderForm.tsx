import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Grid, Paper, Stack } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { PageHeader, FormAutocomplete, FormSelect, FormTextField, ErrorAlert } from '../../../components/ui';
import { useCreateRadiologyOrderMutation, useSearchRadiologyPatientsQuery } from '../api';
import { RADIOLOGY_MODALITIES } from '../types';

const orderSchema = z.object({
  patient: z.number({ invalid_type_error: 'Select a patient' }),
  modality: z.string().min(1, 'Select a modality'),
  body_part: z.string().min(1, 'Body part required'),
  clinical_indication: z.string().optional(),
  priority: z.string().default('ROUTINE'),
  notes: z.string().optional(),
});

type OrderValues = z.infer<typeof orderSchema>;

export default function RadiologyOrderForm() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data: patientsData, error } = useSearchRadiologyPatientsQuery({ page_size: 100 });
  const [createOrder, { isLoading: saving }] = useCreateRadiologyOrderMutation();
  const patients = useMemo(() => patientsData?.results ?? [], [patientsData]);

  const { control, handleSubmit, reset } = useForm<OrderValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      patient: undefined as unknown as number,
      modality: '',
      body_part: '',
      clinical_indication: '',
      priority: 'ROUTINE',
      notes: '',
    },
  });

  const onSubmit = handleSubmit(async (values: OrderValues) => {
    try {
      const created = await createOrder({
        patient: values.patient,
        modality: values.modality,
        body_part: values.body_part,
        clinical_indication: values.clinical_indication ?? '',
        priority: values.priority,
        notes: values.notes ?? '',
      }).unwrap();
      enqueueSnackbar('Radiology order created', { variant: 'success' });
      reset();
      navigate(`/radiology/orders/${created.id}`);
    } catch {
      enqueueSnackbar('Failed to create radiology order', { variant: 'error' });
    }
  });

  if (error) return <ErrorAlert error={error} />;

  return (
    <Box>
      <PageHeader title="New radiology order" subtitle="Request imaging for a patient" />
      <Paper sx={{ p: 3, maxWidth: 860 }}>
        <form onSubmit={onSubmit} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller
                control={control}
                name="patient"
                render={({ field, fieldState }) => (
                  <FormAutocomplete
                    label="Patient"
                    options={patients}
                    getOptionLabel={(p) => `${p.full_name ?? `${p.first_name} ${p.last_name}`} (${p.mrn})`}
                    value={patients.find((p) => p.id === field.value) ?? null}
                    onChange={(p) => field.onChange(p?.id ?? null)}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    required
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormSelect control={control} name="modality" label="Modality" options={RADIOLOGY_MODALITIES.map((m) => ({ value: m, label: m }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="body_part" label="Body part" required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormSelect control={control} name="priority" label="Priority" options={['ROUTINE', 'URGENT', 'STAT'].map((p) => ({ value: p, label: p }))} />
            </Grid>
            <Grid item xs={12}>
              <FormTextField control={control} name="clinical_indication" label="Clinical indication" multiline minRows={2} />
            </Grid>
            <Grid item xs={12}>
              <FormTextField control={control} name="notes" label="Notes" multiline minRows={2} />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button type="submit" variant="contained" disabled={saving}>Create order</Button>
            <Button variant="outlined" onClick={() => navigate('/radiology/orders')}>Cancel</Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
