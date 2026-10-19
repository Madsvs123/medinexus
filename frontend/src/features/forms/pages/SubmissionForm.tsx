import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Controller, useForm, type Control } from 'react-hook-form';
import { z, type ZodTypeAny } from 'zod';
import { useSnackbar } from 'notistack';
import { PageHeader, EmptyState } from '../../../components/ui';
import {
  useGetFormTemplatesQuery,
  useCreateFormSubmissionMutation,
  useSubmitFormSubmissionMutation,
  useLazySearchFormPatientsQuery,
} from '../api';
import { patientLabel, type FormFieldDef, type FormTemplate } from '../types';

function getErr(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = (e as { data?: unknown }).data as Record<string, unknown> | undefined;
    if (data?.detail) return String(data.detail);
    const first = Object.values(data ?? {}).find((v) => v !== undefined && v !== null);
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return 'Failed to save submission.';
}

function buildSchema(fields: FormFieldDef[]): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};
  for (const f of fields) {
    let s: ZodTypeAny;
    switch (f.type) {
      case 'number':
        s = z.coerce.number({ invalid_type_error: `${f.label} is required` });
        break;
      case 'checkbox':
        s = z.boolean();
        break;
      case 'multiselect':
        s = z.array(z.string());
        break;
      default:
        s = z.string();
    }
    if (f.required) {
      if (f.type === 'number') {
        s = s.refine((v) => !Number.isNaN(Number(v)), `${f.label} is required`);
      } else if (f.type === 'checkbox') {
        s = z.boolean().refine((v) => v === true, `${f.label} must be checked`);
      } else if (f.type === 'multiselect') {
        s = z.array(z.string()).min(1, `${f.label} is required`);
      } else {
        s = (s as z.ZodString).min(1, `${f.label} is required`);
      }
    } else {
      s = s.optional();
    }
    shape[f.key] = s;
  }
  return z.object(shape);
}

