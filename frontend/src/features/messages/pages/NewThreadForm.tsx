import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  LinearProgress,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/ui';
import { useCreateThreadMutation, useLazySearchStaffUsersQuery } from '../api';
import { userName, type UserRef } from '../types';

function useDebouncedValue<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const ROLES = ['ADMIN', 'DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGIST', 'RECEPTIONIST', 'BILLING'];

const schema = z.object({
  title: z.string().optional(),
  role: z.string(),
  participants: z.array(z.number()).min(1, 'Select at least one participant'),
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
  return 'Failed to create thread.';
}

export default function NewThreadForm() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [createThread] = useCreateThreadMutation();
  const [trigger, { data, isFetching }] = useLazySearchStaffUsersQuery();

  const { control, handleSubmit, watch, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', role: 'DOCTOR', participants: [] },
  });

  const role = watch('role');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    void trigger({ role, search: debouncedSearch || undefined, page_size: 20 });
  }, [role, debouncedSearch, trigger]);

  const options = useMemo(() => (data?.results ?? []).map((u) => ({ id: u.id, label: userName(u) })), [data]);

  const onSubmit = async (values: FormValues) => {
    try {
      const thread = await createThread({
        title: values.title || undefined,
        participants: values.participants,
      }).unwrap();
      enqueueSnackbar('Thread created', { variant: 'success' });
      navigate(`/messages/threads/${thread.id}`);
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader
        title="New message"
        subtitle="Start a conversation"
        actions={
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/messages')}>
            Back
          </Button>
        }
      />
      <Paper variant="outlined" sx={{ p: 3, maxWidth: 640 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Controller
              name="title"
              control={control}
              render={({ field }) => <TextField label="Subject (optional)" fullWidth size="small" {...field} />}
            />
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <TextField select label="Filter by role" fullWidth size="small" value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                  {ROLES.map((r) => (
                    <MenuItem key={r} value={r}>{r.replace(/_/g, ' ')}</MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="participants"
              control={control}
              render={({ field, fieldState }) => (
                <Autocomplete
                  multiple
                  size="small"
                  options={options}
                  loading={isFetching}
                  getOptionLabel={(o) => o.label}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  value={options.filter((o) => field.value.includes(o.id))}
                  onChange={(_e, v) => field.onChange(v.map((o) => o.id))}
                  onInputChange={(_e, v) => setSearch(v)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Participants *"
                      size="small"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message ?? (isFetching ? 'Searching…' : undefined)}
                    />
                  )}
                />
              )}
            />
            {formState.errors.participants && (
              <Chip label={formState.errors.participants.message} color="error" sx={{ alignSelf: 'flex-start' }} />
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={() => navigate('/messages')}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={formState.isSubmitting}>
                Create thread
              </Button>
            </Box>
          </Box>
        </form>
        {isFetching && <LinearProgress sx={{ mt: 1 }} />}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          You will be added as a participant automatically.
        </Typography>
      </Paper>
    </Box>
  );
}

export type { UserRef };
