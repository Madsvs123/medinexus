// Appointments module types (mirror §4.4 serializers)

export type AppointmentType = 'CONSULTATION' | 'FOLLOW_UP' | 'PROCEDURE' | 'EMERGENCY' | 'TELEHEALTH';
export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';
export type RoomType = 'CONSULTATION' | 'EXAM' | 'PROCEDURE' | 'EMERGENCY';
export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type QueueEntryStatus = 'WAITING' | 'IN_PROGRESS' | 'DONE' | 'SKIPPED';

export interface UserRef {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  role?: string;
}

export interface DoctorRef extends UserRef {}

export const userName = (u?: UserRef | number | null): string => {
  if (!u) return '—';
  if (typeof u === 'number') return `User #${u}`;
  return `${u.first_name} ${u.last_name}`.trim() || u.email || `User #${u.id}`;
};

export interface DepartmentRef {
  id: number;
  name: string;
  code?: string;
}

export const departmentName = (d?: DepartmentRef | number | null): string => {
  if (!d) return '—';
  if (typeof d === 'number') return `Dept #${d}`;
  return d.name;
};

export interface PatientLite {
  id: number;
  mrn: string;
  first_name: string;
  last_name: string;
  full_name?: string;
}

export const patientLabel = (p?: PatientLite | number | null): string => {
  if (!p) return '—';
  if (typeof p === 'number') return `Patient #${p}`;
  return (p.full_name ?? `${p.first_name} ${p.last_name}`.trim()) || p.mrn;
};

export interface Room {
  id: number;
  name: string;
  department: DepartmentRef | number;
  type: RoomType;
  status: RoomStatus;
}

export interface Availability {
  id: number;
  doctor: DoctorRef | number;
  department: DepartmentRef | number;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  buffer_minutes: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

export interface Slot {
  start: string;
  end: string;
}

export interface AvailabilitySlots {
  date: string;
  slots: Slot[];
}

export interface RecurringRule {
  id: number;
  patient: PatientLite | number;
  doctor: DoctorRef | number;
  department: DepartmentRef | number;
  start_date: string;
  time: string;
  duration_minutes: number;
  frequency: Frequency;
  interval: number;
  weekday: number | null;
  end_date: string | null;
  is_active: boolean;
}

export interface Appointment {
  id: number;
  patient: PatientLite | number;
  doctor: DoctorRef | number;
  department: DepartmentRef | number;
  room: Room | number | null;
  start: string;
  end: string;
  type: AppointmentType;
  status: AppointmentStatus;
  reason: string;
  notes: string;
  checked_in_at: string | null;
  cancelled_by: UserRef | null;
  cancelled_at: string | null;
  cancellation_reason: string;
  recurring_rule: number | null;
}

export interface AppointmentQueueEntry {
  id: number;
  appointment: Appointment | number;
  position: number;
  status: QueueEntryStatus;
  called_at: string | null;
}

export interface QueueEntry extends AppointmentQueueEntry {
  appointment: Appointment;
}

export interface AppointmentListParams {
  page?: number;
  page_size?: number;
  date?: string;
  doctor?: number | string;
  department?: number | string;
  status?: string;
  patient?: number | string;
}

export const APPOINTMENT_TYPES: AppointmentType[] = ['CONSULTATION', 'FOLLOW_UP', 'PROCEDURE', 'EMERGENCY', 'TELEHEALTH'];
export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'SCHEDULED',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
];
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
