import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  Grid,
  LinearProgress,
  TextField,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/ui';
import {
  useGetOrganizationQuery,
  useUpdateOrganizationMutation,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} from '../api';

const orgSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  primary_color: z.string().min(1, 'Primary color is required'),
  report_footer: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  timezone: z.string().optional(),
});
type OrgFormValues = z.infer<typeof orgSchema>;

const jsonObject = (label: string) =>
  z.string().refine(
    (v) => {
      if (!v.trim()) return true;
      try {
        const parsed = JSON.parse(v);
        return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
      } catch {
        return false;
      }
    },
    { message: `${label} must be a valid JSON object` },
  );

const settingsSchema = z.object({
  appointment_window_days: z.coerce.number().min(1, 'Must be ≥ 1'),
  slot_minutes: z.coerce.number().min(5, 'Must be ≥ 5'),
  block_severe_prescriptions: z.boolean(),
  auto_issue_invoice_on_checkout: z.boolean(),
  currency: z.string().min(1, 'Currency is required'),
  date_format: z.string().min(1, 'Date format is required'),
  notification_prefs: jsonObject('Notification prefs'),
  clinical_defaults: jsonObject('Clinical defaults'),
  billing_defaults: jsonObject('Billing defaults'),
});
type SettingsFormValues = z.infer<typeof settingsSchema>;

function getErr(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = (e as { data?: unknown }).data as Record<string, unknown> | undefined;
    if (data?.detail) return String(data.detail);
    const first = Object.values(data ?? {}).find((v) => v !== undefined && v !== null);
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return 'Failed to save settings.';
}

