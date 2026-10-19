import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useSnackbar } from 'notistack';
import { useUploadDocumentMutation, useLazySearchDocumentPatientsQuery } from '../api';
import { patientLabel, type DocumentCategory } from '../types';

const CATEGORIES: DocumentCategory[] = ['CLINICAL', 'ADMIN', 'FINANCIAL', 'LEGAL', 'OTHER'];

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.string().min(1),
  patient: z.custom<{ id: number; label: string } | null>((v) => v === null || (typeof v === 'object' && 'id' in v)).optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function getErr(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = (e as { data?: unknown }).data as Record<string, unknown> | undefined;
    if (data?.detail) return String(data.detail);
    const first = Object.values(data ?? {}).find((v) => v !== undefined && v !== null);
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return 'Upload failed.';
}

export default function UploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [upload] = useUploadDocumentMutation();
  const [trigger, { data: patientsData, isFetching: patientsLoading }] = useLazySearchDocumentPatientsQuery();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { control, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', category: 'CLINICAL', patient: null, notes: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ title: '', category: 'CLINICAL', patient: null, notes: '' });
      setFile(null);
    }
  }, [open, reset]);

  const patientOptions = (patientsData?.results ?? []).map((p) => ({ id: p.id, label: patientLabel(p) }));

  const onSubmit = async (values: FormValues) => {
    if (!file) {
      enqueueSnackbar('Choose a file first', { variant: 'warning' });
      return;
    }
    try {
      await upload({
        file,
        title: values.title,
        category: values.category,
        patient: values.patient?.id ?? null,
        notes: values.notes || undefined,
      }).unwrap();
      enqueueSnackbar('Document uploaded', { variant: 'success' });
      onClose();
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const acceptFile = (f: File | undefined) => {
    if (f) setFile(f);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Upload document</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Box
            sx={{
              border: '2px dashed',
              borderColor: dragOver ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              bgcolor: dragOver ? 'action.hover' : 'background.paper',
              cursor: 'pointer',
              mb: 2,
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              acceptFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
            }}
            aria-label="Upload file drop zone"
          >
            <input ref={inputRef} type="file" hidden onChange={(e) => acceptFile(e.target.files?.[0] ?? undefined)} />
            <CloudUploadIcon color="primary" sx={{ fontSize: 40 }} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              {file ? `📄 ${file.name}` : 'Drag & drop a file here, or click to browse'}
            </Typography>
            {file && (
              <Chip label={`${(file.size / 1024).toFixed(1)} KB`} size="small" sx={{ mt: 1 }} onDelete={() => setFile(null)} />
            )}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Controller
              name="title"
              control={control}
              render={({ field, fieldState }) => (
                <TextField label="Title *" fullWidth size="small" {...field} error={!!fieldState.error} helperText={fieldState.error?.message} />
              )}
            />
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <TextField select label="Category" fullWidth size="small" value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="patient"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  size="small"
                  options={patientOptions}
                  loading={patientsLoading}
                  getOptionLabel={(o) => o.label}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  value={field.value ?? null}
                  onChange={(_e, v) => field.onChange(v)}
                  onInputChange={(_e, v) => void trigger({ search: v || undefined, page_size: 10 })}
                  renderInput={(params) => <TextField {...params} label="Patient (optional)" size="small" />}
                />
              )}
            />
            <Controller
              name="notes"
              control={control}
              render={({ field }) => <TextField label="Notes" fullWidth size="small" multiline minRows={2} {...field} />}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={formState.isSubmitting || !file}>
            Upload
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
