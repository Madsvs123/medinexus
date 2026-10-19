import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/ui';
import { formatCurrency } from '../../../utils/format';
import {
  useGetServicesQuery,
  useGetInvoiceQuery,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
} from '../api';
import { num, patientLabel, type Service } from '../types';
import PatientAutocomplete, { type PatientOption } from '../components/PatientAutocomplete';

const itemSchema = z.object({
  service: z.number({ invalid_type_error: 'Service is required' }).min(1, 'Service is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be ≥ 1'),
  unit_price: z.coerce.number().min(0, 'Cannot be negative'),
  discount: z.coerce.number().min(0, 'Cannot be negative'),
  tax: z.coerce.number().min(0, 'Cannot be negative'),
});

const schema = z.object({
  patient: z.custom<PatientOption | null>((v) => !!v && typeof v === 'object' && 'id' in v, 'Patient is required'),
  encounter: z.string().optional(),
  due_date: z.string().nullable().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
});

type FormValues = z.infer<typeof schema>;

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

export default function InvoiceForm() {
  const { id } = useParams();
  const invoiceId = id ? Number(id) : null;
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = invoiceId !== null;

  const { data: servicesData, isLoading: servicesLoading } = useGetServicesQuery({ page_size: 200 });
  const services = useMemo(() => servicesData?.results ?? [], [servicesData]);
  const { data: invoice, isLoading: invoiceLoading } = useGetInvoiceQuery(invoiceId ?? 0, { skip: !isEdit });

  const { control, handleSubmit, register, watch, reset, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      patient: null,
      encounter: '',
      due_date: null,
      notes: '',
      items: [{ service: 0, quantity: 1, unit_price: 0, discount: 0, tax: 0 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items');

  useEffect(() => {
    if (!invoice) return;
    reset({
      patient: typeof invoice.patient === 'object' ? { id: invoice.patient.id, label: patientLabel(invoice.patient) } : null,
      encounter: invoice.encounter ? String(invoice.encounter) : '',
      due_date: invoice.due_date,
      notes: invoice.notes ?? '',
      items: invoice.items.map((it) => ({
        service: typeof it.service === 'object' ? it.service.id : it.service,
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        discount: Number(it.discount),
        tax: Number(it.tax),
      })),
    });
  }, [invoice, reset]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let discount = 0;
    let tax = 0;
    for (const it of items ?? []) {
      const qty = Number(it.quantity) || 0;
      const up = Number(it.unit_price) || 0;
      subtotal += qty * up;
      discount += Number(it.discount) || 0;
      tax += Number(it.tax) || 0;
    }
    return { subtotal, discount, tax, total: subtotal - discount + tax };
  }, [items]);

  const onServiceChange = (index: number, serviceId: number) => {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    const current = items ?? [];
    const qty = Number(current[index]?.quantity) || 1;
    const price = num(svc.price);
    const tax = Math.round(price * qty * num(svc.tax_rate)) / 100;
    setValue(
      'items',
      current.map((it, i) => (i === index ? { ...it, unit_price: price, tax } : it)),
      { shouldValidate: true },
    );
  };

  const [createInvoice] = useCreateInvoiceMutation();
  const [updateInvoice] = useUpdateInvoiceMutation();

  const onSubmit = async (values: FormValues) => {
    const payload = {
      patient: values.patient?.id,
      encounter: values.encounter ? Number(values.encounter) : null,
      due_date: values.due_date || null,
      notes: values.notes ?? '',
      items: values.items.map((it) => ({
        service: it.service,
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount: it.discount,
        tax: it.tax,
      })),
    };
    try {
      if (isEdit && invoiceId) {
        await updateInvoice({ id: invoiceId, body: payload }).unwrap();
        enqueueSnackbar('Invoice updated', { variant: 'success' });
      } else {
        await createInvoice(payload).unwrap();
        enqueueSnackbar('Invoice created', { variant: 'success' });
      }
      navigate('/billing/invoices');
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const itemsRootError = (formState.errors.items as { root?: { message?: string } } | undefined)?.root?.message;

  if (isEdit && invoiceLoading) return <LinearProgress />;

  return (
    <Box>
      <PageHeader
        title={isEdit ? `Edit invoice ${invoice?.invoice_number ?? ''}` : 'New invoice'}
        subtitle="Add services, apply discounts and tax"
        actions={
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/billing/invoices')}>
            Back to invoices
          </Button>
        }
      />
      <Paper variant="outlined" sx={{ p: 3 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <PatientAutocomplete name="patient" control={control} label="Patient *" />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Encounter ID (optional)"
                fullWidth
                size="small"
                {...register('encounter')}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Controller
                name="due_date"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Due date"
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(d) => field.onChange(d ? d.format('YYYY-MM-DD') : null)}
                  />
                )}
              />
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>Items</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Service</TableCell>
                  <TableCell align="right" width={90}>Qty</TableCell>
                  <TableCell align="right" width={130}>Unit price</TableCell>
                  <TableCell align="right" width={110}>Discount</TableCell>
                  <TableCell align="right" width={110}>Tax</TableCell>
                  <TableCell align="right" width={130}>Line total</TableCell>
                  <TableCell width={48} />
                </TableRow>
              </TableHead>
              <TableBody>
                {fields.map((field, i) => {
                  const svc = services.find((s) => s.id === Number(items?.[i]?.service));
                  const lineTotal =
                    (Number(items?.[i]?.quantity) || 0) * (Number(items?.[i]?.unit_price) || 0) -
                    (Number(items?.[i]?.discount) || 0) +
                    (Number(items?.[i]?.tax) || 0);
                  return (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Controller
                          name={`items.${i}.service`}
                          control={control}
                          render={({ field: f, fieldState }) => (
                            <Autocomplete
                              size="small"
                              options={services}
                              loading={servicesLoading}
                              getOptionLabel={(s: Service) => `${s.code} — ${s.name}`}
                              isOptionEqualToValue={(a, b) => a.id === b.id}
                              value={services.find((s) => s.id === Number(f.value)) ?? null}
                              onChange={(_e, v) => {
                                f.onChange(v ? v.id : 0);
                                if (v) onServiceChange(i, v.id);
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  placeholder="Select service"
                                  size="small"
                                  error={!!fieldState.error}
                                  helperText={fieldState.error?.message}
                                />
                              )}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          inputProps={{ min: 1 }}
                          {...register(`items.${i}.quantity` as const, { valueAsNumber: true })}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          inputProps={{ min: 0, step: '0.01' }}
                          {...register(`items.${i}.unit_price` as const, { valueAsNumber: true })}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          inputProps={{ min: 0, step: '0.01' }}
                          {...register(`items.${i}.discount` as const, { valueAsNumber: true })}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          inputProps={{ min: 0, step: '0.01' }}
                          {...register(`items.${i}.tax` as const, { valueAsNumber: true })}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>
                          {formatCurrency(lineTotal)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton aria-label="Remove item" size="small" onClick={() => remove(i)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mt: 2, flexWrap: 'wrap', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => append({ service: 0, quantity: 1, unit_price: 0, discount: 0, tax: 0 })}
            >
              Add item
            </Button>
            <Box sx={{ minWidth: 260, textAlign: 'right' }}>
              <TotalsRow label="Subtotal" value={totals.subtotal} />
              <TotalsRow label="Discount" value={-totals.discount} />
              <TotalsRow label="Tax" value={totals.tax} />
              <TotalsRow label="Total" value={totals.total} bold />
            </Box>
          </Box>

          <TextField
            label="Notes"
            fullWidth
            multiline
            minRows={2}
            sx={{ mt: 2 }}
            {...register('notes')}
          />

          {itemsRootError && (
            <Chip label={itemsRootError} color="error" sx={{ mt: 1 }} />
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
            <Button onClick={() => navigate('/billing/invoices')}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={formState.isSubmitting}>
              {isEdit ? 'Save changes' : 'Create invoice'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

function TotalsRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 3, py: 0.25 }}>
      <Typography variant="body2" fontWeight={bold ? 700 : 400}>{label}</Typography>
      <Typography variant="body2" fontWeight={bold ? 700 : 400}>
        {value < 0 ? `-${formatCurrency(Math.abs(value))}` : formatCurrency(value)}
      </Typography>
    </Box>
  );
}

// Re-export so the file stays self-documenting for the integrator
export type { Service };
