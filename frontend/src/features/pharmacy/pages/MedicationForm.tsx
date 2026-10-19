import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Checkbox, FormControlLabel, Grid, Paper, Stack } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { PageHeader, FormTextField, FormSelect, LoadingOverlay } from '../../../components/ui';
import { useCreateMedicationMutation, useGetMedicationQuery, useUpdateMedicationMutation } from '../api';
import type { Medication } from '../types';
import { MEDICATION_CATEGORIES, MEDICATION_FORMS } from '../types';

const medicationSchema = z.object({
  code: z.string().min(1, 'Code required'),
  name: z.string().min(1, 'Name required'),
  generic_name: z.string().optional(),
  category: z.string().default('OTHER'),
  form: z.string().default('TABLET'),
  strength: z.string().optional(),
  unit: z.string().optional(),
  price: z.coerce.number().min(0).default(0),
  reorder_level: z.coerce.number().int().min(0).default(10),
  current_stock: z.coerce.number().int().min(0).default(0),
  is_controlled: z.boolean().default(false),
  active: z.boolean().default(true),
});

type MedicationValues = z.infer<typeof medicationSchema>;

export default function MedicationForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const { data: existing, isLoading: loadingExisting } = useGetMedicationQuery(Number(id), { skip: !isEdit });
  const [createMedication, { isLoading: saving }] = useCreateMedicationMutation();
  const [updateMedication] = useUpdateMedicationMutation();

  const { control, handleSubmit, reset, watch, setValue } = useForm<MedicationValues>({
    resolver: zodResolver(medicationSchema),
    defaultValues: {
      code: '',
      name: '',
      generic_name: '',
      category: 'OTHER',
      form: 'TABLET',
      strength: '',
      unit: '',
      price: 0,
      reorder_level: 10,
      current_stock: 0,
      is_controlled: false,
      active: true,
    },
  });

  useEffect(() => {
    if (existing) {
      reset({
        code: existing.code,
        name: existing.name,
        generic_name: existing.generic_name ?? '',
        category: existing.category,
        form: existing.form,
        strength: existing.strength ?? '',
        unit: existing.unit ?? '',
        price: Number(existing.price),
        reorder_level: existing.reorder_level,
        current_stock: existing.current_stock,
        is_controlled: existing.is_controlled,
        active: existing.active,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing]);

  const onSubmit = handleSubmit(async (values: MedicationValues) => {
    try {
      if (isEdit) {
        await updateMedication({ id: Number(id), body: values as never }).unwrap();
        enqueueSnackbar('Medication updated', { variant: 'success' });
      } else {
        await createMedication(values as never).unwrap();
        enqueueSnackbar('Medication created', { variant: 'success' });
      }
      navigate('/pharmacy/medications');
    } catch {
      enqueueSnackbar('Failed to save medication', { variant: 'error' });
    }
  });

  if (loadingExisting) return <LoadingOverlay open />;

  return (
    <Box>
      <PageHeader title={isEdit ? 'Edit medication' : 'New medication'} subtitle="Add or update formulary item" />
      <Paper sx={{ p: 3, maxWidth: 900 }}>
        <form onSubmit={onSubmit} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="code" label="Code" required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="name" label="Name" required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="generic_name" label="Generic name" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="strength" label="Strength (e.g. 500mg)" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormSelect control={control} name="category" label="Category" options={MEDICATION_CATEGORIES.map((c) => ({ value: c, label: c }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormSelect control={control} name="form" label="Form" options={MEDICATION_FORMS.map((f) => ({ value: f, label: f }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="unit" label="Unit (e.g. tab, ml)" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="price" label="Price" type="number" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="reorder_level" label="Reorder level" type="number" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="current_stock" label="Current stock" type="number" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Checkbox checked={watch('is_controlled')} onChange={(e) => setValue('is_controlled', e.target.checked)} />}
                label="Controlled substance"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Checkbox checked={watch('active')} onChange={(e) => setValue('active', e.target.checked)} />}
                label="Active"
              />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button type="submit" variant="contained" disabled={saving}>
              {isEdit ? 'Save changes' : 'Create medication'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/pharmacy/medications')}>Cancel</Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
