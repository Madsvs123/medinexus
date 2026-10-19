import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
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
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { PageHeader, StatusChip, FormTextField, FormSelect, FormDatePicker, EmptyState, ErrorAlert, LoadingOverlay } from '../../../components/ui';
import { formatDate } from '../../../utils/format';
import {
  useGetPatientQuery,
  useGetPatientTimelineQuery,
  useCreatePatientAllergyMutation,
  useUpdatePatientAllergyMutation,
  useDeletePatientAllergyMutation,
  useCreatePatientConditionMutation,
  useUpdatePatientConditionMutation,
  useDeletePatientConditionMutation,
  useCreatePatientContactMutation,
  useUpdatePatientContactMutation,
  useDeletePatientContactMutation,
  useGetPatientDocumentsQuery,
  useUploadPatientDocumentMutation,
  useDeletePatientDocumentMutation,
  useGetPatientAllergiesQuery,
  useGetPatientConditionsQuery,
  useGetPatientContactsQuery,
  useGetPatientConsentsQuery,
  useCreatePatientConsentMutation,
  useUpdatePatientConsentMutation,
  useDeletePatientConsentMutation,
} from '../api';
import type { PatientDetail, TimelineEvent } from '../types';
import { fullName, planName } from '../types';

interface TabPanelProps {
  value: number;
  index: number;
  children: React.ReactNode;
}

function TabPanel({ value, index, children }: TabPanelProps) {
  return (
    <Box role="tabpanel" hidden={value !== index} id={`patient-tab-${index}`} aria-labelledby={`patient-tab-${index}`} sx={{ pt: 2 }}>
      {value === index && children}
    </Box>
  );
}

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const patientId = Number(id);
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const { data: patient, isLoading, error } = useGetPatientQuery(patientId);
  const { data: timeline, isLoading: timelineLoading } = useGetPatientTimelineQuery(patientId, { skip: !patientId });

  if (isLoading) return <LoadingOverlay open />;
  if (error) return <ErrorAlert error={error} />;
  if (!patient) return <EmptyState title="Patient not found" hint="The record may have been removed." />;

  return (
    <Box>
      <PageHeader
        title={fullName(patient)}
        subtitle={`${patient.mrn} • registered ${formatDate(patient.registration_date)}`}
        action={
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate(`/patients/${patientId}/edit`)}>
            Edit
          </Button>
        }
      />
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Avatar src={patient.photo ?? undefined} sx={{ width: 56, height: 56 }}>{fullName(patient).charAt(0)}</Avatar>
        <Box>
          <Typography variant="body2">{patient.gender ?? 'Gender n/a'} • {patient.date_of_birth ? `${dayjs().diff(dayjs(patient.date_of_birth), 'year')} yrs` : 'DOB n/a'}</Typography>
          <Typography variant="body2" color="text.secondary">
            Blood type: {patient.blood_type === 'UNKNOWN' ? 'Unknown' : patient.blood_type} • {patient.phone || 'no phone'}
          </Typography>
        </Box>
        <StatusChip status={patient.status} />
      </Stack>
      <Paper sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_e, v: number) => setTab(v)} aria-label="Patient sections">
          <Tab label="Overview" />
          <Tab label="Allergies" />
          <Tab label="Conditions" />
          <Tab label="Contacts" />
          <Tab label="Documents" />
          <Tab label="Consents" />
          <Tab label="Timeline" />
        </Tabs>
      </Paper>
      <TabPanel value={tab} index={0}><OverviewTab patient={patient} /></TabPanel>
      <TabPanel value={tab} index={1}><AllergiesTab patientId={patientId} /></TabPanel>
      <TabPanel value={tab} index={2}><ConditionsTab patientId={patientId} /></TabPanel>
      <TabPanel value={tab} index={3}><ContactsTab patientId={patientId} /></TabPanel>
      <TabPanel value={tab} index={4}><DocumentsTab patientId={patientId} /></TabPanel>
      <TabPanel value={tab} index={5}><ConsentsTab patientId={patientId} /></TabPanel>
      <TabPanel value={tab} index={6}>
        <TimelineTab events={timeline ?? []} loading={timelineLoading} />
      </TabPanel>
    </Box>
  );
}

