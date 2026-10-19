import { useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { PageHeader, DataTable, StatusChip, FormTextField, EmptyState, ErrorAlert } from '../../../components/ui';
import { useCreateSupplierMutation, useGetSuppliersQuery, useUpdateSupplierMutation } from '../api';
import type { Supplier } from '../types';

const supplierSchema = z.object({
  name: z.string().min(1, 'Name required'),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  is_active: z.boolean().default(true),
});

type SupplierValues = z.infer<typeof supplierSchema>;

export default function SupplierList() {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading, error } = useGetSuppliersQuery({ page_size: 100 });
  const [createSupplier, { isLoading: saving }] = useCreateSupplierMutation();
  const [updateSupplier] = useUpdateSupplierMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const { control, handleSubmit, reset, watch, setValue } = useForm<SupplierValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: '', contact_person: '', phone: '', email: '', address: '', is_active: true },
  });

  const columns = useMemo(
    () => [
      { key: 'name', label: 'Supplier', render: (r: Supplier) => <strong>{r.name}</strong> },
      { key: 'contact', label: 'Contact', render: (r: Supplier) => r.contact_person || '—' },
      { key: 'phone', label: 'Phone', render: (r: Supplier) => r.phone || '—' },
      { key: 'email', label: 'Email', render: (r: Supplier) => r.email || '—' },
      { key: 'status', label: 'Status', render: (r: Supplier) => <StatusChip status={r.is_active ? 'ACTIVE' : 'INACTIVE'} /> },
      {
        key: 'actions',
        label: '',
        render: (r: Supplier) => (
          <IconButton
            aria-label="Edit supplier"
            onClick={() => {
              setEditing(r);
              reset({ name: r.name, contact_person: r.contact_person ?? '', phone: r.phone ?? '', email: r.email ?? '', address: r.address ?? '', is_active: r.is_active });
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

  const onSave = handleSubmit(async (values: SupplierValues) => {
    try {
      if (editing) {
        await updateSupplier({ id: editing.id, body: values }).unwrap();
        enqueueSnackbar('Supplier updated', { variant: 'success' });
      } else {
        await createSupplier(values).unwrap();
        enqueueSnackbar('Supplier created', { variant: 'success' });
      }
      setOpen(false);
      setEditing(null);
      reset();
    } catch {
      enqueueSnackbar('Failed to save supplier', { variant: 'error' });
    }
  });

  return (
    <Box>
      <PageHeader
        title="Suppliers"
        subtitle="Vendors for medication batches"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); reset(); setOpen(true); }}>
            New supplier
          </Button>
        }
      />
      {error && <ErrorAlert error={error} />}
      <DataTable
        columns={columns}
        rows={data?.results ?? []}
        loading={isLoading}
        rowKey={(r) => String(r.id)}
        emptyState={<EmptyState icon={<LocalShippingIcon />} title="No suppliers" hint="Add your medication vendors." />}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit supplier' : 'New supplier'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormTextField control={control} name="name" label="Name" required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="contact_person" label="Contact person" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormTextField control={control} name="phone" label="Phone" />
            </Grid>
            <Grid item xs={12}>
              <FormTextField control={control} name="email" label="Email" />
            </Grid>
            <Grid item xs={12}>
              <FormTextField control={control} name="address" label="Address" multiline minRows={2} />
            </Grid>
            <Grid item xs={12}>
              <Button variant={watch('is_active') ? 'contained' : 'outlined'} size="small" onClick={() => setValue('is_active', !watch('is_active'))}>
                {watch('is_active') ? 'Active' : 'Inactive'}
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
