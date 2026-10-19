import { useMemo, useState } from 'react';
import { useEffect } from 'react';
import {
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  MenuItem,
  Pagination,
  TextField,
  Tooltip,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useSnackbar } from 'notistack';
import { PageHeader, DataTable, EmptyState, ConfirmDialog } from '../../../components/ui';
import { formatDateTime } from '../../../utils/format';
import {
  useGetDocumentsQuery,
  useDeleteDocumentMutation,
  downloadDocumentFile,
} from '../api';
import { patientLabel, type DocumentCategory, type DocumentRecord } from '../types';
import UploadDialog from '../components/UploadDialog';

function useDebouncedValue<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const CATEGORIES: DocumentCategory[] = ['CLINICAL', 'ADMIN', 'FINANCIAL', 'LEGAL', 'OTHER'];

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

export default function DocumentList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const searchQ = useDebouncedValue(search);
  const [category, setCategory] = useState('');
  const [patient, setPatient] = useState('');
  const patientQ = useDebouncedValue(patient);
  const { enqueueSnackbar } = useSnackbar();

  const params = useMemo(
    () => ({
      page,
      page_size: 20,
      ...(searchQ ? { search: searchQ } : {}),
      ...(category ? { category } : {}),
      ...(patientQ ? { patient: patientQ } : {}),
    }),
    [page, searchQ, category, patientQ],
  );
  const { data, isLoading, error } = useGetDocumentsQuery(params);

  const [deleteDocument] = useDeleteDocumentMutation();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocumentRecord | null>(null);

  const handleDownload = async (doc: DocumentRecord) => {
    try {
      await downloadDocumentFile(doc.id, doc.title || 'document');
      enqueueSnackbar('Download started', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDocument(deleteTarget.id).unwrap();
      enqueueSnackbar('Document deleted', { variant: 'success' });
      setDeleteTarget(null);
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const columns = useMemo(
    () => [
      { key: 'title', label: 'Title', render: (r: DocumentRecord) => r.title || '(untitled)' },
      { key: 'category', label: 'Category', render: (r: DocumentRecord) => <Chip label={r.category} size="small" /> },
      { key: 'patient', label: 'Patient', render: (r: DocumentRecord) => patientLabel(r.patient) },
      {
        key: 'tags',
        label: 'Tags',
        render: (r: DocumentRecord) =>
          r.tags?.length ? (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {r.tags.slice(0, 3).map((t) => (
                <Chip key={t} label={t} size="small" variant="outlined" />
              ))}
              {r.tags.length > 3 && <Chip label={`+${r.tags.length - 3}`} size="small" variant="outlined" />}
            </Box>
          ) : (
            '—'
          ),
      },
      { key: 'uploaded', label: 'Uploaded', render: (r: DocumentRecord) => formatDateTime(r.created_at) },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right' as const,
        render: (r: DocumentRecord) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Tooltip title="Download">
              <IconButton aria-label="Download" size="small" onClick={() => void handleDownload(r)}>
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton aria-label="Delete" size="small" color="error" onClick={() => setDeleteTarget(r)}>
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
        title="Documents"
        subtitle="Organization document library"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setUploadOpen(true)}>
            Upload document
          </Button>
        }
      />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField label="Search" size="small" fullWidth value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            label="Category"
            size="small"
            fullWidth
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          >
            <MenuItem value="">All categories</MenuItem>
            {CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField label="Patient (name / MRN)" size="small" fullWidth value={patient} onChange={(e) => { setPatient(e.target.value); setPage(1); }} />
        </Grid>
      </Grid>

      {error && <Chip label={getErr(error)} color="error" sx={{ mb: 2 }} />}

      {!isLoading && (data?.results.length ?? 0) === 0 ? (
        <EmptyState
          icon={<FolderOpenIcon />}
          title="No documents found"
          hint="Upload a document or adjust your filters."
          action={
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setUploadOpen(true)}>
              Upload document
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

      {uploadOpen && <UploadDialog open onClose={() => setUploadOpen(false)} />}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete document?"
        message={deleteTarget ? `"${deleteTarget.title}" will be permanently deleted.` : undefined}
        confirmLabel="Delete"
        severity="error"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
