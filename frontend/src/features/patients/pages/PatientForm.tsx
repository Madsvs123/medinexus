import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Grid, Paper, Stack, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { PageHeader, FormTextField, FormSelect, FormDatePicker, LoadingOverlay } from '../../../components/ui';
import { useCreatePatientMutation, useGetPatientQuery, useUpdatePatientMutation } from '../api';
import type { Gender, Patient } from '../types';
import { BLOOD_TYPES, GENDERS } from '../types';

const patientSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  date_of_birth: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  blood_type: z.string().default('UNKNOWN'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  nationality: z.string().optional(),
  marital_status: z.string().optional(),
  occupation: z.string().optional(),
  status: z.string().default('ACTIVE'),
  notes: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

const toIsoDate = (v: unknown): string | null => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  return dayjs(v as dayjs.Dayjs).format('YYYY-MM-DD');
};

export default function PatientForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [photo, setPhoto] = useState<File | null>(null);

  const { data: existing, isLoading: loadingExisting } = useGetPatientQuery(Number(id), { skip: !isEdit });
  const [createPatient, { isLoading: creating }] = useCreatePatientMutation();
  const [updatePatient, { isLoading: updating }] = useUpdatePatientMutation();

  const { control, handleSubmit, reset } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      date_of_birth: null,
      gender: null,
      blood_type: 'UNKNOWN',
      phone: '',
      email: '',
      address: '',
      city: '',
      nationality: '',
      marital_status: '',
      occupation: '',
      status: 'ACTIVE',
      notes: '',
    },
  });

  useEffect(() => {
    if (isEdit && existing) {
      reset({
        first_name: existing.first_name,
        last_name: existing.last_name,
        date_of_birth: existing.date_of_birth,
        gender: existing.gender,
        blood_type: existing.blood_type,
        phone: existing.phone ?? '',
        email: existing.email ?? '',
        address: existing.address ?? '',
        city: existing.city ?? '',
        nationality: existing.nationality ?? '',
        marital_status: existing.marital_status ?? '',
        occupation: existing.occupation ?? '',
        status: existing.status,
        notes: existing.notes ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, existing]);

  const onSubmit = async (values: PatientFormValues) => {
    const payload = {
      ...values,
      date_of_birth: toIsoDate(values.date_of_birth),
      gender: (values.gender || null) as Gender | null,
    } as unknown as Partial<Patient>;
    let body: Partial<Patient> | FormData = payload;
    if (photo) {
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') fd.append(k, String(v));
      });
      fd.append('photo', photo);
      body = fd;
    }
    try {
      if (isEdit) {
        await updatePatient({ id: Number(id), body }).unwrap();
        enqueueSnackbar('Patient updated', { variant: 'success' });
        navigate(`/patients/${id}`);
      } else {
        const created = await createPatient(body).unwrap();
        enqueueSnackbar(`Patient ${created.mrn} registered`, { variant: 'success' });
        navigate(`/patients/${created.id}`);
      }
    } catch (e) {
      enqueueSnackbar(isEdit ? 'Failed to update patient' : 'Failed to create patient', { variant: 'error' });
    }
  };

  if (loadingExisting) return <LoadingOverlay open />;

  return (
    <Box>
      <PageHeader title={isEdit ? 'Edit Patient' : 'New Patient'} subtitle={isEdit && existing ? existing.mrn : 'Register a new patient record'} />
      <Paper sx={{ p: 3, maxWidth: 900 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Typography variant="h6" gutterBottom>Demographics</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="first_name" label="First name" required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="last_name" label="Last name" required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormDatePicker control={control} name="date_of_birth" label="Date of birth" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormSelect control={control} name="gender" label="Gender" options={GENDERS.map((g) => ({ value: g, label: g }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormSelect control={control} name="blood_type" label="Blood type" options={BLOOD_TYPES.map((b) => ({ value: b, label: b }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormSelect control={control} name="status" label="Status" options={['ACTIVE', 'INACTIVE', 'DECEASED'].map((s) => ({ value: s, label: s }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="phone" label="Phone" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="email" label="Email" />
            </Grid>
            <Grid item xs={12}>
              <FormTextField control={control} name="address" label="Address" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="city" label="City" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="nationality" label="Nationality" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="marital_status" label="Marital status" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="occupation" label="Occupation" />
            </Grid>
            <Grid item xs={12}>
              <FormTextField control={control} name="notes" label="Notes" multiline minRows={2} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Photo</Typography>
              <input
                accept="image/*"
                type="file"
                aria-label="Upload patient photo"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
              {existing?.photo && !photo && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  Current photo on file.
                </Typography>
              )}
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button type="submit" variant="contained" disabled={creating || updating}>
              {isEdit ? 'Save changes' : 'Register patient'}
            </Button>
            <Button variant="outlined" onClick={() => navigate(isEdit ? `/patients/${id}` : '/patients')}>
              Cancel
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
