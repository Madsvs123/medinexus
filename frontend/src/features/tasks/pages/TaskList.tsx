import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../app/store';
import {
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  MenuItem,
  Pagination,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { useSnackbar } from 'notistack';
import { PageHeader, DataTable, StatusChip, EmptyState, ConfirmDialog } from '../../../components/ui';
import { formatDate } from '../../../utils/format';
import {
  useGetTasksQuery,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useCompleteTaskMutation,
} from '../api';
import { userName, type Task, type TaskPriority, type TaskStatus } from '../types';

const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'];

function getErr(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = (e as { data?: unknown }).data as Record<string, unknown> | undefined;
    if (data?.detail) return String(data.detail);
    const first = Object.values(data ?? {}).find((v) => v !== undefined && v !== null);
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return 'Something went wrong. Please try again.';
}

export default function TaskList() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assignee, setAssignee] = useState('');
  const [myTasks, setMyTasks] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const params = useMemo(
    () => ({
      page,
      page_size: 20,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(assignee ? { assignee } : {}),
      ...(myTasks && user?.id ? { assignee: user.id } : {}),
    }),
    [page, status, priority, assignee, myTasks, user?.id],
  );
  const { data, isLoading, error } = useGetTasksQuery(params);

  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [completeTask] = useCompleteTaskMutation();
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      enqueueSnackbar(msg, { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const setStatusAction = (task: Task, nextStatus: TaskStatus) =>
    void run(
      () =>
        updateTask({
          id: task.id,
          body: { status: nextStatus, completed_at: nextStatus === 'DONE' ? new Date().toISOString() : null },
        }).unwrap(),
      `Task marked ${nextStatus.replace(/_/g, ' ').toLowerCase()}`,
    );

  const columns = useMemo(
    () => [
      {
        key: 'title',
        label: 'Task',
        render: (r: Task) => (
          <Box>
            <Box component={RouterLink} to={`/tasks/${r.id}/edit`} sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}>
              {r.title}
            </Box>
            {r.description && (
              <Box component="span" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 420 }}>
                {r.description}
              </Box>
            )}
          </Box>
        ),
      },
      { key: 'assignee', label: 'Assignee', render: (r: Task) => userName(r.assignee) },
      { key: 'priority', label: 'Priority', render: (r: Task) => <StatusChip status={r.priority} /> },
      { key: 'status', label: 'Status', render: (r: Task) => <StatusChip status={r.status} /> },
      {
        key: 'due',
        label: 'Due',
        render: (r: Task) => (r.due_date ? formatDate(r.due_date) : '—'),
      },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right' as const,
        render: (r: Task) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            {r.status === 'TODO' && (
              <Tooltip title="Start">
                <IconButton aria-label="Start task" size="small" onClick={() => setStatusAction(r, 'IN_PROGRESS')}>
                  <PlayCircleOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {r.status === 'IN_PROGRESS' && (
              <Tooltip title="Complete">
                <IconButton aria-label="Complete task" size="small" color="success" onClick={() => void run(() => completeTask(r.id).unwrap(), 'Task completed')}>
                  <CheckCircleOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {(r.status === 'TODO' || r.status === 'IN_PROGRESS') && (
              <Tooltip title="Edit">
                <IconButton aria-label="Edit task" size="small" component={RouterLink} to={`/tasks/${r.id}/edit`}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Delete">
              <IconButton aria-label="Delete task" size="small" color="error" onClick={() => setDeleteTarget(r)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <Box>
      <PageHeader
        title="Tasks"
        subtitle="Assignments and to-dos"
        actions={
          <Button component={RouterLink} to="/tasks/new" variant="contained" startIcon={<AddIcon />}>
            New task
          </Button>
        }
      />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            select
            label="Status"
            size="small"
            fullWidth
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="">All statuses</MenuItem>
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            select
            label="Priority"
            size="small"
            fullWidth
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="">All priorities</MenuItem>
            {PRIORITIES.map((p) => (
              <MenuItem key={p} value={p}>{p}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Assignee ID"
            size="small"
            fullWidth
            type="number"
            value={assignee}
            onChange={(e) => {
              setAssignee(e.target.value);
              setPage(1);
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={myTasks ? 'mine' : ''}
            onChange={(_e, v) => {
              setMyTasks(v === 'mine');
              setPage(1);
            }}
          >
            <ToggleButton value="mine">My tasks</ToggleButton>
          </ToggleButtonGroup>
        </Grid>
      </Grid>

      {error && <Chip label={getErr(error)} color="error" sx={{ mb: 2 }} />}

      {!isLoading && (data?.results.length ?? 0) === 0 ? (
        <EmptyState
          icon={<TaskAltIcon />}
          title="No tasks found"
          hint="Adjust filters or create a new task."
          action={
            <Button component={RouterLink} to="/tasks/new" variant="contained" startIcon={<AddIcon />}>
              New task
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={data?.results ?? []} loading={isLoading} rowKey={(r) => String(r.id)} />
      )}

      {(data?.count ?? 0) > 20 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination page={page} count={Math.ceil((data?.count ?? 0) / 20)} onChange={(_e, p) => setPage(p)} />
        </Box>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete task?"
        message={deleteTarget ? `"${deleteTarget.title}" will be permanently deleted.` : undefined}
        confirmLabel="Delete"
        severity="error"
        onConfirm={() => {
          if (deleteTarget) void run(() => deleteTask(deleteTarget.id).unwrap(), 'Task deleted');
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
