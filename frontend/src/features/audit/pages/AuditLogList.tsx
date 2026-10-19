import { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Drawer,
  Grid,
  IconButton,
  MenuItem,
  Pagination,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { PageHeader, DataTable, StatusChip, EmptyState } from '../../../components/ui';
import { formatDateTime } from '../../../utils/format';
import { useGetAuditLogsQuery } from '../api';
import { AUDIT_ACTIONS, userName, type AuditLog } from '../types';

function getErr(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = (e as { data?: unknown }).data as Record<string, unknown> | undefined;
    if (data?.detail) return String(data.detail);
  }
  return 'Failed to load audit log.';
}

export default function AuditLogList() {
  const [page, setPage] = useState(1);
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const params = useMemo(
    () => ({
      page,
      page_size: 20,
      ...(actor ? { actor } : {}),
      ...(action ? { action } : {}),
      ...(resourceType ? { resource_type: resourceType } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [page, actor, action, resourceType, from, to],
  );
  const { data, isLoading, error } = useGetAuditLogsQuery(params);

  const columns = useMemo(
    () => [
      { key: 'time', label: 'Time', render: (r: AuditLog) => formatDateTime(r.created_at) },
      { key: 'actor', label: 'Actor', render: (r: AuditLog) => userName(r.actor) },
      { key: 'action', label: 'Action', render: (r: AuditLog) => <StatusChip status={r.action} /> },
      { key: 'resource_type', label: 'Resource', render: (r: AuditLog) => <Chip label={r.resource_type} size="small" variant="outlined" /> },
      { key: 'resource_id', label: 'Resource ID', render: (r: AuditLog) => r.resource_id ?? '—' },
      { key: 'ip', label: 'IP address', render: (r: AuditLog) => r.ip_address || '—' },
      {
        key: 'details',
        label: 'Details',
        align: 'right' as const,
        render: (r: AuditLog) =>
          r.details && Object.keys(r.details).length > 0 ? (
            <Tooltip title="View details">
              <IconButton aria-label="View details" size="small" onClick={() => setSelected(r)}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <Box>
      <PageHeader title="Audit log" subtitle="Track who did what, when" />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Actor (name / email / id)"
            size="small"
            fullWidth
            value={actor}
            onChange={(e) => {
              setActor(e.target.value);
              setPage(1);
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            label="Action"
            size="small"
            fullWidth
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="">All actions</MenuItem>
            {AUDIT_ACTIONS.map((a) => (
              <MenuItem key={a} value={a}>{a}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="Resource type"
            size="small"
            fullWidth
            value={resourceType}
            onChange={(e) => {
              setResourceType(e.target.value);
              setPage(1);
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="From"
            type="date"
            size="small"
            fullWidth
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label="To"
            type="date"
            size="small"
            fullWidth
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      </Grid>

      {error && <Chip label={getErr(error)} color="error" sx={{ mb: 2 }} />}

      {!isLoading && (data?.results.length ?? 0) === 0 ? (
        <EmptyState icon={<HistoryIcon />} title="No audit entries found" hint="Adjust your filters to see more." />
      ) : (
        <DataTable columns={columns} rows={data?.results ?? []} loading={isLoading} rowKey={(r) => String(r.id)} />
      )}

      {(data?.count ?? 0) > 20 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination page={page} count={Math.ceil((data?.count ?? 0) / 20)} onChange={(_e, p) => setPage(p)} />
        </Box>
      )}

      <Drawer anchor="right" open={selected !== null} onClose={() => setSelected(null)}>
        <Box sx={{ width: 420, p: 3 }}>
          <Typography variant="h6" gutterBottom>Audit details</Typography>
          {selected && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2"><strong>Time:</strong> {formatDateTime(selected.created_at)}</Typography>
              <Typography variant="body2"><strong>Actor:</strong> {userName(selected.actor)}</Typography>
              <Typography variant="body2"><strong>Action:</strong> {selected.action}</Typography>
              <Typography variant="body2"><strong>Resource:</strong> {selected.resource_type} #{selected.resource_id ?? '—'}</Typography>
              <Typography variant="body2"><strong>IP:</strong> {selected.ip_address || '—'}</Typography>
              <Box component="pre" sx={{ bgcolor: 'grey.900', color: 'grey.100', p: 2, borderRadius: 1, fontSize: 12, overflow: 'auto', maxHeight: 400 }}>
                {JSON.stringify(selected.details ?? {}, null, 2)}
              </Box>
            </Box>
          )}
        </Box>
      </Drawer>
    </Box>
  );
}
