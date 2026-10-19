import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Grid,
  MenuItem,
  Pagination,
  TextField,
} from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader, DataTable, StatusChip, EmptyState } from '../../../components/ui';
import { formatDateTime } from '../../../utils/format';
import { useGetFormSubmissionsQuery, useGetFormTemplatesQuery } from '../api';
import { patientLabel, templateName, type FormSubmission, type SubmissionStatus } from '../types';

const STATUSES: SubmissionStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];

function getErr(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = (e as { data?: unknown }).data as Record<string, unknown> | undefined;
    if (data?.detail) return String(data.detail);
  }
  return 'Failed to load submissions.';
}

export default function SubmissionList() {
  const [page, setPage] = useState(1);
  const [template, setTemplate] = useState('');
  const [status, setStatus] = useState('');
  const [patient, setPatient] = useState('');

  const params = useMemo(
    () => ({
      page,
      page_size: 20,
      ...(template ? { template } : {}),
      ...(status ? { status } : {}),
      ...(patient ? { patient } : {}),
    }),
    [page, template, status, patient],
  );
  const { data, isLoading, error } = useGetFormSubmissionsQuery(params);
  const { data: templatesData } = useGetFormTemplatesQuery({ page_size: 200 });
  const templates = useMemo(() => templatesData?.results ?? [], [templatesData]);

  const columns = useMemo(
    () => [
      {
        key: 'id',
        label: 'Submission',
        render: (r: FormSubmission) => (
          <Box component={RouterLink} to={`/forms/submissions/${r.id}`} sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 600 }}>
            #{r.id}
          </Box>
        ),
      },
      { key: 'template', label: 'Template', render: (r: FormSubmission) => templateName(r.template) },
      { key: 'patient', label: 'Patient', render: (r: FormSubmission) => patientLabel(r.patient) },
      { key: 'submitted_at', label: 'Submitted', render: (r: FormSubmission) => (r.submitted_at ? formatDateTime(r.submitted_at) : '—') },
      { key: 'status', label: 'Status', render: (r: FormSubmission) => <StatusChip status={r.status} /> },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <Box>
      <PageHeader
        title="Form submissions"
        subtitle="Review submitted forms"
        actions={
          <Button component={RouterLink} to="/forms/submissions/new" variant="contained" startIcon={<AddIcon />}>
            New submission
          </Button>
        }
      />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            select
            label="Template"
            size="small"
            fullWidth
            value={template}
            onChange={(e) => {
              setTemplate(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="">All templates</MenuItem>
            {templates.map((t) => (
              <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
            ))}
          </TextField>
        </Grid>
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
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField label="Patient (name / MRN)" size="small" fullWidth value={patient} onChange={(e) => { setPatient(e.target.value); setPage(1); }} />
        </Grid>
      </Grid>

      {error && <Chip label={getErr(error)} color="error" sx={{ mb: 2 }} />}

      {!isLoading && (data?.results.length ?? 0) === 0 ? (
        <EmptyState
          icon={<FactCheckIcon />}
          title="No submissions found"
          hint="Submit a form or adjust your filters."
          action={
            <Button component={RouterLink} to="/forms/submissions/new" variant="contained" startIcon={<AddIcon />}>
              New submission
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
    </Box>
  );
}
