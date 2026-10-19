import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { PageHeader, StatusChip, FormTextField, FormSelect, FormAutocomplete, EmptyState, ErrorAlert, LoadingOverlay } from '../../../components/ui';
import {
  useCreateCarePlanMutation,
  useCreateMedicationAdministrationMutation,
  useCreateObservationMutation,
  useCreateRoundMutation,
  useDischargeAdmissionMutation,
  useGetAdmissionQuery,
  useGetBedsQuery,
  useGetCarePlansQuery,
  useGetDischargesQuery,
  useGetInpatientMedicationsQuery,
  useGetMedicationAdministrationsQuery,
  useGetObservationsQuery,
  useGetRoundsQuery,
  useTransferAdmissionMutation,
  useUpdateCarePlanMutation,
  useUpdateMedicationAdministrationMutation,
} from '../api';
import type { Admission, Bed, CarePlan, MedicationAdministration, MedAdminStatus, NursingObservation } from '../types';
import { bedLabel, medName, patientLabel, userName } from '../types';

interface TabPanelProps {
  value: number;
  index: number;
  children: React.ReactNode;
}

function TabPanel({ value, index, children }: TabPanelProps) {
  return (
    <Box role="tabpanel" hidden={value !== index} id={`admission-tab-${index}`} aria-labelledby={`admission-tab-${index}`} sx={{ pt: 2 }}>
      {value === index && children}
    </Box>
  );
}

export default function AdmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const admissionId = Number(id);
  const [tab, setTab] = useState(0);
  const { data: admission, isLoading, error } = useGetAdmissionQuery(admissionId);

  if (isLoading) return <LoadingOverlay open />;
  if (error) return <ErrorAlert error={error} />;
  if (!admission) return <EmptyState title="Admission not found" hint="It may have been removed." />;

  const isActive = admission.status === 'ACTIVE';

  return (
    <Box>
      <PageHeader
        title={`Admission A-${admission.id} — ${patientLabel(admission.patient)}`}
        subtitle={`${admission.admission_type} • admitted ${dayjs(admission.admitted_at).format('DD MMM YYYY HH:mm')} • bed ${bedLabel(admission.bed)}`}
      />
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <StatusChip status={admission.status} />
        <StatusChip status={admission.admission_type} />
        <Typography variant="caption" color="text.secondary">MRN: {typeof admission.patient === 'number' ? '—' : admission.patient.mrn}</Typography>
      </Stack>
      <Paper sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_e, v: number) => setTab(v)} aria-label="Admission sections">
          <Tab label="Overview" />
          <Tab label="Observations" />
          <Tab label="Medications" />
          <Tab label="Rounds" />
          <Tab label="Care Plan" />
          <Tab label="Discharge" />
        </Tabs>
      </Paper>
      <TabPanel value={tab} index={0}><OverviewTab admission={admission} isActive={isActive} /></TabPanel>
      <TabPanel value={tab} index={1}><ObservationsTab admissionId={admissionId} readOnly={!isActive} /></TabPanel>
      <TabPanel value={tab} index={2}><MedicationsTab admissionId={admissionId} readOnly={!isActive} /></TabPanel>
      <TabPanel value={tab} index={3}><RoundsTab admissionId={admissionId} readOnly={!isActive} /></TabPanel>
      <TabPanel value={tab} index={4}><CarePlanTab admissionId={admissionId} readOnly={!isActive} /></TabPanel>
      <TabPanel value={tab} index={5}><DischargeTabInner admission={admission} isActive={isActive} /></TabPanel>
    </Box>
  );
}

// ---------- Overview ----------

