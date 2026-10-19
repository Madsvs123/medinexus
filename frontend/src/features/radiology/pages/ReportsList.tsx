import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Button, Link } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import dayjs from 'dayjs';
import { PageHeader, DataTable, StatusChip, EmptyState, ErrorAlert } from '../../../components/ui';
import { useGetRadiologyReportsQuery } from '../api';
import type { RadiologyReport } from '../types';
import { patientLabel, userName } from '../types';

export default function ReportsList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data, isLoading, isFetching, error } = useGetRadiologyReportsQuery({ page_size: pageSize });

  const columns = useMemo(
    () => [
      { key: 'id', label: '#', render: (r: RadiologyReport) => <strong>R-{r.id}</strong> },
      {
        key: 'order',
        label: 'Order',
        render: (r: RadiologyReport) => (
          <Link component={RouterLink} to={`/radiology/orders/${typeof r.order === 'number' ? r.order : r.order.id}`} underline="hover">
            X-{typeof r.order === 'number' ? r.order : r.order.id}
          </Link>
        ),
      },
      {
        key: 'patient',
        label: 'Patient',
        render: (r: RadiologyReport) => (typeof r.order === 'object' && r.order ? patientLabel(r.order.patient) : '—'),
      },
      {
        key: 'study',
        label: 'Study',
        render: (r: RadiologyReport) => (typeof r.order === 'object' && r.order ? `${r.order.modality} ${r.order.body_part}` : '—'),
      },
      { key: 'radiologist', label: 'Radiologist', render: (r: RadiologyReport) => userName(r.radiologist) },
      { key: 'status', label: 'Status', render: (r: RadiologyReport) => <StatusChip status={r.status} /> },
      {
        key: 'finalized',
        label: 'Finalized',
        render: (r: RadiologyReport) => (r.finalized_at ? dayjs(r.finalized_at).format('DD MMM YYYY HH:mm') : '—'),
      },
      {
        key: 'actions',
        label: '',
        render: (r: RadiologyReport) => (
          <Button size="small" variant="outlined" onClick={() => navigate(`/radiology/reports/${r.id}`)}>
            {r.status === 'FINAL' ? 'View' : 'Edit'}
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (error) return <ErrorAlert error={error} />;

  return (
    <Box>
      <PageHeader title="Radiology reports" subtitle="All imaging reports" />
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
        emptyState={<EmptyState icon={<DescriptionIcon />} title="No reports" hint="Reports appear here once written for an order." />}
      />
    </Box>
  );
}
