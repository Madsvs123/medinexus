import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import { useSnackbar } from 'notistack';
import { PageHeader, DataTable, StatusChip, EmptyState } from '../../../components/ui';
import { formatDateTime } from '../../../utils/format';
import {
  useGetImportJobsQuery,
  useCreateImportJobMutation,
  downloadImportTemplate,
} from '../api';
import { IMPORT_KINDS, type ImportJob, type ImportKind } from '../types';

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

export default function ImportTools() {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading, error } = useGetImportJobsQuery({ page_size: 50 });
  const hasActive = useMemo(() => (data?.results ?? []).some((j) => j.status === 'UPLOADED' || j.status === 'PROCESSING'), [data]);
  const { data: fresh } = useGetImportJobsQuery({ page_size: 50 }, { pollingInterval: hasActive ? 3000 : 0 });

  const [kind, setKind] = useState<ImportKind>('patients');
  const [file, setFile] = useState<File | null>(null);
  const [createImport] = useCreateImportJobMutation();
  const [errorsTarget, setErrorsTarget] = useState<ImportJob | null>(null);

  const jobs = fresh ?? data;

  const handleUpload = async () => {
    if (!file) {
      enqueueSnackbar('Choose a CSV file first', { variant: 'warning' });
      return;
    }
    try {
      await createImport({ kind, file }).unwrap();
      enqueueSnackbar('Import queued — status will refresh automatically', { variant: 'success' });
      setFile(null);
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const handleTemplate = async () => {
    try {
      await downloadImportTemplate(kind);
      enqueueSnackbar('Template downloaded', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const columns = useMemo(
    () => [
      { key: 'id', label: 'Job', render: (r: ImportJob) => `#${r.id}` },
      { key: 'kind', label: 'Kind', render: (r: ImportJob) => <Chip label={r.kind} size="small" /> },
      { key: 'status', label: 'Status', render: (r: ImportJob) => <StatusChip status={r.status} /> },
      {
        key: 'summary',
        label: 'Summary',
        render: (r: ImportJob) =>
          r.summary ? (
            <Typography variant="body2">
              {Object.entries(r.summary)
                .map(([k, v]) => `${k}: ${String(v)}`)
                .join(' • ')}
            </Typography>
          ) : (
            '—'
          ),
      },
      { key: 'started', label: 'Started', render: (r: ImportJob) => (r.started_at ? formatDateTime(r.started_at) : '—') },
      { key: 'finished', label: 'Finished', render: (r: ImportJob) => (r.finished_at ? formatDateTime(r.finished_at) : '—') },
      {
        key: 'errors',
        label: 'Errors',
        align: 'right' as const,
        render: (r: ImportJob) =>
          r.status === 'FAILED' && Array.isArray(r.errors) && r.errors.length > 0 ? (
            <Button size="small" variant="outlined" color="error" onClick={() => setErrorsTarget(r)}>
              View {r.errors.length} error(s)
            </Button>
          ) : (
            '—'
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <Box>
      <PageHeader title="Import tools" subtitle="Bulk-import patients, medications, services and lab tests from CSV" />
      {hasActive && <Chip label="Imports are processing — auto-refreshing…" color="info" sx={{ mb: 2 }} />}

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              label="Import kind"
              size="small"
              fullWidth
              value={kind}
              onChange={(e) => setKind(e.target.value as ImportKind)}
            >
              {IMPORT_KINDS.map((k) => (
                <MenuItem key={k} value={k}>{k}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Box>
              <input
                accept=".csv,.xlsx"
                type="file"
                id="import-file"
                style={{ display: 'none' }}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <label htmlFor="import-file">
                <Button component="span" variant="outlined" startIcon={<CloudUploadIcon />} fullWidth>
                  {file ? file.name : 'Choose CSV file'}
                </Button>
              </label>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={() => void handleUpload()} fullWidth disabled={!file}>
              Upload import
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button variant="text" startIcon={<DownloadIcon />} onClick={() => void handleTemplate()} fullWidth>
              Template
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && <Chip label={getErr(error)} color="error" sx={{ mb: 2 }} />}

      {!isLoading && (jobs?.results.length ?? 0) === 0 ? (
        <EmptyState
          icon={<CloudUploadIcon />}
          title="No imports yet"
          hint="Upload a CSV to start a bulk import job."
        />
      ) : (
        <DataTable columns={columns} rows={jobs?.results ?? []} loading={isLoading} rowKey={(r) => String(r.id)} />
      )}

      <Dialog open={errorsTarget !== null} onClose={() => setErrorsTarget(null)} fullWidth maxWidth="md">
        <DialogTitle>Import errors — job #{errorsTarget?.id}</DialogTitle>
        <DialogContent>
          {errorsTarget && Array.isArray(errorsTarget.errors) && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width={100}>Row</TableCell>
                    <TableCell>Error</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {errorsTarget.errors.map((e, i) => {
                    const err = typeof e === 'string' ? { error: e } : e;
                    return (
                      <TableRow key={i}>
                        <TableCell>{err.row ?? '—'}</TableCell>
                        <TableCell>{err.error ?? String(e)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
