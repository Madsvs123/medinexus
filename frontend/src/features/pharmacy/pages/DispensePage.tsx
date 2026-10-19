import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Divider, Link, List, ListItem, ListItemText, MenuItem, Stack, TextField, Typography } from '@mui/material';
import MedicationLiquidIcon from '@mui/icons-material/MedicationLiquid';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { PageHeader, SearchField, FormAutocomplete, StatusChip, EmptyState } from '../../../components/ui';
import { useDebounce } from '../../../hooks/useDebounce';
import {
  useCreateDispensationMutation,
  useGetBatchesQuery,
  useGetMedicationsQuery,
  useGetPrescriptionsForDispenseQuery,
  useSearchPharmacyPatientsQuery,
} from '../api';
import type { PatientLite, PrescriptionLite } from '../types';
import { rxMedName } from '../types';

interface LineItem {
  prescription: PrescriptionLite;
  medication_id: number;
  batch_id: number;
  quantity: number;
  price: number;
}

export default function DispensePage() {
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState('');
  const [patient, setPatient] = useState<PatientLite | null>(null);
  const [rx, setRx] = useState<PrescriptionLite | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const { data: patientsData } = useSearchPharmacyPatientsQuery({ search: debouncedSearch || undefined, page_size: 10 });
  const patientOptions = useMemo(() => patientsData?.results ?? [], [patientsData]);

  const { data: rxData, isLoading: rxLoading } = useGetPrescriptionsForDispenseQuery(
    { patient: patient?.id, status: 'ACTIVE', page_size: 50 },
    { skip: !patient },
  );
  const prescriptions = useMemo(() => rxData?.results ?? [], [rxData]);

  const { data: medsData } = useGetMedicationsQuery({ page_size: 200 });
  const meds = useMemo(() => medsData?.results ?? [], [medsData]);

  const { data: batchesData } = useGetBatchesQuery({ page_size: 500 });
  const batches = useMemo(() => batchesData?.results ?? [], [batchesData]);

  const [dispense, { isLoading: dispensing }] = useCreateDispensationMutation();

  const usableBatchesFor = (medicationId: number) =>
    batches.filter(
      (b) =>
        (typeof b.medication === 'number' ? b.medication : b.medication.id) === medicationId &&
        b.quantity > 0 &&
        !dayjs(b.expiry_date).isBefore(dayjs(), 'day'),
    );

  const medPrice = (medicationId: number): number => {
    const m = meds.find((x) => x.id === medicationId);
    return m ? Number(m.price) : 0;
  };

  const addItem = (p: PrescriptionLite) => {
    const medicationId = typeof p.medication === 'number' ? p.medication : p.medication.id;
    const avail = usableBatchesFor(medicationId);
    if (avail.length === 0) {
      enqueueSnackbar('No available stock (batches) for this medication', { variant: 'error' });
      return;
    }
    if (items.some((i) => i.prescription.id === p.id)) {
      enqueueSnackbar('This prescription is already in the cart', { variant: 'warning' });
      return;
    }
    setItems((prev) => [
      ...prev,
      { prescription: p, medication_id: medicationId, batch_id: avail[0].id, quantity: 1, price: medPrice(medicationId) },
    ]);
  };

  const updateItem = (index: number, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const stockError = (item: LineItem): string | null => {
    const batch = batches.find((b) => b.id === item.batch_id);
    if (!batch) return 'Batch not found';
    if (item.quantity <= 0) return 'Quantity must be positive';
    if (item.quantity > batch.quantity) return `Only ${batch.quantity} remaining in batch ${batch.batch_no}`;
    return null;
  };

  const total = items.reduce((sum, i) => sum + i.quantity * i.price, 0);
  const hasErrors = items.some((i) => stockError(i));

  const doDispense = async () => {
    if (items.length === 0 || hasErrors) return;
    try {
      await dispense({
        prescription_id: items[0].prescription.id,
        items: items.map((i) => ({ medication_id: i.medication_id, batch_id: i.batch_id, quantity: i.quantity, price: i.price })),
        notes: notes || undefined,
      }).unwrap();
      enqueueSnackbar('Dispensed successfully', { variant: 'success' });
      setItems([]);
      setRx(null);
      setNotes('');
      setPatient(null);
      setSearch('');
    } catch (e) {
      const err = e as { data?: { detail?: string } };
      enqueueSnackbar(err.data?.detail ?? 'Dispensation failed — check stock', { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader title="Dispense" subtitle="Fill prescriptions against available batches" />
      <Stack spacing={2}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>1. Find patient</Typography>
            <SearchField value={search} onChange={setSearch} placeholder="Search patient by name or MRN…" />
            <Box sx={{ mt: 1, maxWidth: 480 }}>
              <FormAutocomplete
                label="Patient"
                options={patientOptions}
                getOptionLabel={(p) => `${p.full_name ?? `${p.first_name} ${p.last_name}`} (${p.mrn})`}
                value={patient}
                onChange={(p) => {
                  setPatient(p);
                  setRx(null);
                  setItems([]);
                }}
              />
            </Box>
            {patient && (
              <Link component={RouterLink} to={`/patients/${patient.id}`} underline="hover">
                View patient record →
              </Link>
            )}
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>2. Active prescriptions</Typography>
            {!patient ? (
              <EmptyState title="Select a patient first" hint="Active prescriptions will load here." />
            ) : rxLoading ? (
              <EmptyState title="Loading prescriptions…" hint="" />
            ) : prescriptions.length === 0 ? (
              <EmptyState title="No active prescriptions" hint="This patient has no active prescriptions to dispense." />
            ) : (
              <List dense>
                {prescriptions.map((p) => (
                  <ListItem
                    key={p.id}
                    divider
                    secondaryAction={
                      <Button size="small" variant="contained" onClick={() => addItem(p)}>Add to cart</Button>
                    }
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <strong>{rxMedName(p.medication)}</strong>
                          <span>{p.dosage} • {p.frequency} • {p.route}</span>
                          <StatusChip status={p.status} />
                        </Stack>
                      }
                      secondary={`Rx #${p.id}${p.warnings?.length ? ` • ⚠ ${p.warnings.length} warning(s)` : ''}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>3. Cart & batch selection</Typography>
            {items.length === 0 ? (
              <EmptyState icon={<MedicationLiquidIcon />} title="Cart is empty" hint="Add prescriptions to build the dispensation." />
            ) : (
              <Stack spacing={1.5}>
                {items.map((item, idx) => {
                  const error = stockError(item);
                  const avail = usableBatchesFor(item.medication_id);
                  return (
                    <Box key={idx} sx={{ border: '1px solid', borderColor: error ? 'error.main' : 'divider', borderRadius: 1, p: 1.5 }}>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center">
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{rxMedName(item.prescription.medication)}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Rx #{item.prescription.id} • {item.prescription.dosage} {item.prescription.frequency}
                          </Typography>
                        </Box>
                        <TextField
                          select
                          size="small"
                          label="Batch"
                          value={item.batch_id}
                          onChange={(e) => updateItem(idx, { batch_id: Number(e.target.value) })}
                          sx={{ minWidth: 220 }}
                        >
                          {avail.map((b) => (
                            <MenuItem key={b.id} value={b.id}>
                              {b.batch_no} — {b.quantity} remaining, exp {dayjs(b.expiry_date).format('MMM YYYY')}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          size="small"
                          type="number"
                          label="Qty"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                          sx={{ width: 90 }}
                        />
                        <Typography variant="body2">{(item.quantity * item.price).toFixed(2)}</Typography>
                        <Button size="small" color="error" variant="outlined" onClick={() => removeItem(idx)}>Remove</Button>
                      </Stack>
                      {error && <Alert severity="error" role="alert" sx={{ mt: 1 }}>{error}</Alert>}
                    </Box>
                  );
                })}
                <Divider />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} size="small" sx={{ minWidth: 300 }} />
                  <Typography variant="h6">Total: {total.toFixed(2)}</Typography>
                  <Button variant="contained" onClick={doDispense} disabled={dispensing || hasErrors}>
                    Dispense
                  </Button>
                </Stack>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
