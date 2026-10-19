import { useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BiotechIcon from '@mui/icons-material/Biotech';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { PageHeader, DataTable, StatusChip, FormTextField, FormSelect, EmptyState, ErrorAlert } from '../../../components/ui';
import { useCreateLabTestMutation, useGetLabTestsQuery, useUpdateLabTestMutation } from '../api';
import type { LabTest } from '../types';
import { LAB_TEST_CATEGORIES, SAMPLE_TYPES } from '../types';

const testSchema = z.object({
  code: z.string().min(1, 'Code required'),
  name: z.string().min(1, 'Name required'),
  category: z.string().default('HEMATOLOGY'),
  sample_type: z.string().default('BLOOD'),
  unit: z.string().optional(),
  ref_range_low: z.coerce.number().nullable().optional(),
  ref_range_high: z.coerce.number().nullable().optional(),
  price: z.coerce.number().min(0).default(0),
  active: z.boolean().default(true),
});

type TestValues = z.infer<typeof testSchema>;

export default function LabTestsAdmin() {
  const { enqueueSnackbar } = useSnackbar();
  const [category, setCategory] = useState('');
  const { data, isLoading, error } = useGetLabTestsQuery({ page_size: 200, category: category || undefined });
  const [createTest, { isLoading: saving }] = useCreateLabTestMutation();
  const [updateTest] = useUpdateLabTestMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LabTest | null>(null);
  const { control, handleSubmit, reset, watch, setValue } = useForm<TestValues>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      code: '',
      name: '',
      category: 'HEMATOLOGY',
      sample_type: 'BLOOD',
      unit: '',
      ref_range_low: null,
      ref_range_high: null,
      price: 0,
      active: true,
    },
  });

  const columns = useMemo(
    () => [
      { key: 'code', label: 'Code', render: (r: LabTest) => <strong>{r.code}</strong> },
      { key: 'name', label: 'Name', render: (r: LabTest) => r.name },
      { key: 'category', label: 'Category', render: (r: LabTest) => <StatusChip status={r.category} /> },
      { key: 'sample', label: 'Sample', render: (r: LabTest) => r.sample_type },
      {
        key: 'range',
        label: 'Ref range',
        render: (r: LabTest) => `${r.ref_range_low ?? '—'} – ${r.ref_range_high ?? '—'} ${r.unit}`,
      },
      { key: 'price', label: 'Price', render: (r: LabTest) => Number(r.price).toFixed(2) },
      { key: 'status', label: 'Status', render: (r: LabTest) => <StatusChip status={r.active ? 'ACTIVE' : 'INACTIVE'} /> },
      {
        key: 'actions',
        label: '',
        render: (r: LabTest) => (
          <IconButton
            aria-label="Edit test"
            onClick={() => {
              setEditing(r);
              reset({
                code: r.code,
                name: r.name,
                category: r.category,
                sample_type: r.sample_type,
                unit: r.unit ?? '',
                ref_range_low: r.ref_range_low,
                ref_range_high: r.ref_range_high,
                price: Number(r.price),
                active: r.active,
              });
              setOpen(true);
            }}
          >
            <EditIcon />
          </IconButton>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const onSave = handleSubmit(async (values: TestValues) => {
    try {
      if (editing) {
        await updateTest({ id: editing.id, body: values as never }).unwrap();
        enqueueSnackbar('Test updated', { variant: 'success' });
      } else {
        await createTest(values as never).unwrap();
        enqueueSnackbar('Test created', { variant: 'success' });
      }
      setOpen(false);
      setEditing(null);
      reset();
    } catch {
      enqueueSnackbar('Failed to save test', { variant: 'error' });
    }
  });

  return (
    <Box>
      <PageHeader
        title="Lab tests catalog"
        subtitle="Configure available tests and reference ranges"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); reset(); setOpen(true); }}>
            New test
          </Button>
        }
      />
      <Box sx={{ width: 220, mb: 2 }}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
          style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        >
          <option value="">All categories</option>
          {LAB_TEST_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Box>
      {error && <ErrorAlert error={error} />}
      <DataTable
        columns={columns}
        rows={data?.results ?? []}
        loading={isLoading}
        rowKey={(r) => String(r.id)}
        emptyState={<EmptyState icon={<BiotechIcon />} title="No tests" hint="Add tests to the catalog so they can be ordered." />}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit test' : 'New test'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="code" label="Code" required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="name" label="Name" required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormSelect control={control} name="category" label="Category" options={LAB_TEST_CATEGORIES.map((c) => ({ value: c, label: c }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormSelect control={control} name="sample_type" label="Sample type" options={SAMPLE_TYPES.map((s) => ({ value: s, label: s }))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormTextField control={control} name="ref_range_low" label="Ref low" type="number" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormTextField control={control} name="ref_range_high" label="Ref high" type="number" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormTextField control={control} name="unit" label="Unit" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="price" label="Price" type="number" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                variant={watch('active') ? 'contained' : 'outlined'}
                color={watch('active') ? 'success' : 'inherit'}
                size="small"
                onClick={() => setValue('active', !watch('active'))}
                sx={{ mt: 1 }}
              >
                {watch('active') ? 'Active' : 'Inactive'}
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={onSave} disabled={saving}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
