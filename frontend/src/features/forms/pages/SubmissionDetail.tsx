import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useSnackbar } from 'notistack';
import { PageHeader, StatusChip, EmptyState } from '../../../components/ui';
import { formatDateTime } from '../../../utils/format';
import {
  useGetFormSubmissionQuery,
  useApproveFormSubmissionMutation,
  useRejectFormSubmissionMutation,
} from '../api';
import { patientLabel, templateName, userName } from '../types';

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

export default function SubmissionDetail() {
  const { id } = useParams();
  const submissionId = Number(id);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data: submission, isLoading, error } = useGetFormSubmissionQuery(submissionId);
  const [approve] = useApproveFormSubmissionMutation();
  const [reject] = useRejectFormSubmissionMutation();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');

  const handleApprove = async () => {
    try {
      await approve(submissionId).unwrap();
      enqueueSnackbar('Submission approved', { variant: 'success' });
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const handleReject = async () => {
    try {
      await reject({ id: submissionId, reason }).unwrap();
      enqueueSnackbar('Submission rejected', { variant: 'success' });
      setRejectOpen(false);
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  if (isLoading) return <LinearProgress />;
  if (error || !submission) {
    return (
      <Box>
        <PageHeader title="Submission not found" />
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/forms/submissions')}>
          Back to submissions
        </Button>
      </Box>
    );
  }

  const schema = typeof submission.template === 'object' ? submission.template.schema : [];

  return (
    <Box>
      <PageHeader
        title={`Submission #${submission.id}`}
        subtitle={`${templateName(submission.template)} • ${patientLabel(submission.patient)}`}
        actions={
          <>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/forms/submissions')}>
              Back
            </Button>
            {submission.status === 'SUBMITTED' && (
              <>
                <Button color="success" variant="contained" startIcon={<CheckCircleIcon />} onClick={() => void handleApprove()}>
                  Approve
                </Button>
                <Button color="error" variant="outlined" startIcon={<CancelIcon />} onClick={() => setRejectOpen(true)}>
                  Reject
                </Button>
              </>
            )}
          </>
        }
      />
      <Box sx={{ mb: 2 }}>
        <StatusChip status={submission.status} />
        <Chip
          label={`Submitted ${submission.submitted_at ? formatDateTime(submission.submitted_at) : '—'} by ${userName(submission.submitted_by)}`}
          variant="outlined"
          size="small"
          sx={{ ml: 1 }}
        />
      </Box>

      <Paper variant="outlined">
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Submitted data</Typography>
        </Box>
        {Object.keys(submission.data ?? {}).length === 0 ? (
          <Box sx={{ p: 2 }}>
            <EmptyState title="No data" hint="This submission has no field values." />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableBody>
                {Object.entries(submission.data ?? {}).map(([key, value]) => {
                  const def = schema.find((f) => f.key === key);
                  const display = Array.isArray(value) ? value.join(', ') : value === null || value === '' ? '—' : String(value);
                  return (
                    <TableRow key={key}>
                      <TableCell sx={{ width: 200, fontWeight: 600 }}>{def?.label ?? key}</TableCell>
                      <TableCell>{display}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Reject submission</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Reason"
            fullWidth
            size="small"
            multiline
            minRows={2}
            sx={{ mt: 1 }}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={!reason.trim()} onClick={() => void handleReject()}>
            Reject submission
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
