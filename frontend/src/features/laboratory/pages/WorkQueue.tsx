import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import dayjs from 'dayjs';
import { PageHeader, StatusChip, EmptyState, ErrorAlert } from '../../../components/ui';
import { useGetWorkQueueQuery } from '../api';
import type { WorkQueueEntry } from '../types';
import { patientLabel } from '../types';

export default function WorkQueue() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetWorkQueueQuery({ status: 'COLLECTED' });

  const entries = useMemo(() => data ?? [], [data]);

  if (error) return <ErrorAlert error={error} />;

  return (
    <Box>
      <PageHeader title="Work queue" subtitle="Collected samples awaiting result entry" />
      {isLoading ? (
        <EmptyState title="Loading…" hint="" />
      ) : entries.length === 0 ? (
        <EmptyState icon={<AssignmentIcon />} title="Queue is clear" hint="Collected samples waiting for results will appear here." />
      ) : (
        <Stack spacing={1.5}>
          {entries.map((e: WorkQueueEntry) => (
            <Card key={e.sample_id} variant="outlined" sx={{ borderColor: e.priority === 'STAT' ? 'error.main' : e.priority === 'URGENT' ? 'warning.main' : 'divider' }}>
              <CardContent>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center">
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {e.test.name} — {patientLabel(e.patient)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {e.sample_code} • collected {dayjs(e.collected_at).format('DD MMM HH:mm')}
                    </Typography>
                  </Box>
                  <StatusChip status={e.priority} />
                  <Button variant="contained" onClick={() => navigate(`/laboratory/results/new?order=${e.order}&test=${e.test.id}&sample=${e.sample_id}`)}>
                    Enter result
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
