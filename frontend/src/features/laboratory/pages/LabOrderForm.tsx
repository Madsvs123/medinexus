import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Checkbox, FormControlLabel, Grid, List, ListItem, Paper, Stack, Typography } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { PageHeader, FormAutocomplete, FormSelect, FormTextField, EmptyState, ErrorAlert } from '../../../components/ui';
import { useCreateLabOrderMutation, useGetLabTestsQuery, useSearchLabPatientsQuery } from '../api';

const orderSchema = z.object({
  patient: z.number({ invalid_type_error: 'Select a patient' }),
  tests: z.array(z.number()).min(1, 'Select at least one test'),
  priority: z.string().default('ROUTINE'),
  notes: z.string().optional(),
});

type OrderValues = z.infer<typeof orderSchema>;

export default function LabOrderForm() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data: patientsData } = useSearchLabPatientsQuery({ page_size: 100 });
  const { data: testsData, error } = useGetLabTestsQuery({ page_size: 200, active: true });
  const [createOrder, { isLoading: saving }] = useCreateLabOrderMutation();
  const patients = useMemo(() => patientsData?.results ?? [], [patientsData]);
  const tests = useMemo(() => testsData?.results ?? [], [testsData]);

  const { control, handleSubmit, watch, setValue, reset } = useForm<OrderValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: { patient: undefined as unknown as number, tests: [], priority: 'ROUTINE', notes: '' },
  });
  const selected = watch('tests');

  const toggleTest = (id: number) => {
    const next = selected.includes(id) ? selected.filter((t) => t !== id) : [...selected, id];
    setValue('tests', next, { shouldValidate: true });
  };

  const onSubmit = handleSubmit(async (values: OrderValues) => {
    try {
      const created = await createOrder({
        patient: values.patient,
        tests: values.tests,
        priority: values.priority,
        notes: values.notes ?? '',
      }).unwrap();
      enqueueSnackbar('Lab order created — samples pending collection', { variant: 'success' });
      reset();
      navigate(`/laboratory/orders/${created.id}`);
    } catch {
      enqueueSnackbar('Failed to create lab order', { variant: 'error' });
    }
  });

  if (error) return <ErrorAlert error={error} />;

  return (
    <Box>
      <PageHeader title="New lab order" subtitle="Select patient and tests" />
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
              <FormSelect control={control} name="priority" label="Priority" options={['ROUTINE', 'URGENT', 'STAT'].map((p) => ({ value: p, label: p }))} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Tests ({selected.length} selected)</Typography>
              {tests.length === 0 ? (
                <EmptyState title="No tests in catalog" hint="Configure the test catalog first." />
              ) : (
                <List dense sx={{ maxHeight: 320, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  {tests.map((t) => (
                    <ListItem key={t.id} disableGutters divider>
                      <FormControlLabel
                        control={<Checkbox checked={selected.includes(t.id)} onChange={() => toggleTest(t.id)} />}
                        label={`${t.name} (${t.code}) — ${t.category} • ${t.sample_type}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Grid>
            <Grid item xs={12}>
              <FormTextField control={control} name="notes" label="Notes" multiline minRows={2} />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button type="submit" variant="contained" disabled={saving}>Create order</Button>
            <Button variant="outlined" onClick={() => navigate('/laboratory/orders')}>Cancel</Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
