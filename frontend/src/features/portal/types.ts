// Patient portal types (mirror §4.20)

export interface DoctorRef {
  id: number;
  first_name: string;
  last_name: string;
}

export const doctorName = (d?: DoctorRef | number | null): string => {
  if (!d) return '—';
  if (typeof d === 'number') return `Doctor #${d}`;
  return `${d.first_name} ${d.last_name}`.trim() || `Doctor #${d.id}`;
};

export interface PortalAppointment {
  id: number;
  doctor: DoctorRef | number | null;
  department?: { id: number; name: string } | null;
  start: string;
  end: string;
  type: string;
  status: string;
  reason: string;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
}

export interface AvailabilityResponse {
  date: string;
  slots: AvailabilitySlot[];
}

export interface PortalPrescription {
  id: number;
  medication: { id: number; name: string; strength?: string } | number;
  dosage: string;
  frequency: string;
  route: string;
  duration_days: number | null;
  instructions: string;
  status: string;
  refills: number;
  created_at: string;
}

export const medicationName = (m?: PortalPrescription['medication'] | null): string => {
  if (!m) return '—';
  if (typeof m === 'number') return `Medication #${m}`;
  return m.name;
};

export interface PortalLabResult {
  id: number;
  test: { id: number; name: string; code?: string } | number | null;
  value: string;
  unit: string;
  flag: string;
  status: string;
  reported_at?: string | null;
}

export interface PortalRadiologyResult {
  id: number;
  modality: string;
  body_part: string;
  findings: string;
  impression: string;
  status: string;
  finalized_at?: string | null;
}

export interface PortalInvoice {
  id: number;
  invoice_number: string;
  status: string;
  total: number | string;
  paid_amount: number | string;
  due_date: string | null;
  issued_at: string | null;
}

export interface PortalDocument {
  id: number;
  title: string;
  category: string;
  file: string;
  notes: string;
  created_at: string;
}

export interface PortalNotification {
  id: number;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface PortalSummary {
  upcoming_appointments: PortalAppointment[];
  unread_notifications: number;
  recent_results: PortalResult[];
  outstanding_balance: number | string;
  next_appointment: PortalAppointment | null;
}

export type PortalResult = PortalLabResult | PortalRadiologyResult;

export function isLabResult(r: PortalResult): r is PortalLabResult {
  return (r as PortalLabResult).test !== undefined;
}