export default function SubmissionForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const { data: templatesData, isLoading: templatesLoading } = useGetFormTemplatesQuery({ page_size: 200 });
  const templates = useMemo(() => templatesData?.results ?? [], [templatesData]);

  const initialTemplateId = searchParams.get('template') ? Number(searchParams.get('template')) : 0;
  const [templateId, setTemplateId] = useState<number>(initialTemplateId);
  const template = useMemo(() => templates.find((t) => t.id === templateId) ?? null, [templates, templateId]);

  const { control, getValues, setError, reset, formState } = useForm<Record<string, unknown>>({
    defaultValues: {},
  });

  const [patient, setPatient] = useState<{ id: number; label: string } | null>(null);
  const [trigger, { data: patientsData, isFetching: patientsLoading }] = useLazySearchFormPatientsQuery();

  useEffect(() => {
    if (!template) return;
    const defaults: Record<string, unknown> = {};
    for (const f of template.schema) {
      defaults[f.key] = f.type === 'checkbox' ? false : f.type === 'multiselect' ? [] : '';
    }
    reset(defaults);
  }, [template, reset]);

  const [createSubmission] = useCreateFormSubmissionMutation();
  const [submitSubmission] = useSubmitFormSubmissionMutation();

  const doSubmit = async (values: Record<string, unknown>, asDraft: boolean) => {
    if (!template) return;
    const data: Record<string, unknown> = {};
    for (const f of template.schema) {
      const v = values[f.key];
      if (f.type === 'number') {
        data[f.key] = v === '' || v == null ? null : Number(v);
      } else if (v === '' || v == null) {
        data[f.key] = null;
      } else {
        data[f.key] = v;
      }
    }
    try {
      const sub = await createSubmission({
        template: template.id,
        patient: patient?.id ?? null,
        data,
      }).unwrap();
      if (!asDraft) await submitSubmission(sub.id).unwrap();
      enqueueSnackbar(asDraft ? 'Draft saved' : 'Submission submitted', { variant: 'success' });
      navigate('/forms/submissions');
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const validateAndSubmit = async (asDraft: boolean) => {
    if (!template) {
      enqueueSnackbar('Select a template first', { variant: 'warning' });
      return;
    }
    const values = getValues();
    const result = buildSchema(template.schema).safeParse(values);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      for (const [key, msgs] of Object.entries(flat)) {
        setError(key, { type: 'validation', message: msgs?.[0] });
      }
      enqueueSnackbar('Please fix the highlighted fields', { variant: 'error' });
      return;
    }
    await doSubmit(result.data, asDraft);
  };

  return (
    <Box>
      <PageHeader
        title="New submission"
        subtitle="Fill out a form template"
        actions={
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/forms/submissions')}>
            Back
          </Button>
        }
      />
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 720 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {templatesLoading ? (
            <LinearProgress />
          ) : (
            <TextField
              select
              label="Template *"
              fullWidth
              size="small"
              value={templateId}
              onChange={(e) => setTemplateId(Number(e.target.value))}
            >
              <MenuItem value={0}>Select a template</MenuItem>
              {templates.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name} ({t.category})</MenuItem>
              ))}
            </TextField>
          )}

          <Autocomplete
            size="small"
            options={(patientsData?.results ?? []).map((p) => ({ id: p.id, label: patientLabel(p) }))}
            loading={patientsLoading}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={patient}
            onChange={(_e, v) => setPatient(v)}
            onInputChange={(_e, v) => void trigger({ search: v || undefined, page_size: 10 })}
            renderInput={(params) => <TextField {...params} label="Patient (optional)" size="small" />}
          />

          {!template ? (
            <EmptyState title="Choose a template" hint="Pick a template above to start filling it out." />
          ) : (
            <Box>
              <Typography variant="h6" gutterBottom>{template.name}</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {template.schema.map((f) => (
                  <DynamicField key={f.key} field={f} control={control} />
                ))}
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
                <Button variant="outlined" disabled={formState.isSubmitting} onClick={() => void validateAndSubmit(true)}>
                  Save draft
                </Button>
                <Button variant="contained" disabled={formState.isSubmitting} onClick={() => void validateAndSubmit(false)}>
                  Submit form
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

function DynamicField({ field, control }: { field: FormFieldDef; control: Control<Record<string, unknown>> }) {
  if (field.type === 'checkbox') {
    return (
      <Controller
        name={field.key}
        control={control}
        render={({ field: f, fieldState }) => (
          <Box>
            <FormControlLabel
              control={<Checkbox checked={!!f.value} onChange={(e) => f.onChange(e.target.checked)} />}
              label={<Typography variant="body2">{field.label}{field.required ? ' *' : ''}</Typography>}
            />
            {fieldState.error && <Typography variant="caption" color="error" display="block">{fieldState.error.message}</Typography>}
          </Box>
        )}
      />
    );
  }

  if (field.type === 'select' || field.type === 'multiselect') {
    return (
      <Controller
        name={field.key}
        control={control}
        render={({ field: f, fieldState }) => (
          <FormControl fullWidth size="small" error={!!fieldState.error}>
            <InputLabel>{field.label}{field.required ? ' *' : ''}</InputLabel>
            <Select
              label={`${field.label}${field.required ? ' *' : ''}`}
              multiple={field.type === 'multiselect'}
              value={field.type === 'multiselect' ? (f.value ?? []) : (f.value ?? '')}
              onChange={(e) => f.onChange(e.target.value)}
            >
              {(field.options ?? []).map((o) => (
                <MenuItem key={o} value={o}>{o}</MenuItem>
              ))}
            </Select>
            {fieldState.error && <Typography variant="caption" color="error">{fieldState.error.message}</Typography>}
          </FormControl>
        )}
      />
    );
  }

  if (field.type === 'date') {
    return (
      <Controller
        name={field.key}
        control={control}
        render={({ field: f, fieldState }) => (
          <DatePicker
            label={`${field.label}${field.required ? ' *' : ''}`}
            slotProps={{ textField: { size: 'small', fullWidth: true, error: !!fieldState.error, helperText: fieldState.error?.message } }}
            value={f.value ? dayjs(String(f.value)) : null}
            onChange={(d) => f.onChange(d ? d.format('YYYY-MM-DD') : '')}
          />
        )}
      />
    );
  }

  return (
    <Controller
      name={field.key}
      control={control}
      render={({ field: f, fieldState }) => (
        <TextField
          label={`${field.label}${field.required ? ' *' : ''}`}
          fullWidth
          size="small"
          type={field.type === 'number' ? 'number' : 'text'}
          multiline={field.type === 'textarea'}
          minRows={field.type === 'textarea' ? 3 : undefined}
          placeholder={field.placeholder}
          value={f.value ?? ''}
          onChange={(e) => f.onChange(e.target.value)}
          error={!!fieldState.error}
          helperText={fieldState.error?.message}
        />
      )}
    />
  );
}

export type { FormTemplate };