export default function SettingsForm() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: org, isLoading: orgLoading, error: orgError } = useGetOrganizationQuery();
  const { data: settings, isLoading: settingsLoading, error: settingsError } = useGetSettingsQuery();
  const [updateOrg] = useUpdateOrganizationMutation();
  const [updateSettings] = useUpdateSettingsMutation();
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const orgForm = useForm<OrgFormValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: '',
      code: '',
      primary_color: '#0B6E4F',
      report_footer: '',
      address: '',
      phone: '',
      email: '',
      timezone: 'UTC',
    },
  });

  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      appointment_window_days: 90,
      slot_minutes: 15,
      block_severe_prescriptions: false,
      auto_issue_invoice_on_checkout: false,
      currency: 'USD',
      date_format: 'YYYY-MM-DD',
      notification_prefs: '{}',
      clinical_defaults: '{}',
      billing_defaults: '{}',
    },
  });

  useEffect(() => {
    if (!org) return;
    orgForm.reset({
      name: org.name ?? '',
      code: org.code ?? '',
      primary_color: org.primary_color ?? '#0B6E4F',
      report_footer: org.report_footer ?? '',
      address: org.address ?? '',
      phone: org.phone ?? '',
      email: org.email ?? '',
      timezone: org.timezone ?? 'UTC',
    });
  }, [org, orgForm]);

  useEffect(() => {
    if (!settings) return;
    settingsForm.reset({
      appointment_window_days: settings.appointment_window_days,
      slot_minutes: settings.slot_minutes,
      block_severe_prescriptions: settings.block_severe_prescriptions,
      auto_issue_invoice_on_checkout: settings.auto_issue_invoice_on_checkout,
      currency: settings.currency,
      date_format: settings.date_format,
      notification_prefs: JSON.stringify(settings.notification_prefs ?? {}, null, 2),
      clinical_defaults: JSON.stringify(settings.clinical_defaults ?? {}, null, 2),
      billing_defaults: JSON.stringify(settings.billing_defaults ?? {}, null, 2),
    });
  }, [settings, settingsForm]);

  const saveOrg = async (values: OrgFormValues) => {
    try {
      await updateOrg({ body: { ...values, ...(logoFile ? { logo: logoFile } : {}) } }).unwrap();
      setLogoFile(null);
      enqueueSnackbar('Organization settings saved', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const saveSettings = async (values: SettingsFormValues) => {
    try {
      await updateSettings({
        appointment_window_days: values.appointment_window_days,
        slot_minutes: values.slot_minutes,
        block_severe_prescriptions: values.block_severe_prescriptions,
        auto_issue_invoice_on_checkout: values.auto_issue_invoice_on_checkout,
        currency: values.currency,
        date_format: values.date_format,
        notification_prefs: parseJson(values.notification_prefs),
        clinical_defaults: parseJson(values.clinical_defaults),
        billing_defaults: parseJson(values.billing_defaults),
      }).unwrap();
      enqueueSnackbar('Module settings saved', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const loading = orgLoading || settingsLoading;

  return (
    <Box>
      <PageHeader title="Configuration" subtitle="Organization and module settings" />
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {(orgError || settingsError) && (
        <Alert severity="error" role="alert" sx={{ mb: 2 }}>
          Failed to load configuration.
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} lg={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>Branding & organization</Typography>
              <form onSubmit={orgForm.handleSubmit(saveOrg)} noValidate>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Controller
                    name="name"
                    control={orgForm.control}
                    render={({ field, fieldState }) => (
                      <TextField label="Organization name *" fullWidth size="small" {...field} error={!!fieldState.error} helperText={fieldState.error?.message} />
                    )}
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Controller
                        name="code"
                        control={orgForm.control}
                        render={({ field, fieldState }) => (
                          <TextField label="Code *" fullWidth size="small" {...field} error={!!fieldState.error} helperText={fieldState.error?.message} />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Controller
                        name="primary_color"
                        control={orgForm.control}
                        render={({ field }) => (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <input
                              type="color"
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                              style={{ width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer' }}
                              aria-label="Primary color"
                            />
                            <TextField label="Primary color" fullWidth size="small" value={field.value} onChange={(e) => field.onChange(e.target.value)} />
                          </Box>
                        )}
                      />
                    </Grid>
                  </Grid>
                  <Box>
                    <input
                      accept="image/*"
                      type="file"
                      id="logo-upload"
                      style={{ display: 'none' }}
                      onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                    />
                    <label htmlFor="logo-upload">
                      <Button component="span" variant="outlined" startIcon={<UploadFileIcon />}>
                        {logoFile ? logoFile.name : 'Upload logo'}
                      </Button>
                    </label>
                    {org?.logo && !logoFile && (
                      <Chip label="Current logo on file" size="small" sx={{ ml: 1 }} />
                    )}
                  </Box>
                  <Controller
                    name="report_footer"
                    control={orgForm.control}
                    render={({ field }) => (
                      <TextField label="Report footer" fullWidth size="small" multiline minRows={2} {...field} />
                    )}
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Controller
                        name="timezone"
                        control={orgForm.control}
                        render={({ field }) => <TextField label="Timezone" fullWidth size="small" {...field} />}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Controller
                        name="phone"
                        control={orgForm.control}
                        render={({ field }) => <TextField label="Phone" fullWidth size="small" {...field} />}
                      />
                    </Grid>
                  </Grid>
                  <Controller
                    name="email"
                    control={orgForm.control}
                    render={({ field, fieldState }) => (
                      <TextField label="Email" fullWidth size="small" {...field} error={!!fieldState.error} helperText={fieldState.error?.message} />
                    )}
                  />
                  <Controller
                    name="address"
                    control={orgForm.control}
                    render={({ field }) => <TextField label="Address" fullWidth size="small" {...field} />}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={orgForm.formState.isSubmitting}>
                      Save organization
                    </Button>
                  </Box>
                </Box>
              </form>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>Module defaults</Typography>
              <form onSubmit={settingsForm.handleSubmit(saveSettings)} noValidate>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Controller
                        name="appointment_window_days"
                        control={settingsForm.control}
                        render={({ field, fieldState }) => (
                          <TextField
                            label="Appointment window (days)"
                            type="number"
                            fullWidth
                            size="small"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                          />
                        )}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Controller
                        name="slot_minutes"
                        control={settingsForm.control}
                        render={({ field, fieldState }) => (
                          <TextField
                            label="Default slot (minutes)"
                            type="number"
                            fullWidth
                            size="small"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                          />
                        )}
                      />
                    </Grid>
                  </Grid>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Controller
                        name="currency"
                        control={settingsForm.control}
                        render={({ field }) => <TextField label="Currency" fullWidth size="small" {...field} />}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Controller
                        name="date_format"
                        control={settingsForm.control}
                        render={({ field }) => <TextField label="Date format" fullWidth size="small" {...field} />}
                      />
                    </Grid>
                  </Grid>
                  <Controller
                    name="block_severe_prescriptions"
                    control={settingsForm.control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                        label="Block severe prescriptions without override"
                      />
                    )}
                  />
                  <Controller
                    name="auto_issue_invoice_on_checkout"
                    control={settingsForm.control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                        label="Auto-issue invoice on checkout"
                      />
                    )}
                  />
                  <Controller
                    name="notification_prefs"
                    control={settingsForm.control}
                    render={({ field, fieldState }) => (
                      <TextField
                        label="Notification prefs (JSON)"
                        fullWidth
                        size="small"
                        multiline
                        minRows={3}
                        {...field}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                  <Controller
                    name="clinical_defaults"
                    control={settingsForm.control}
                    render={({ field, fieldState }) => (
                      <TextField
                        label="Clinical defaults (JSON)"
                        fullWidth
                        size="small"
                        multiline
                        minRows={3}
                        {...field}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                  <Controller
                    name="billing_defaults"
                    control={settingsForm.control}
                    render={({ field, fieldState }) => (
                      <TextField
                        label="Billing defaults (JSON)"
                        fullWidth
                        size="small"
                        multiline
                        minRows={3}
                        {...field}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={settingsForm.formState.isSubmitting}>
                      Save settings
                    </Button>
                  </Box>
                </Box>
              </form>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function parseJson(v: string): Record<string, unknown> {
  if (!v.trim()) return {};
  try {
    return JSON.parse(v) as Record<string, unknown>;
  } catch {
    return {};
  }
}
