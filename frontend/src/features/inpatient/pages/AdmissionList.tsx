import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Button, Grid, Link, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import dayjs from 'dayjs';
import { PageHeader, DataTable, StatusChip, StatCard, EmptyState, ErrorAlert } from '../../../components/ui';
import { useGetAdmissionsQuery, useGetInpatientStatsQuery } from '../api';
import type { Admission } from '../types';
import { ADMISSION_STATUSES, bedLabel, patientLabel } from '../types';

export default function AdmissionList() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading, isFetching, error } = useGetAdmissionsQuery({
    page,
    page_size: pageSize,
    status: status || undefined,
  });
  const { data: stats } = useGetInpatientStatsQuery();

  const columns = useMemo(
    () => [
      { key: 'id', label: '#', render: (r: Admission) => `A-${r.id}` },
      {
        key: 'patient',
        label: 'Patient',
        render: (r: Admission) => (
          <Link component={RouterLink} to={`/patients/${typeof r.patient === 'number' ? r.patient : r.patient.id}`} underline="hover">
            {patientLabel(r.patient)}
          </Link>
        ),
      },
      { key: 'bed', label: 'Bed', render: (r: Admission) => bedLabel(r.bed) },
      {
        key: 'admitted',
        label: 'Admitted',
        render: (r: Admission) => (
          <Box>
            <Typography variant="body2">{dayjs(r.admitted_at).format('DD MMM YYYY')}</Typography>
            <Typography variant="caption" color="text.secondary">{dayjs(r.admitted_at).format('HH:mm')}</Typography>
          </Box>
        ),
      },
      { key: 'type', label: 'Type', render: (r: Admission) => <StatusChip status={r.admission_type} /> },
      {
        key: 'diagnosis',
        label: 'Diagnosis on admission',
        render: (r: Admission) => r.diagnosis_on_admission || '—',
      },
      { key: 'status', label: 'Status', render: (r: Admission) => <StatusChip status={r.status} /> },
    ],
    [],
  );

  return (
    <Box>
      <PageHeader
        title="Inpatient admissions"
        subtitle="Track patients admitted to wards"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/inpatient/admissions/new')}>
            New Admission
          </Button>
        }
      />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={4} md={2}><StatCard title="Active" value={stats?.active_admissions ?? '—'} color="#0B6E4F" /></Grid>
        <Grid item xs={6} sm={4} md={2}><StatCard title="Beds total" value={stats?.total_beds ?? '—'} /></Grid>
        <Grid item xs={6} sm={4} md={2}><StatCard title="Available" value={stats?.available_beds ?? '—'} color="#2563EB" /></Grid>
        <Grid item xs={6} sm={4} md={2}><StatCard title="Occupied" value={stats?.occupied_beds ?? '—'} color="#F59E0B" /></Grid>
        <Grid item xs={6} sm={4} md={2}><StatCard title="Adm. today" value={stats?.admissions_today ?? '—'} color="#8B5CF6" /></Grid>
        <Grid item xs={6} sm={4} md={2}><StatCard title="Disc. today" value={stats?.discharges_today ?? '—'} color="#14B8A6" /></Grid>
      </Grid>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Box sx={{ width: 220 }}>
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            fullWidth
          >
            <MenuItem value="">All</MenuItem>
            {ADMISSION_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>
        </Box>
      </Stack>
      {error && <ErrorAlert error={error} />}
      <DataTable
        columns={columns}
        rows={data?.results ?? []}
        loading={isLoading || isFetching}
        rowKey={(r) => String(r.id)}
        page={page}
        pageSize={pageSize}
        count={data?.count ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(s: number) => { setPageSize(s); setPage(1); }}
        onRowClick={(r: Admission) => navigate(`/inpatient/admissions/${r.id}`)}
        emptyState={<EmptyState icon={<LocalHospitalIcon />} title="No admissions" hint="Admit a patient to start inpatient care." />}
      />
    </Box>
  );
}