function OverviewTab({ admission, isActive }: { admission: Admission; isActive: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data: bedsData } = useGetBedsQuery({ page_size: 200, status: 'AVAILABLE' });
  const [transferAdmission] = useTransferAdmissionMutation();
  const [dischargeAdmission] = useDischargeAdmissionMutation();
  const [transferOpen, setTransferOpen] = useState(false);
  const [targetBed, setTargetBed] = useState<Bed | null>(null);
  const [reason, setReason] = useState('');
  const beds = useMemo(() => bedsData?.results ?? [], [bedsData]);

  const doTransfer = async () => {
    if (!targetBed) return;
    try {
      await transferAdmission({ id: admission.id, bed_id: targetBed.id, reason: reason || undefined }).unwrap();
      enqueueSnackbar('Patient transferred', { variant: 'success' });
      setTransferOpen(false);
      setTargetBed(null);
      setReason('');
    } catch {
      enqueueSnackbar('Transfer failed', { variant: 'error' });
    }
  };

  const doDischarge = async () => {
    try {
      await dischargeAdmission({
        id: admission.id,
        body: {
          discharge_type: 'HOME',
          summary: '',
          medications_at_discharge: '',
          follow_up_instructions: '',
          status: 'DRAFT',
        },
      }).unwrap();
      enqueueSnackbar('Discharge started — complete it in the Discharge tab', { variant: 'success' });
    } catch {
      enqueueSnackbar('Discharge failed', { variant: 'error' });
    }
  };

  const rows: Array<[string, string]> = [
    ['Patient', patientLabel(admission.patient)],
    ['Bed', bedLabel(admission.bed)],
    ['Admitted by', userName(admission.admitted_by)],
    ['Admitted at', dayjs(admission.admitted_at).format('DD MMM YYYY HH:mm')],
    ['Expected discharge', admission.expected_discharge_date ? dayjs(admission.expected_discharge_date).format('DD MMM YYYY') : '—'],
    ['Diagnosis on admission', admission.diagnosis_on_admission || '—'],
  ];

  return (
    <Box>
      {isActive && (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button variant="outlined" startIcon={<SwapHorizIcon />} onClick={() => setTransferOpen(true)}>Transfer</Button>
          <Button variant="contained" color="error" startIcon={<ExitToAppIcon />} onClick={doDischarge}>Start discharge</Button>
        </Stack>
      )}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>Admission details</Typography>
          <List dense>
            {rows.map(([label, value]) => (
              <ListItem key={label} divider>
                <ListItemText primary={label} secondary={value} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
      <Dialog open={transferOpen} onClose={() => setTransferOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Transfer patient</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>Choose a destination bed:</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
            {beds.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No available beds.</Typography>
            ) : (
              beds.map((b) => (
                <Chip
                  key={b.id}
                  label={bedLabel(b)}
                  color={targetBed?.id === b.id ? 'primary' : 'default'}
                  variant={targetBed?.id === b.id ? 'filled' : 'outlined'}
                  onClick={() => setTargetBed(b)}
                  sx={{ cursor: 'pointer' }}
                />
              ))
            )}
          </Stack>
          <TextField label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={2} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={doTransfer} disabled={!targetBed}>Transfer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ---------- Observations ----------

const observationSchema = z.object({
  bp_systolic: z.coerce.number().int().min(20).max(300).nullable().optional(),
  bp_diastolic: z.coerce.number().int().min(10).max(200).nullable().optional(),
  heart_rate: z.coerce.number().int().min(10).max(300).nullable().optional(),
  respiratory_rate: z.coerce.number().int().min(4).max(100).nullable().optional(),
  temperature: z.coerce.number().min(30).max(45).nullable().optional(),
  spo2: z.coerce.number().int().min(50).max(100).nullable().optional(),
  consciousness: z.string().default('ALERT'),
  notes: z.string().optional(),
});

function ObservationsTab({ admissionId, readOnly }: { admissionId: number; readOnly?: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useGetObservationsQuery({ admission: admissionId, page_size: 50 });
  const [createObservation, { isLoading: saving }] = useCreateObservationMutation();
  const [open, setOpen] = useState(false);
  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(observationSchema),
    defaultValues: {
      bp_systolic: null,
      bp_diastolic: null,
      heart_rate: null,
      respiratory_rate: null,
      temperature: null,
      spo2: null,
      consciousness: 'ALERT',
      notes: '',
    },
  });
  const rows = useMemo(() => data?.results ?? [], [data]);

  const onSave = handleSubmit(async (values) => {
    try {
      await createObservation({ admission: admissionId, ...values } as never).unwrap();
      enqueueSnackbar('Observation recorded', { variant: 'success' });
      setOpen(false);
      reset();
    } catch {
      enqueueSnackbar('Failed to record observation', { variant: 'error' });
    }
  });

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Nursing observations</Typography>
          {!readOnly && <Button size="small" variant="contained" onClick={() => setOpen(true)}>Add</Button>}
        </Stack>
        {isLoading ? (
          <EmptyState title="Loading…" hint="" />
        ) : rows.length === 0 ? (
          <EmptyState title="No observations" hint="Nursing observations will appear here." />
        ) : (
          <List dense>
            {rows.map((o: NursingObservation) => (
              <ListItem key={o.id} divider>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip size="small" label={`BP ${o.bp_systolic ?? '—'}/${o.bp_diastolic ?? '—'}`} />
                      <Chip size="small" label={`HR ${o.heart_rate ?? '—'}`} />
                      <Chip size="small" label={`RR ${o.respiratory_rate ?? '—'}`} />
                      <Chip size="small" label={`T ${o.temperature ?? '—'}°C`} />
                      <Chip size="small" label={`SpO2 ${o.spo2 ?? '—'}%`} />
                      <StatusChip status={o.consciousness} />
                    </Stack>
                  }
                  secondary={`${dayjs(o.recorded_at).format('DD MMM YYYY HH:mm')} • ${userName(o.recorded_by)}${o.notes ? ` • ${o.notes}` : ''}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Record observation</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}><FormTextField control={control} name="bp_systolic" label="BP systolic" type="number" /></Grid>
            <Grid item xs={6}><FormTextField control={control} name="bp_diastolic" label="BP diastolic" type="number" /></Grid>
            <Grid item xs={6}><FormTextField control={control} name="heart_rate" label="Heart rate" type="number" /></Grid>
            <Grid item xs={6}><FormTextField control={control} name="respiratory_rate" label="Resp rate" type="number" /></Grid>
            <Grid item xs={6}><FormTextField control={control} name="temperature" label="Temperature" type="number" /></Grid>
            <Grid item xs={6}><FormTextField control={control} name="spo2" label="SpO2 (%)" type="number" /></Grid>
            <Grid item xs={12}>
              <FormSelect control={control} name="consciousness" label="Consciousness" options={['ALERT', 'RESPONSIVE', 'UNRESPONSIVE', 'OTHER'].map((c) => ({ value: c, label: c }))} />
            </Grid>
            <Grid item xs={12}><FormTextField control={control} name="notes" label="Notes" multiline minRows={2} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={onSave} disabled={saving}>Save</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

// ---------- Medications (administration log) ----------

const medAdminSchema = z.object({
  medication: z.number({ invalid_type_error: 'Select a medication' }),
  dose: z.string().min(1, 'Dose required'),
  route: z.string().default('ORAL'),
  scheduled_time: z.string().optional(),
  status: z.string().default('GIVEN'),
  notes: z.string().optional(),
});

function MedicationsTab({ admissionId, readOnly }: { admissionId: number; readOnly?: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useGetMedicationAdministrationsQuery({ admission: admissionId, page_size: 50 });
  const { data: medsData } = useGetInpatientMedicationsQuery({ page_size: 100 });
  const [createAdmin, { isLoading: saving }] = useCreateMedicationAdministrationMutation();
  const [updateAdmin] = useUpdateMedicationAdministrationMutation();
  const [open, setOpen] = useState(false);
  const meds = useMemo(() => medsData?.results ?? [], [medsData]);
  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(medAdminSchema),
    defaultValues: { medication: undefined as unknown as number, dose: '', route: 'ORAL', scheduled_time: dayjs().format('YYYY-MM-DDTHH:mm'), status: 'GIVEN', notes: '' },
  });
  const rows = useMemo(() => data?.results ?? [], [data]);

  const onSave = handleSubmit(async (values) => {
    try {
      await createAdmin({
        admission: admissionId,
        medication: values.medication,
        dose: values.dose,
        route: values.route,
        scheduled_time: values.scheduled_time ? dayjs(values.scheduled_time).toISOString() : dayjs().toISOString(),
        status: values.status as MedAdminStatus,
        notes: values.notes ?? '',
      }).unwrap();
      enqueueSnackbar('Administration logged', { variant: 'success' });
      setOpen(false);
      reset();
    } catch {
      enqueueSnackbar('Failed to log administration', { variant: 'error' });
    }
  });

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Medication administration log</Typography>
          {!readOnly && <Button size="small" variant="contained" onClick={() => setOpen(true)}>Log dose</Button>}
        </Stack>
        {isLoading ? (
          <EmptyState title="Loading…" hint="" />
        ) : rows.length === 0 ? (
          <EmptyState title="No administrations logged" hint="Record each dose given, held or refused." />
        ) : (
          <List dense>
            {rows.map((m: MedicationAdministration) => (
              <ListItem
                key={m.id}
                divider
                secondaryAction={
                  !readOnly && m.status === 'SCHEDULED' ? (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={async () => {
                        await updateAdmin({ id: m.id, body: { status: 'GIVEN' } }).unwrap();
                        enqueueSnackbar('Marked as given', { variant: 'success' });
                      }}
                    >
                      Give
                    </Button>
                  ) : undefined
                }
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <strong>{medName(m.medication)}</strong>
                      <span>{m.dose} • {m.route}</span>
                      <StatusChip status={m.status} />
                    </Stack>
                  }
                  secondary={`Scheduled ${dayjs(m.scheduled_time).format('DD MMM HH:mm')}${m.given_at ? ` • given ${dayjs(m.given_at).format('DD MMM HH:mm')}` : ''}${m.given_by ? ` by ${userName(m.given_by)}` : ''}${m.notes ? ` • ${m.notes}` : ''}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Log medication administration</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Controller
              control={control}
              name="medication"
              render={({ field, fieldState }) => (
                <FormAutocomplete
                  label="Medication"
                  options={meds}
                  getOptionLabel={(m) => `${m.name}${m.strength ? ` ${m.strength}` : ''}`}
                  value={meds.find((m) => m.id === field.value) ?? null}
                  onChange={(m) => field.onChange(m?.id ?? null)}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  required
                />
              )}
            />
            <Stack direction="row" spacing={2}>
              <FormTextField control={control} name="dose" label="Dose" required />
              <FormSelect control={control} name="route" label="Route" options={['ORAL', 'IV', 'IM', 'TOPICAL', 'INHALATION', 'SUBLINGUAL'].map((r) => ({ value: r, label: r }))} />
            </Stack>
            <FormTextField control={control} name="scheduled_time" label="Scheduled time" />
            <FormSelect control={control} name="status" label="Status" options={['SCHEDULED', 'GIVEN', 'SKIPPED', 'HELD', 'REFUSED'].map((s) => ({ value: s, label: s }))} />
            <FormTextField control={control} name="notes" label="Notes" multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={onSave} disabled={saving}>Save</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

// ---------- Rounds ----------

const roundSchema = z.object({
  findings: z.string().min(1, 'Findings required'),
  plan: z.string().optional(),
  orders: z.string().optional(),
});

function RoundsTab({ admissionId, readOnly }: { admissionId: number; readOnly?: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useGetRoundsQuery({ admission: admissionId, page_size: 50 });
  const [createRound, { isLoading: saving }] = useCreateRoundMutation();
  const [open, setOpen] = useState(false);
  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(roundSchema),
    defaultValues: { findings: '', plan: '', orders: '' },
  });
  const rows = useMemo(() => data?.results ?? [], [data]);

  const onSave = handleSubmit(async (values) => {
    try {
      await createRound({ admission: admissionId, ...values }).unwrap();
      enqueueSnackbar('Round recorded', { variant: 'success' });
      setOpen(false);
      reset();
    } catch {
      enqueueSnackbar('Failed to record round', { variant: 'error' });
    }
  });

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Doctor rounds</Typography>
          {!readOnly && <Button size="small" variant="contained" onClick={() => setOpen(true)}>Add round</Button>}
        </Stack>
        {isLoading ? (
          <EmptyState title="Loading…" hint="" />
        ) : rows.length === 0 ? (
          <EmptyState title="No rounds" hint="Document daily rounds and orders." />
        ) : (
          <List dense>
            {rows.map((r) => (
              <ListItem key={r.id} divider alignItems="flex-start">
                <ListItemText
                  primary={`${dayjs(r.round_time).format('DD MMM YYYY HH:mm')} — ${userName(r.doctor)}`}
                  secondary={
                    <>
                      <div><em>Findings:</em> {r.findings}</div>
                      {r.plan && <div><em>Plan:</em> {r.plan}</div>}
                      {r.orders && <div><em>Orders:</em> {r.orders}</div>}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Record round</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormTextField control={control} name="findings" label="Findings" required multiline minRows={2} />
            <FormTextField control={control} name="plan" label="Plan" multiline minRows={2} />
            <FormTextField control={control} name="orders" label="Orders" multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={onSave} disabled={saving}>Save</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

// ---------- Care Plan ----------

const carePlanSchema = z.object({
  title: z.string().min(1, 'Title required'),
  goals: z.string().optional(),
  interventions: z.string().optional(),
  status: z.string().default('ACTIVE'),
});

function CarePlanTab({ admissionId, readOnly }: { admissionId: number; readOnly?: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useGetCarePlansQuery({ admission: admissionId, page_size: 50 });
  const [createPlan, { isLoading: saving }] = useCreateCarePlanMutation();
  const [updatePlan] = useUpdateCarePlanMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CarePlan | null>(null);
  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(carePlanSchema),
    defaultValues: { title: '', goals: '', interventions: '', status: 'ACTIVE' },
  });
  const rows = useMemo(() => data?.results ?? [], [data]);

  const onSave = handleSubmit(async (values) => {
    try {
      if (editing) {
        await updatePlan({ id: editing.id, body: values as never }).unwrap();
        enqueueSnackbar('Care plan updated', { variant: 'success' });
      } else {
        await createPlan({ admission: admissionId, ...values } as never).unwrap();
        enqueueSnackbar('Care plan created', { variant: 'success' });
      }
      setOpen(false);
      setEditing(null);
      reset();
    } catch {
      enqueueSnackbar('Failed to save care plan', { variant: 'error' });
    }
  });

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Care plans</Typography>
          {!readOnly && (
            <Button size="small" variant="contained" onClick={() => { setEditing(null); reset(); setOpen(true); }}>New plan</Button>
          )}
        </Stack>
        {isLoading ? (
          <EmptyState title="Loading…" hint="" />
        ) : rows.length === 0 ? (
          <EmptyState title="No care plans" hint="Create a structured care plan for this admission." />
        ) : (
          <List dense>
            {rows.map((p) => (
              <ListItem
                key={p.id}
                divider
                secondaryAction={
                  !readOnly && (
                    <IconButton
                      edge="end"
                      aria-label="Edit care plan"
                      onClick={() => {
                        setEditing(p);
                        reset({ title: p.title, goals: p.goals ?? '', interventions: p.interventions ?? '', status: p.status });
                        setOpen(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  )
                }
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <strong>{p.title}</strong>
                      <StatusChip status={p.status} />
                    </Stack>
                  }
                  secondary={
                    <>
                      {p.goals && <div><em>Goals:</em> {p.goals}</div>}
                      {p.interventions && <div><em>Interventions:</em> {p.interventions}</div>}
                      {p.created_by && <Typography variant="caption" color="text.secondary">by {userName(p.created_by)}</Typography>}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit care plan' : 'New care plan'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormTextField control={control} name="title" label="Title" required />
            <FormTextField control={control} name="goals" label="Goals" multiline minRows={2} />
            <FormTextField control={control} name="interventions" label="Interventions" multiline minRows={2} />
            <FormSelect control={control} name="status" label="Status" options={['ACTIVE', 'COMPLETED', 'ON_HOLD'].map((s) => ({ value: s, label: s }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={onSave} disabled={saving}>Save</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

// ---------- Discharge ----------

const dischargeSchema = z.object({
  discharge_type: z.string().default('HOME'),
  summary: z.string().min(1, 'Summary required'),
  medications_at_discharge: z.string().optional(),
  follow_up_instructions: z.string().optional(),
});

function DischargeTabInner({ admission, isActive }: { admission: Admission; isActive: boolean }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data } = useGetDischargesQuery({ admission: admission.id, page_size: 10 });
  const [dischargeAdmission] = useDischargeAdmissionMutation();
  const [open, setOpen] = useState(false);
  const latest = useMemo(() => (data?.results ?? [])[0] ?? null, [data]);
  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(dischargeSchema),
    defaultValues: { discharge_type: 'HOME', summary: '', medications_at_discharge: '', follow_up_instructions: '' },
  });

  const onSave = handleSubmit(async (values) => {
    try {
      await dischargeAdmission({ id: admission.id, body: { ...values, status: 'DRAFT' } as never }).unwrap();
      enqueueSnackbar('Discharge saved', { variant: 'success' });
      setOpen(false);
      reset();
    } catch {
      enqueueSnackbar('Failed to save discharge', { variant: 'error' });
    }
  });

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Discharge</Typography>
          {isActive && (
            <Button size="small" variant="contained" onClick={() => {
              if (latest) {
                reset({
                  discharge_type: latest.discharge_type,
                  summary: latest.summary ?? '',
                  medications_at_discharge: latest.medications_at_discharge ?? '',
                  follow_up_instructions: latest.follow_up_instructions ?? '',
                });
              }
              setOpen(true);
            }}>
              {latest ? 'Edit discharge' : 'Create discharge'}
            </Button>
          )}
        </Stack>
        {!latest ? (
          <EmptyState title="No discharge" hint="Prepare the discharge summary for this admission." />
        ) : (
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <StatusChip status={latest.status} />
              <StatusChip status={latest.discharge_type} />
            </Stack>
            <Typography variant="subtitle2">Summary</Typography>
            <Typography variant="body2" paragraph sx={{ whiteSpace: 'pre-wrap' }}>{latest.summary || '—'}</Typography>
            <Typography variant="subtitle2">Medications at discharge</Typography>
            <Typography variant="body2" paragraph sx={{ whiteSpace: 'pre-wrap' }}>{latest.medications_at_discharge || '—'}</Typography>
            <Typography variant="subtitle2">Follow-up instructions</Typography>
            <Typography variant="body2" paragraph sx={{ whiteSpace: 'pre-wrap' }}>{latest.follow_up_instructions || '—'}</Typography>
            {latest.status === 'FINAL' && latest.discharged_by && (
              <Typography variant="caption" color="text.secondary">Finalized by {userName(latest.discharged_by)} on {dayjs(latest.discharged_at).format('DD MMM YYYY HH:mm')}</Typography>
            )}
          </Box>
        )}
      </CardContent>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Discharge</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormSelect control={control} name="discharge_type" label="Discharge type" options={['HOME', 'TRANSFER', 'AMA', 'DECEASED'].map((t) => ({ value: t, label: t }))} />
            <FormTextField control={control} name="summary" label="Summary" required multiline minRows={3} />
            <FormTextField control={control} name="medications_at_discharge" label="Medications at discharge" multiline minRows={2} />
            <FormTextField control={control} name="follow_up_instructions" label="Follow-up instructions" multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={onSave}>Save draft</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
