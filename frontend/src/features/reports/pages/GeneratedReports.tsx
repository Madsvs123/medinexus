import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Pagination,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import SummarizeIcon from '@mui/icons-material/Summarize';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import { useSnackbar } from 'notistack';
import { PageHeader, DataTable, StatusChip, EmptyState } from '../../../components/ui';
import { formatDateTime } from '../../../utils/format';
import {
  useGetGeneratedReportsQuery,
  useCreateGeneratedReportMutation,
  downloadGeneratedReportFile,
} from '../api';
import { REPORT_KINDS, type GeneratedReport, type ReportKind } from '../types';

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

export default function GeneratedReports() {
  const [page, setPage] = useState(1);
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading, error } = useGetGeneratedReportsQuery({ page, page_size: 20 });
  const hasPending = useMemo(() => (data?.results ?? []).some((r) => r.status === 'PENDING'), [data]);
  const { data: fresh } = useGetGeneratedReportsQuery({ page, page_size: 20 }, { pollingInterval: hasPending ? 3000 : 0 });

  const [createOpen, setCreateOpen] = useState(false);

  const handleDownload = async (r: GeneratedReport) => {
    try {
      await downloadGeneratedReportFile(r.id, `${r.kind}-${r.id}`);
      enqueueSnackbar('Download started', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const columns = useMemo(
    () => [
      { key: 'id', label: 'Report', render: (r: GeneratedReport) => `#${r.id}` },
      { key: 'kind', label: 'Kind', render: (r: GeneratedReport) => <Chip label={r.kind} size="small" /> },
      { key: 'title', label: 'Title', render: (r: GeneratedReport) => r.title || '—' },
      { key: 'generated_at', label: 'Generated', render: (r: GeneratedReport) => (r.generated_at ? formatDateTime(r.generated_at) : '—') },
      { key: 'status', label: 'Status', render: (r: GeneratedReport) => <StatusChip status={r.status} /> },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right' as const,
        render: (r: GeneratedReport) =>
          r.status === 'READY' ? (
            <Tooltip title="Download">
              <IconButton aria-label="Download" size="small" onClick={() => void handleDownload(r)}>
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Typography variant="caption" color="text.secondary">
              {r.status === 'PENDING' ? 'Generating…' : 'Failed'}
            </Typography>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const reports = fresh ?? data;

  return (
    <Box>
      <PageHeader
        title="Generated reports"
        subtitle="Async report generation (CSV/XLSX)"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Generate report
          </Button>
        }
      />
      {hasPending && <Chip label="Some reports are still generating — auto-refreshing…" color="info" sx={{ mb: 2 }} />}

      {error && <Chip label={getErr(error)} color="error" sx={{ mb: 2 }} />}

      {!isLoading && (reports?.results.length ?? 0) === 0 ? (
        <EmptyState
          icon={<SummarizeIcon />}
          title="No reports yet"
          hint="Generate your first report."
          action={
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
              Generate report
            </Button>
          }
        />
      ) : (
        <DataTable columns={columns} rows={reports?.results ?? []} loading={isLoading} rowKey={(r) => String(r.id)} />
      )}

      {(reports?.count ?? 0) > 20 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination page={page} count={Math.ceil((reports?.count ?? 0) / 20)} onChange={(_e, p) => setPage(p)} />
        </Box>
      )}

      {createOpen && <GenerateDialog open onClose={() => setCreateOpen(false)} />}
    </Box>
  );
}

function GenerateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [createReport] = useCreateGeneratedReportMutation();
  const [kind, setKind] = useState<ReportKind>('patients');
  const [from, setFrom] = useState<string>(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [to, setTo] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [submitting, setSubmitting] = useState(false);

  const handleGenerate = async () => {
    setSubmitting(true);
    try {
      await createReport({ kind, params: { from, to } }).unwrap();
      enqueueSnackbar('Report queued — it will appear in the list once ready', { variant: 'success' });
      onClose();
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Generate report</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            select
            label="Report kind"
            fullWidth
            size="small"
            value={kind}
            onChange={(e) => setKind(e.target.value as ReportKind)}
          >
            {REPORT_KINDS.map((k) => (
              <MenuItem key={k} value={k}>{k.replace(/_/g, ' ')}</MenuItem>
            ))}
          </TextField>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <DatePicker
                label="From"
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
                value={dayjs(from)}
                onChange={(d) => d && setFrom(d.format('YYYY-MM-DD'))}
              />
            </Grid>
            <Grid item xs={6}>
              <DatePicker
                label="To"
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
                value={dayjs(to)}
                onChange={(d) => d && setTo(d.format('YYYY-MM-DD'))}
              />
            </Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary">
            Reports are generated asynchronously in the background.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={submitting} onClick={() => void handleGenerate()}>
          Generate
        </Button>
      </DialogActions>
    </Dialog>
  );
}
