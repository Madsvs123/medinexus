import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Button, Chip, Link, MenuItem, Stack, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import { PageHeader, DataTable, StatusChip, SearchField, EmptyState, ErrorAlert, ConfirmDialog } from '../../../components/ui';
import { useDebounce } from '../../../hooks/useDebounce';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { useDeletePatientMutation, useGetPatientsQuery } from '../api';
import type { Patient } from '../types';
import { fullName, PATIENT_STATUSES } from '../types';

export default function PatientList() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [toDelete, setToDelete] = useState<Patient | null>(null);
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isFetching, error } = useGetPatientsQuery({
    page,
    page_size: pageSize,
    search: debouncedSearch || undefined,
    status: status || undefined,
  });
  const [deletePatient] = useDeletePatientMutation();

  const columns = useMemo(
    () => [
      {
        key: 'mrn',
        label: 'MRN',
        render: (r: Patient) => (
          <Link component={RouterLink} to={`/patients/${r.id}`} underline="hover" sx={{ fontWeight: 600 }}>
            {r.mrn}
          </Link>
        ),
      },
      {
        key: 'name',
        label: 'Name',
        render: (r: Patient) => (
          <Link component={RouterLink} to={`/patients/${r.id}`} underline="hover">
            {fullName(r)}
          </Link>
        ),
      },
      { key: 'gender', label: 'Gender', render: (r: Patient) => r.gender ?? '—' },
      {
        key: 'dob',
        label: 'Age',
        render: (r: Patient) => (r.date_of_birth ? String(dayjs().diff(dayjs(r.date_of_birth), 'year')) : '—'),
      },
      { key: 'phone', label: 'Phone', render: (r: Patient) => r.phone || '—' },
      {
        key: 'status',
        label: 'Status',
        render: (r: Patient) => <StatusChip status={r.status} />,
      },
      {
        key: 'actions',
        label: '',
        render: (r: Patient) => (
          <Button size="small" variant="outlined" color="error" onClick={() => setToDelete(r)} aria-label={`Delete ${r.mrn}`}>
            Delete
          </Button>
        ),
      },
    ],
    [],
  );

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deletePatient(toDelete.id).unwrap();
      enqueueSnackbar(`Patient ${toDelete.mrn} deleted`, { variant: 'success' });
      setToDelete(null);
    } catch (e) {
      enqueueSnackbar('Failed to delete patient', { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader
        title="Patients"
        subtitle="Search and manage patient records"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/patients/new')}>
            New Patient
          </Button>
        }
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Box sx={{ flexGrow: 1, maxWidth: 420 }}>
          <SearchField
            value={search}
            onChange={(v: string) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search by name, MRN or phone…"
          />
        </Box>
        <Box sx={{ width: 220 }}>
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            fullWidth
          >
            <MenuItem value="">All statuses</MenuItem>
            {PATIENT_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
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
        onPageSizeChange={(s: number) => {
          setPageSize(s);
          setPage(1);
        }}
        emptyState={
          <EmptyState
            icon={<PersonIcon />}
            title="No patients found"
            hint={search ? `Nothing matches "${search}". Try a different search.` : 'Register your first patient to get started.'}
          />
        }
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete patient?"
        message={`This will permanently remove ${toDelete ? fullName(toDelete) : ''} (${toDelete?.mrn ?? ''}). Consider deactivating instead.`}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
      {data && <Chip sx={{ mt: 1 }} size="small" label={`${data.count} patient(s)`} />}
    </Box>
  );
}
