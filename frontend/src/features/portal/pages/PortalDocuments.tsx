import { useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
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
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import { useSnackbar } from 'notistack';
import { PageHeader, StatusChip, EmptyState } from '../../../components/ui';
import { formatDateTime } from '../../../utils/format';
import { useGetPortalDocumentsQuery, useUploadPortalDocumentMutation } from '../api';
import type { PortalDocument } from '../types';

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

function absoluteUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${window.location.origin}${url}`;
}

export default function PortalDocuments() {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading, error } = useGetPortalDocumentsQuery();
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <Box>
      <PageHeader
        title="My documents"
        subtitle="Consent forms and shared documents"
        actions={
          <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={() => setUploadOpen(true)}>
            Upload consent
          </Button>
        }
      />
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Chip label="Failed to load documents." color="error" sx={{ mb: 2 }} />}

      {!isLoading && (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<FolderOpenIcon />}
          title="No documents"
          hint="Consent forms you upload will appear here."
          action={
            <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={() => setUploadOpen(true)}>
              Upload consent
            </Button>
          }
        />
      ) : (
        <Paper variant="outlined">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Uploaded</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data ?? []).map((d: PortalDocument) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{d.title || '(untitled)'}</Typography>
                      {d.notes && <Typography variant="caption" color="text.secondary">{d.notes}</Typography>}
                    </TableCell>
                    <TableCell><StatusChip status={d.category} /></TableCell>
                    <TableCell>{formatDateTime(d.created_at)}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        component="a"
                        href={absoluteUrl(d.file)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {uploadOpen && <UploadConsentDialog open onClose={() => setUploadOpen(false)} />}
    </Box>
  );
}

function UploadConsentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [upload] = useUploadPortalDocumentMutation();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) {
      enqueueSnackbar('Choose a file first', { variant: 'warning' });
      return;
    }
    setSubmitting(true);
    try {
      await upload({ file, title: title || undefined, notes: notes || undefined }).unwrap();
      enqueueSnackbar('Consent document uploaded', { variant: 'success' });
      setFile(null);
      setTitle('');
      setNotes('');
      onClose();
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Upload consent document</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Box
            sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 2, p: 2, textAlign: 'center', cursor: 'pointer' }}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
            }}
            aria-label="Choose file"
          >
            <input ref={inputRef} type="file" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <CloudUploadIcon color="primary" />
            <Typography variant="body2">{file ? file.name : 'Click to choose a file'}</Typography>
          </Box>
          <TextField label="Title" fullWidth size="small" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextField label="Notes" fullWidth size="small" multiline minRows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Chip label="Category: CONSENT" size="small" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!file || submitting} onClick={() => void handleUpload()}>
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
}
