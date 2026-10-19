import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/ui';
import {
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useLazySearchTaskUsersQuery,
} from '../api';
import { userName, type TaskPriority, type TaskStatus } from '../types';

const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'];

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assignee: z.number().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']),
  due_date: z.string().nullable().optional(),
  related_type: z.string().optional(),
  related_id: z.string().optional(),
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
  return 'Failed to save task.';
}

export default function TaskForm() {
  const { id } = useParams();
  const taskId = id ? Number(id) : null;
  const isEdit = taskId !== null;
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const { data: task, isLoading: taskLoading } = useGetTaskQuery(taskId ?? 0, { skip: !isEdit });
  const [createTask] = useCreateTaskMutation();
  const [updateTask] = useUpdateTaskMutation();

  const { control, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      assignee: null,
      priority: 'MEDIUM',
      status: 'TODO',
      due_date: null,
      related_type: '',
      related_id: '',
    },
  });

  useEffect(() => {
    if (!task) return;
    reset({
      title: task.title,
      description: task.description ?? '',
      assignee: typeof task.assignee === 'number' ? task.assignee : (task.assignee && 'id' in task.assignee ? task.assignee.id : null),
      priority: task.priority,
      status: task.status,
      due_date: task.due_date,
      related_type: task.related_type ?? '',
      related_id: task.related_id != null ? String(task.related_id) : '',
    });
  }, [task, reset]);

  const [trigger, { data: usersData, isFetching: usersLoading }] = useLazySearchTaskUsersQuery();
  const [search, setSearch] = useState('');
  const assigneeOptions = useMemo(
    () => (usersData?.results ?? []).map((u) => ({ id: u.id, label: userName(u) })),
    [usersData],
  );

  const onSubmit = async (values: FormValues) => {
    const payload = {
      title: values.title,
      description: values.description || '',
      assignee: values.assignee ?? null,
      priority: values.priority,
      status: values.status,
      due_date: values.due_date || null,
      related_type: values.related_type || '',
      related_id: values.related_id ? Number(values.related_id) : null,
    };
    try {
      if (isEdit && taskId) {
        await updateTask({ id: taskId, body: payload }).unwrap();
        enqueueSnackbar('Task updated', { variant: 'success' });
      } else {
        await createTask(payload).unwrap();
        enqueueSnackbar('Task created', { variant: 'success' });
      }
      navigate('/tasks');
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  if (isEdit && taskLoading) return <LinearProgress />;

  return (
    <Box>
      <PageHeader
        title={isEdit ? 'Edit task' : 'New task'}
        subtitle="Create or update an assignment"
        actions={
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/tasks')}>
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
              render={({ field, fieldState }) => (
                <TextField label="Title *" fullWidth size="small" {...field} error={!!fieldState.error} helperText={fieldState.error?.message} />
              )}
            />
            <Controller
              name="description"
              control={control}
              render={({ field }) => <TextField label="Description" fullWidth size="small" multiline minRows={3} {...field} />}
            />
            <Controller
              name="assignee"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  size="small"
                  options={assigneeOptions}
                  loading={usersLoading}
                  getOptionLabel={(o) => o.label}
                  isOptionEqualToValue={(a, b) => a.id === b.id}
                  value={assigneeOptions.find((o) => o.id === field.value) ?? null}
                  onChange={(_e, v) => field.onChange(v ? v.id : null)}
                  onInputChange={(_e, v) => {
                    setSearch(v);
                    void trigger({ search: v || undefined, page_size: 20 });
                  }}
                  renderInput={(params) => <TextField {...params} label="Assignee" size="small" />}
                />
              )}
            />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <TextField select label="Priority" size="small" sx={{ minWidth: 180 }} value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                    {PRIORITIES.map((p) => (
                      <MenuItem key={p} value={p}>{p}</MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <TextField select label="Status" size="small" sx={{ minWidth: 180 }} value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                    {STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <Controller
                name="due_date"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Due date"
                    slotProps={{ textField: { size: 'small' } }}
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(d) => field.onChange(d ? d.format('YYYY-MM-DD') : null)}
                  />
                )}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Controller
                name="related_type"
                control={control}
                render={({ field }) => <TextField label="Related type (e.g. encounter)" fullWidth size="small" {...field} />}
              />
              <Controller
                name="related_id"
                control={control}
                render={({ field }) => <TextField label="Related ID" fullWidth size="small" type="number" {...field} />}
              />
            </Box>
            {formState.errors.title && <Chip label={formState.errors.title.message} color="error" sx={{ alignSelf: 'flex-start' }} />}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={() => navigate('/tasks')}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={formState.isSubmitting}>
                {isEdit ? 'Save changes' : 'Create task'}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
