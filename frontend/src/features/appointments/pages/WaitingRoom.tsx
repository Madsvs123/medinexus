import { useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardContent, Grid, Link, Stack, Typography } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import GroupsIcon from '@mui/icons-material/Groups';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { PageHeader, StatusChip, EmptyState, ErrorAlert } from '../../../components/ui';
import { useCallNextInQueueMutation, useGetAppointmentsQuery, useGetQueueQuery } from '../api';
import { patientLabel, userName, departmentName } from '../types';

const QUEUE_ORDER: Record<string, number> = { WAITING: 0, IN_PROGRESS: 1, DONE: 2, SKIPPED: 3 };

export default function WaitingRoom() {
  const { enqueueSnackbar } = useSnackbar();
  const today = dayjs().format('YYYY-MM-DD');
  const { data: queue, isLoading, error } = useGetQueueQuery({ date: today });
  const { data: apptsData } = useGetAppointmentsQuery({ date: today, page_size: 200 });
  const [callNext] = useCallNextInQueueMutation();

  const queueRows = useMemo(() => {
    const entries = queue ?? [];
    const sorted = [...entries].sort((a, b) => a.position - b.position || QUEUE_ORDER[a.status] - QUEUE_ORDER[b.status]);
    return sorted;
  }, [queue]);

  // Appointments that are checked-in but not in the queue are shown as candidates.
  const checkedInNotQueued = useMemo(() => {
    const queuedIds = new Set((queue ?? []).map((q) => (typeof q.appointment === 'number' ? q.appointment : q.appointment.id)));
    return (apptsData?.results ?? []).filter((a) => a.status === 'CHECKED_IN' && !queuedIds.has(a.id));
  }, [apptsData, queue]);

  const nextWaiting = queueRows.find((q) => q.status === 'WAITING');

  const handleCallNext = async () => {
    if (!nextWaiting) return;
    try {
      await callNext(nextWaiting.id).unwrap();
      enqueueSnackbar(`Called ${patientLabel(nextWaiting.appointment.patient)} to the front`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to call next patient', { variant: 'error' });
    }
  };

  if (error) return <ErrorAlert error={error} />;

  return (
    <Box>
      <PageHeader
        title="Waiting room"
        subtitle={`Queue for ${today}`}
        action={
          <Button
            variant="contained"
            startIcon={<CampaignIcon />}
            onClick={handleCallNext}
            disabled={!nextWaiting}
          >
            Call next
          </Button>
        }
      />
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupsIcon /> Queue ({queueRows.length})
              </Typography>
              {isLoading ? (
                <EmptyState title="Loading queue…" hint="" />
              ) : queueRows.length === 0 ? (
                <EmptyState title="Queue is empty" hint="Checked-in patients appear here as they join the queue." />
              ) : (
                <Stack spacing={1}>
                  {queueRows.map((q) => {
                    const appt = typeof q.appointment === 'number' ? undefined : q.appointment;
                    return (
                      <Stack
                        key={q.id}
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        sx={{
                          p: 1.5,
                          border: '1px solid',
                          borderColor: q.status === 'IN_PROGRESS' ? 'primary.main' : 'divider',
                          borderRadius: 1,
                          bgcolor: q.status === 'IN_PROGRESS' ? 'primary.light' : 'transparent',
                        }}
                      >
                        <Typography variant="h6" sx={{ width: 40 }}>#{q.position}</Typography>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body1">
                            {appt ? (
                              <Link component={RouterLink} to={`/patients/${appt.patient && typeof appt.patient !== 'number' ? appt.patient.id : ''}`} underline="hover">
                                {patientLabel(appt?.patient)}
                              </Link>
                            ) : (
                              `Appointment #${typeof q.appointment === 'number' ? q.appointment : q.appointment.id}`
                            )}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {appt ? `${userName(appt.doctor)} • ${departmentName(appt.department)}` : ''}
                            {q.called_at ? ` • called ${dayjs(q.called_at).format('HH:mm')}` : ''}
                          </Typography>
                        </Box>
                        <StatusChip status={q.status} />
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>Checked in, not queued</Typography>
              {checkedInNotQueued.length === 0 ? (
                <EmptyState title="All clear" hint="No checked-in patients waiting to join the queue." />
              ) : (
                <Stack spacing={1}>
                  {checkedInNotQueued.map((a) => (
                    <Typography key={a.id} variant="body2">
                      {patientLabel(a.patient)} — {userName(a.doctor)}
                    </Typography>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
