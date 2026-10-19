import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import dayjs from 'dayjs';
import { Calendar, dayjsLocalizer } from 'react-big-calendar';
import type { View } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { PageHeader, ErrorAlert } from '../../../components/ui';
import { useGetAppointmentsQuery } from '../api';
import type { Appointment } from '../types';
import { patientLabel, userName } from '../types';

const localizer = dayjsLocalizer(dayjs);

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: '#2563EB',
  CONFIRMED: '#0B6E4F',
  CHECKED_IN: '#F59E0B',
  IN_PROGRESS: '#F97316',
  COMPLETED: '#10B981',
  CANCELLED: '#EF4444',
  NO_SHOW: '#7F1D1D',
};

interface CalEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  status: string;
  appointment: Appointment;
}

export default function AppointmentCalendar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState<Date>(() => {
    const d = searchParams.get('date');
    return d ? dayjs(d).toDate() : new Date();
  });

  const { data, isLoading, error } = useGetAppointmentsQuery({ page_size: 500 });

  const events: CalEvent[] = useMemo(
    () =>
      (data?.results ?? [])
        .filter((a) => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW')
        .map((a) => ({
          id: a.id,
          title: `${patientLabel(a.patient)} — ${userName(a.doctor)}`,
          start: new Date(a.start),
          end: new Date(a.end),
          status: a.status,
          appointment: a,
        })),
    [data],
  );

  const eventPropGetter = (event: CalEvent) => ({
    style: {
      backgroundColor: STATUS_COLORS[event.status] ?? '#64748B',
      borderRadius: '6px',
      color: '#fff',
      border: 'none',
      fontSize: 12,
    },
  });

  if (error) return <ErrorAlert error={error} />;

  return (
    <Box>
      <PageHeader
        title="Appointment calendar"
        subtitle="Month, week and day views — colors reflect appointment status"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/appointments/new')}>
            Book
          </Button>
        }
      />
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: color }} />
            <Typography variant="caption">{status.replace(/_/g, ' ')}</Typography>
          </Box>
        ))}
      </Stack>
      <Box sx={{ height: 'calc(100vh - 240px)', minHeight: 480 }}>
        <Calendar<CalEvent>
          localizer={localizer}
          events={events}
          views={['month', 'week', 'day', 'agenda']}
          view={view}
          date={date}
          onView={setView}
          onNavigate={(d) => setDate(d)}
          eventPropGetter={eventPropGetter}
          onSelectEvent={(e) => navigate(`/appointments?date=${dayjs(e.start).format('YYYY-MM-DD')}`)}
          onSelectSlot={(slot) => {
            const d = dayjs(slot.start).format('YYYY-MM-DD');
            navigate(`/appointments/new?date=${d}`);
          }}
          selectable
          popup
          tooltipAccessor={(e) => `${e.title} (${e.status})`}
          titleAccessor={(e) => e.title}
          startAccessor={(e) => e.start}
          endAccessor={(e) => e.end}
        />
      </Box>
    </Box>
  );
}
