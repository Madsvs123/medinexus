// Role-aware dashboard types (mirror /reports/dashboards/<role>/ + analytics endpoints)

export interface PatientLite {
  id: number;
  mrn: string;
  first_name: string;
  last_name: string;
  full_name?: string;
}

export type PatientRef = number | PatientLite;

export const patientLabel = (p?: PatientRef | null): string => {
  if (!p) return '—';
  if (typeof p === 'number') return `Patient #${p}`;
  return p.full_name ?? (`${p.first_name} ${p.last_name}`.trim() || p.mrn);
};

export interface DashboardAppointment {
  id: number;
  patient: PatientRef;
  doctor?: { id: number; first_name: string; last_name: string } | number | null;
  start: string;
  end: string;
  type: string;
  status: string;
  department?: { id: number; name: string } | null;
}

export interface DashboardEncounter {
  id: number;
  patient: PatientRef;
  type: string;
  status: string;
  started_at: string;
  chief_complaint: string;
  doctor?: { id: number; first_name: string; last_name: string } | number | null;
}

export interface DashboardResult {
  id: number;
  patient: PatientRef;
  test?: { id: number; name: string; code?: string } | null;
  value: string;
  unit: string;
  flag: string;
  status: string;
}

export interface DashboardFollowUp {
  id: number;
  patient: PatientRef;
  scheduled_date: string;
  instructions: string;
  status: string;
}

export interface AdminDashboard {
  revenue_today: number | string;
  appointments_today: number;
  active_admissions: number;
  pending_lab_results: number;
  occupancy: number;
  claims_pending: number;
}

export interface DoctorDashboard {
  today_appointments: DashboardAppointment[];
  open_encounters: DashboardEncounter[];
  critical_results: DashboardResult[];
  pending_follow_ups: DashboardFollowUp[];
}

export interface ReceptionistDashboard {
  appointments_by_status: Record<string, number>;
  waiting_queue_count: number;
  new_registrations: number;
}

export interface AppointmentsAnalytics {
  total: number;
  by_status: Record<string, number>;
  by_day: Array<{ date: string; count: number }>;
  avg_wait_minutes: number | null;
}

export interface RevenueAnalytics {
  total: number | string;
  by_day: Array<{ date: string; total: number | string }>;
  by_category: Record<string, number | string>;
  outstanding: number | string;
}

export interface AnalyticsParams {
  from?: string;
  to?: string;
}
