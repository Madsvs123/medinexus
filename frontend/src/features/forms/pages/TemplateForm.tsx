import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/ui';
import {
  useGetFormTemplateQuery,
  useCreateFormTemplateMutation,
  useUpdateFormTemplateMutation,
} from '../api';
import type { FieldType, FormFieldDef } from '../types';

const FIELD_TYPES: FieldType[] = ['text', 'textarea', 'number', 'date', 'select', 'multiselect', 'checkbox'];

const fieldSchema = z
  .object({
    key: z.string().min(1, 'Key is required').regex(/^[a-zA-Z0-9_]+$/, 'Use letters, numbers, underscore'),
    label: z.string().min(1, 'Label is required'),
    type: z.enum(['text', 'textarea', 'number', 'date', 'select', 'multiselect', 'checkbox']),
    required: z.boolean(),
    options: z.string().optional(),
    placeholder: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if ((val.type === 'select' || val.type === 'multiselect') && !val.options?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'Comma-separated options are required for select/multiselect' });
    }
  });

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  active: z.boolean(),
  fields: z.array(fieldSchema).min(1, 'Add at least one field'),
});

type FieldFormValues = {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: string;
  placeholder: string;
};

type FormValues = {
  name: string;
  category: string;
  active: boolean;
  fields: FieldFormValues[];
};

function getErr(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = (e as { data?: unknown }).data as Record<string, unknown> | undefined;
    if (data?.detail) return String(data.detail);
    const first = Object.values(data ?? {}).find((v) => v !== undefined && v !== null);
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return 'Failed to save template.';
}

export default function TemplateForm() {
  const { id } = useParams();
  const templateId = id ? Number(id) : null;
  const isEdit = templateId !== null;
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const { data: template, isLoading: templateLoading } = useGetFormTemplateQuery(templateId ?? 0, { skip: !isEdit });
  const [createTemplate] = useCreateFormTemplateMutation();
  const [updateTemplate] = useUpdateFormTemplateMutation();

  const { control, handleSubmit, reset, watch, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', category: '', active: true, fields: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'fields' });
  const watchedFields = watch('fields');

  useEffect(() => {
    if (!template) return;
    reset({
      name: template.name,
      category: template.category,
      active: template.active,
      fields: (template.schema ?? []).map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type,
        required: !!f.required,
        options: f.options?.join(', ') ?? '',
        placeholder: f.placeholder ?? '',
      })),
    });
  }, [template, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      category: values.category,
      active: values.active,
      schema: values.fields.map((f): FormFieldDef => ({
        key: f.key,
        label: f.label,
        type: f.type,
        required: f.required,
        placeholder: f.placeholder || undefined,
        options: f.type === 'select' || f.type === 'multiselect'
          ? f.options.split(',').map((o) => o.trim()).filter(Boolean)
          : undefined,
      })),
    };
    try {
      if (isEdit && templateId) {
        await updateTemplate({ id: templateId, body: payload }).unwrap();
        enqueueSnackbar('Template updated', { variant: 'success' });
      } else {
        await createTemplate(payload).unwrap();
        enqueueSnackbar('Template created', { variant: 'success' });
      }
      navigate('/forms/templates');
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const fieldErrors = useMemo(() => {
    const e = formState.errors.fields as unknown as
      | Array<{ key?: { message?: string }; label?: { message?: string }; options?: { message?: string } }>
      | { root?: { message?: string } }
      | undefined;
    return Array.isArray(e) ? e : [];
  }, [formState.errors.fields]);

  if (isEdit && templateLoading) return <LinearProgress />;

  return (
    <Box>
      <PageHeader
        title={isEdit ? `Edit template: ${template?.name ?? ''}` : 'New form template'}
        subtitle="Define fields for your form"
        actions={
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/forms/templates')}>
            Back
          </Button>
        }
      />
      <Paper variant="outlined" sx={{ p: 3 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={5}>
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField label="Template name *" fullWidth size="small" {...field} error={!!fieldState.error} helperText={fieldState.error?.message} />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={5}>
              <Controller
                name="category"
                control={control}
                render={({ field, fieldState }) => (
                  <TextField label="Category *" fullWidth size="small" {...field} error={!!fieldState.error} helperText={fieldState.error?.message} />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Controller
                name="active"
                control={control}
                render={({ field }) => (
                  <FormControlLabel control={<Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />} label="Active" />
                )}
              />
            </Grid>
          </Grid>

          <Typography variant="h6" gutterBottom>Fields</Typography>
          {fields.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No fields yet — add your first form field below.
            </Typography>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
            {fields.map((f, i) => (
              <Paper key={f.id} variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">Field {i + 1}</Typography>
                  <IconButton aria-label="Remove field" size="small" color="error" onClick={() => remove(i)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Controller
                      name={`fields.${i}.key`}
                      control={control}
                      render={({ field: fld, fieldState }) => (
                        <TextField
                          label="Key *"
                          size="small"
                          fullWidth
                          {...fld}
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message ?? 'Unique identifier'}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Controller
                      name={`fields.${i}.label`}
                      control={control}
                      render={({ field: fld, fieldState }) => (
                        <TextField label="Label *" size="small" fullWidth {...fld} error={!!fieldState.error} helperText={fieldState.error?.message} />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Controller
                      name={`fields.${i}.type`}
                      control={control}
                      render={({ field: fld }) => (
                        <TextField select label="Type" size="small" fullWidth value={fld.value} onChange={(e) => fld.onChange(e.target.value)}>
                          {FIELD_TYPES.map((t) => (
                            <MenuItem key={t} value={t}>{t}</MenuItem>
                          ))}
                        </TextField>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <Controller
                      name={`fields.${i}.options`}
                      control={control}
                      render={({ field: fld, fieldState }) => {
                        const type = watchedFields?.[i]?.type;
                        return (
                          <TextField
                            label={type === 'select' || type === 'multiselect' ? 'Options (comma separated) *' : 'Options'}
                            size="small"
                            fullWidth
                            {...fld}
                            disabled={type !== 'select' && type !== 'multiselect'}
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                          />
                        );
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Controller
                      name={`fields.${i}.placeholder`}
                      control={control}
                      render={({ field: fld }) => <TextField label="Placeholder" size="small" fullWidth {...fld} />}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Controller
                      name={`fields.${i}.required`}
                      control={control}
                      render={({ field: fld }) => (
                        <FormControlLabel
                          control={<Checkbox checked={fld.value} onChange={(e) => fld.onChange(e.target.checked)} />}
                          label="Required"
                        />
                      )}
                    />
                  </Grid>
                </Grid>
                {fieldErrors[i]?.key?.message && <Chip label={fieldErrors[i]?.key?.message} color="error" size="small" sx={{ mt: 1 }} />}
              </Paper>
            ))}
          </Box>

          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => append({ key: '', label: '', type: 'text', required: false, options: '', placeholder: '' })}
          >
            Add field
          </Button>

          {typeof formState.errors.fields === 'object' && !Array.isArray(formState.errors.fields) && (
            <Chip label={(formState.errors.fields as { root?: { message?: string } }).root?.message ?? 'Invalid fields'} color="error" sx={{ mt: 2 }} />
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
            <Button onClick={() => navigate('/forms/templates')}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={formState.isSubmitting}>
              {isEdit ? 'Save changes' : 'Create template'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