// ---------- Overview ----------

function OverviewTab({ patient }: { patient: PatientDetail }) {
  const rows: Array<[string, string]> = [
    ['Date of birth', patient.date_of_birth ? formatDate(patient.date_of_birth) : '—'],
    ['Gender', patient.gender ?? '—'],
    ['Blood type', patient.blood_type],
    ['Phone', patient.phone || '—'],
    ['Email', patient.email || '—'],
    ['Address', patient.address || '—'],
    ['City', patient.city || '—'],
    ['Nationality', patient.nationality || '—'],
    ['Marital status', patient.marital_status || '—'],
    ['Occupation', patient.occupation || '—'],
    ['Notes', patient.notes || '—'],
  ];
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={7}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>Profile</Typography>
            <List dense>
              {rows.map(([label, value]) => (
                <ListItem key={label} divider>
                  <ListItemText primary={label} secondary={value} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={5}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>Insurance</Typography>
            {patient.insurance.length === 0 ? (
              <EmptyState title="No insurance on file" hint="Add insurance from the billing module." />
            ) : (
              patient.insurance.map((ins) => (
                <Box key={ins.id} sx={{ mb: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{planName(ins.plan)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Policy {ins.policy_number || '—'} • {ins.coverage_percentage}% coverage
                    {ins.is_primary ? ' • Primary' : ''}
                  </Typography>
                  {ins.valid_until && <Typography variant="caption">Valid until {formatDate(ins.valid_until)}</Typography>}
                </Box>
              ))
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

// ---------- shared CRUD panel helpers ----------

interface CrudRow {
  id: number;
  primary: string;
  secondary?: string;
}

function CrudListCard({
  title,
  rows,
  loading,
  addLabel,
  onAdd,
  onEdit,
  onDelete,
  emptyHint,
}: {
  title: string;
  rows: CrudRow[];
  loading?: boolean;
  addLabel: string;
  onAdd: () => void;
  onEdit?: (row: CrudRow) => void;
  onDelete: (row: CrudRow) => void;
  emptyHint: string;
}) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6">{title}</Typography>
          <Button size="small" variant="contained" onClick={onAdd}>{addLabel}</Button>
        </Stack>
        {loading ? (
          <LoadingOverlay open />
        ) : rows.length === 0 ? (
          <EmptyState title="Nothing here" hint={emptyHint} />
        ) : (
          <List dense>
            {rows.map((r) => (
              <ListItem key={r.id} divider secondaryAction={
                <Stack direction="row" spacing={0.5}>
                  {onEdit && (
                    <IconButton edge="end" aria-label={`Edit ${r.primary}`} onClick={() => onEdit(r)}>
                      <EditIcon />
                    </IconButton>
                  )}
                  <IconButton edge="end" aria-label={`Delete ${r.primary}`} color="error" onClick={() => onDelete(r)}>
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              }>
                <ListItemText primary={r.primary} secondary={r.secondary} />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

function CrudDialog({
  open,
  title,
  onClose,
  onSave,
  saving,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSave} disabled={saving}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

// ---------- Allergies ----------

const allergySchema = z.object({
  allergen: z.string().min(1, 'Allergen is required'),
  severity: z.string().default('MILD'),
  reaction: z.string().optional(),
  notes: z.string().optional(),
});

function AllergiesTab({ patientId }: { patientId: number }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useGetPatientAllergiesQuery(patientId);
  const [createAllergy, { isLoading: saving }] = useCreatePatientAllergyMutation();
  const [updateAllergy] = useUpdatePatientAllergyMutation();
  const [deleteAllergy] = useDeletePatientAllergyMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: number; allergen: string; severity: string; reaction: string; notes: string } | null>(null);
  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(allergySchema),
    defaultValues: { allergen: '', severity: 'MILD', reaction: '', notes: '' },
  });

  const rows: CrudRow[] = useMemo(
    () =>
      (data ?? []).map((a) => ({
        id: a.id,
        primary: a.allergen,
        secondary: `${a.severity}${a.reaction ? ` — ${a.reaction}` : ''}`,
      })),
    [data],
  );

  const openEditor = (r: CrudRow) => {
    const a = (data ?? []).find((x) => x.id === r.id);
    if (!a) return;
    setEditing({ id: a.id, allergen: a.allergen, severity: a.severity, reaction: a.reaction ?? '', notes: a.notes ?? '' });
    reset({ allergen: a.allergen, severity: a.severity, reaction: a.reaction ?? '', notes: a.notes ?? '' });
    setOpen(true);
  };

  const onSave = handleSubmit(async (values) => {
    try {
      if (editing) {
        await updateAllergy({ patientId, id: editing.id, body: values as never }).unwrap();
        enqueueSnackbar('Allergy updated', { variant: 'success' });
      } else {
        await createAllergy({ patientId, body: values as never }).unwrap();
        enqueueSnackbar('Allergy added', { variant: 'success' });
      }
      setOpen(false);
      setEditing(null);
      reset();
    } catch {
      enqueueSnackbar('Failed to save allergy', { variant: 'error' });
    }
  });

  return (
    <>
      <CrudListCard
        title="Allergies"
        rows={rows}
        loading={isLoading}
        addLabel="Add allergy"
        onAdd={() => setOpen(true)}
        onEdit={openEditor}
        onDelete={async (r) => {
          await deleteAllergy({ patientId, id: r.id }).unwrap();
          enqueueSnackbar('Allergy removed', { variant: 'success' });
        }}
        emptyHint="No allergies recorded."
      />
      <CrudDialog open={open} title={editing ? 'Edit allergy' : 'Add allergy'} onClose={() => { setOpen(false); setEditing(null); }} onSave={onSave} saving={saving}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormTextField control={control} name="allergen" label="Allergen" required />
          <FormSelect control={control} name="severity" label="Severity" options={['MILD', 'MODERATE', 'SEVERE'].map((s) => ({ value: s, label: s }))} />
          <FormTextField control={control} name="reaction" label="Reaction" />
          <FormTextField control={control} name="notes" label="Notes" multiline minRows={2} />
        </Stack>
      </CrudDialog>
    </>
  );
}

// ---------- Conditions ----------

const conditionSchema = z.object({
  name: z.string().min(1, 'Condition name is required'),
  icd_code: z.string().optional(),
  diagnosed_date: z.string().nullable().optional(),
  status: z.string().default('ACTIVE'),
  notes: z.string().optional(),
});

function ConditionsTab({ patientId }: { patientId: number }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useGetPatientConditionsQuery(patientId);
  const [createCondition, { isLoading: saving }] = useCreatePatientConditionMutation();
  const [updateCondition] = useUpdatePatientConditionMutation();
  const [deleteCondition] = useDeletePatientConditionMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: number; name: string; icd_code: string; diagnosed_date: string | null; status: string; notes: string } | null>(null);
  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(conditionSchema),
    defaultValues: { name: '', icd_code: '', diagnosed_date: null, status: 'ACTIVE', notes: '' },
  });

  const rows: CrudRow[] = useMemo(
    () =>
      (data ?? []).map((c) => ({
        id: c.id,
        primary: c.name,
        secondary: `${c.icd_code || 'no ICD'} • ${c.status}${c.diagnosed_date ? ` • ${formatDate(c.diagnosed_date)}` : ''}`,
      })),
    [data],
  );

  const openEditor = (r: CrudRow) => {
    const c = (data ?? []).find((x) => x.id === r.id);
    if (!c) return;
    setEditing({ id: c.id, name: c.name, icd_code: c.icd_code ?? '', diagnosed_date: c.diagnosed_date, status: c.status, notes: c.notes ?? '' });
    reset({ name: c.name, icd_code: c.icd_code ?? '', diagnosed_date: c.diagnosed_date, status: c.status, notes: c.notes ?? '' } as never);
    setOpen(true);
  };

  const onSave = handleSubmit(async (values) => {
    const body = { ...values, diagnosed_date: values.diagnosed_date ? dayjs(values.diagnosed_date as string).format('YYYY-MM-DD') : null };
    try {
      if (editing) {
        await updateCondition({ patientId, id: editing.id, body: body as never }).unwrap();
        enqueueSnackbar('Condition updated', { variant: 'success' });
      } else {
        await createCondition({ patientId, body: body as never }).unwrap();
        enqueueSnackbar('Condition added', { variant: 'success' });
      }
      setOpen(false);
      setEditing(null);
      reset();
    } catch {
      enqueueSnackbar('Failed to save condition', { variant: 'error' });
    }
  });

  return (
    <>
      <CrudListCard
        title="Conditions"
        rows={rows}
        loading={isLoading}
        addLabel="Add condition"
        onAdd={() => setOpen(true)}
        onEdit={openEditor}
        onDelete={async (r) => {
          await deleteCondition({ patientId, id: r.id }).unwrap();
          enqueueSnackbar('Condition removed', { variant: 'success' });
        }}
        emptyHint="No conditions recorded."
      />
      <CrudDialog open={open} title={editing ? 'Edit condition' : 'Add condition'} onClose={() => { setOpen(false); setEditing(null); }} onSave={onSave} saving={saving}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormTextField control={control} name="name" label="Condition" required />
          <FormTextField control={control} name="icd_code" label="ICD code" />
          <FormDatePicker control={control} name="diagnosed_date" label="Diagnosed date" />
          <FormSelect control={control} name="status" label="Status" options={['ACTIVE', 'RESOLVED'].map((s) => ({ value: s, label: s }))} />
          <FormTextField control={control} name="notes" label="Notes" multiline minRows={2} />
        </Stack>
      </CrudDialog>
    </>
  );
}

// ---------- Contacts ----------

const contactSchema = z.object({
  name: z.string().min(1, 'Contact name is required'),
  relation: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

function ContactsTab({ patientId }: { patientId: number }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useGetPatientContactsQuery(patientId);
  const [createContact, { isLoading: saving }] = useCreatePatientContactMutation();
  const [updateContact] = useUpdatePatientContactMutation();
  const [deleteContact] = useDeletePatientContactMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: number; name: string; relation: string; phone: string; notes: string } | null>(null);
  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', relation: '', phone: '', notes: '' },
  });

  const rows: CrudRow[] = useMemo(
    () =>
      (data ?? []).map((c) => ({
        id: c.id,
        primary: c.name,
        secondary: `${c.relation || '—'} • ${c.phone || 'no phone'}`,
      })),
    [data],
  );

  const openEditor = (r: CrudRow) => {
    const c = (data ?? []).find((x) => x.id === r.id);
    if (!c) return;
    setEditing({ id: c.id, name: c.name, relation: c.relation ?? '', phone: c.phone ?? '', notes: c.notes ?? '' });
    reset({ name: c.name, relation: c.relation ?? '', phone: c.phone ?? '', notes: c.notes ?? '' });
    setOpen(true);
  };

  const onSave = handleSubmit(async (values) => {
    try {
      if (editing) {
        await updateContact({ patientId, id: editing.id, body: values }).unwrap();
        enqueueSnackbar('Contact updated', { variant: 'success' });
      } else {
        await createContact({ patientId, body: values }).unwrap();
        enqueueSnackbar('Contact added', { variant: 'success' });
      }
      setOpen(false);
      setEditing(null);
      reset();
    } catch {
      enqueueSnackbar('Failed to save contact', { variant: 'error' });
    }
  });

  return (
    <>
      <CrudListCard
        title="Emergency contacts"
        rows={rows}
        loading={isLoading}
        addLabel="Add contact"
        onAdd={() => setOpen(true)}
        onEdit={openEditor}
        onDelete={async (r) => {
          await deleteContact({ patientId, id: r.id }).unwrap();
          enqueueSnackbar('Contact removed', { variant: 'success' });
        }}
        emptyHint="No emergency contacts recorded."
      />
      <CrudDialog open={open} title={editing ? 'Edit contact' : 'Add emergency contact'} onClose={() => { setOpen(false); setEditing(null); }} onSave={onSave} saving={saving}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormTextField control={control} name="name" label="Name" required />
          <FormTextField control={control} name="relation" label="Relation" />
          <FormTextField control={control} name="phone" label="Phone" />
          <FormTextField control={control} name="notes" label="Notes" multiline minRows={2} />
        </Stack>
      </CrudDialog>
    </>
  );
}

// ---------- Documents ----------

const documentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.string().default('OTHER'),
  notes: z.string().optional(),
});

const DOC_CATEGORIES = ['LAB', 'IMAGING', 'PRESCRIPTION', 'ID', 'INSURANCE', 'CONSENT', 'OTHER'];

function DocumentsTab({ patientId }: { patientId: number }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useGetPatientDocumentsQuery(patientId);
  const [uploadDocument, { isLoading: saving }] = useUploadPatientDocumentMutation();
  const [deleteDocument] = useDeletePatientDocumentMutation();
  const [file, setFile] = useState<File | null>(null);
  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(documentSchema),
    defaultValues: { title: '', category: 'OTHER', notes: '' },
  });

  const onSave = handleSubmit(async (values) => {
    if (!file) {
      enqueueSnackbar('Choose a file to upload', { variant: 'warning' });
      return;
    }
    const fd = new FormData();
    fd.append('title', values.title);
    fd.append('category', values.category);
    if (values.notes) fd.append('notes', values.notes);
    fd.append('file', file);
    try {
      await uploadDocument({ patientId, formData: fd }).unwrap();
      enqueueSnackbar('Document uploaded', { variant: 'success' });
      setFile(null);
      reset();
    } catch {
      enqueueSnackbar('Upload failed', { variant: 'error' });
    }
  });

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={5}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>Upload document</Typography>
            <Stack spacing={2}>
              <FormTextField control={control} name="title" label="Title" required />
              <FormSelect control={control} name="category" label="Category" options={DOC_CATEGORIES.map((c) => ({ value: c, label: c }))} />
              <FormTextField control={control} name="notes" label="Notes" multiline minRows={2} />
              <Button component="label" variant="outlined" startIcon={<UploadIcon />}>
                {file ? file.name : 'Choose file'}
                <input type="file" hidden accept="*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </Button>
              <Button variant="contained" onClick={onSave} disabled={saving}>Upload</Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={7}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>Documents ({data?.length ?? 0})</Typography>
            {isLoading ? (
              <LoadingOverlay open />
            ) : (data?.length ?? 0) === 0 ? (
              <EmptyState title="No documents" hint="Uploaded files will appear here." />
            ) : (
              <List dense>
                {(data ?? []).map((d) => (
                  <ListItem
                    key={d.id}
                    divider
                    secondaryAction={
                      <Stack direction="row" spacing={1}>
                        <IconButton component="a" href={d.file} target="_blank" rel="noreferrer" aria-label={`Download ${d.title}`}>
                          <DownloadIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          aria-label={`Delete ${d.title}`}
                          color="error"
                          onClick={async () => {
                            await deleteDocument({ patientId, id: d.id }).unwrap();
                            enqueueSnackbar('Document deleted', { variant: 'success' });
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    }
                  >
                    <ListItemText primary={d.title} secondary={`${d.category} • ${formatDate(d.created_at)}`} />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

// ---------- Consents ----------

const consentSchema = z.object({
  type: z.string().default('TREATMENT'),
  description: z.string().min(1, 'Description is required'),
  signed_by: z.string().optional(),
  signed_at: z.string().nullable().optional(),
  status: z.string().default('SIGNED'),
});

const CONSENT_TYPES = ['TREATMENT', 'SURGERY', 'RESEARCH', 'PRIVACY', 'OTHER'];

function ConsentsTab({ patientId }: { patientId: number }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading } = useGetPatientConsentsQuery(patientId);
  const [createConsent, { isLoading: saving }] = useCreatePatientConsentMutation();
  const [updateConsent] = useUpdatePatientConsentMutation();
  const [deleteConsent] = useDeletePatientConsentMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: number; type: string; description: string; signed_by: string; status: string } | null>(null);
  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(consentSchema),
    defaultValues: { type: 'TREATMENT', description: '', signed_by: '', signed_at: null, status: 'SIGNED' },
  });

  const rows: CrudRow[] = useMemo(
    () =>
      (data ?? []).map((c) => ({
        id: c.id,
        primary: `${c.type} — ${c.description}`,
        secondary: `${c.status}${c.signed_by ? ` • signed by ${c.signed_by}` : ''}${c.signed_at ? ` • ${formatDate(c.signed_at)}` : ''}`,
      })),
    [data],
  );

  const onSave = handleSubmit(async (values) => {
    const body = { ...values, signed_at: values.signed_at ? dayjs(values.signed_at as string).format('YYYY-MM-DD') : null };
    try {
      if (editing) {
        await updateConsent({ patientId, id: editing.id, body: body as never }).unwrap();
        enqueueSnackbar('Consent updated', { variant: 'success' });
      } else {
        await createConsent({ patientId, body: body as never }).unwrap();
        enqueueSnackbar('Consent recorded', { variant: 'success' });
      }
      setOpen(false);
      setEditing(null);
      reset();
    } catch {
      enqueueSnackbar('Failed to save consent', { variant: 'error' });
    }
  });

  const openEditor = (r: CrudRow) => {
    const c = (data ?? []).find((x) => x.id === r.id);
    if (!c) return;
    setEditing({ id: c.id, type: c.type, description: c.description, signed_by: c.signed_by ?? '', status: c.status });
    reset({ type: c.type, description: c.description, signed_by: c.signed_by ?? '', signed_at: c.signed_at, status: c.status } as never);
    setOpen(true);
  };

  return (
    <>
      <CrudListCard
        title="Consents"
        rows={rows}
        loading={isLoading}
        addLabel="Record consent"
        onAdd={() => setOpen(true)}
        onEdit={openEditor}
        onDelete={async (r) => {
          await deleteConsent({ patientId, id: r.id }).unwrap();
          enqueueSnackbar('Consent removed', { variant: 'success' });
        }}
        emptyHint="No consents recorded."
      />
      <CrudDialog open={open} title={editing ? 'Edit consent' : 'Record consent'} onClose={() => { setOpen(false); setEditing(null); }} onSave={onSave} saving={saving}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormSelect control={control} name="type" label="Type" options={CONSENT_TYPES.map((t) => ({ value: t, label: t }))} />
          <FormTextField control={control} name="description" label="Description" required multiline minRows={2} />
          <FormTextField control={control} name="signed_by" label="Signed by" />
          <FormDatePicker control={control} name="signed_at" label="Signed date" />
          <FormSelect control={control} name="status" label="Status" options={['SIGNED', 'PENDING', 'REVOKED'].map((s) => ({ value: s, label: s }))} />
        </Stack>
      </CrudDialog>
    </>
  );
}

// ---------- Timeline ----------

function TimelineTab({ events, loading }: { events: TimelineEvent[]; loading?: boolean }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon /> Patient timeline
        </Typography>
        {loading ? (
          <LoadingOverlay open />
        ) : events.length === 0 ? (
          <EmptyState title="No events yet" hint="Encounters, admissions, results and documents will appear here in chronological order." />
        ) : (
          <List dense>
            {events.map((ev, i) => (
              <ListItem key={`${ev.type}-${ev.ref_id}-${i}`} divider alignItems="flex-start">
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{ev.title}</Typography>
                      <StatusChip status={ev.type} />
                    </Stack>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">{ev.description}</Typography>
                      <Typography variant="caption" color="text.secondary">{formatDate(ev.date)}</Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

export { TimelineTab };
