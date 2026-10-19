// Radiology module types (mirror §4.7 serializers)

export type RadiologyModality = 'XRAY' | 'CT' | 'MRI' | 'ULTRASOUND' | 'ECG' | 'ECHO' | 'MAMMOGRAPHY' | 'OTHER';
export type RadiologyPriority = 'ROUTINE' | 'URGENT' | 'STAT';
export type RadiologyOrderStatus = 'ORDERED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type RadiologyReportStatus = 'DRAFT' | 'FINAL';

export interface UserRef {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  role?: string;
}

export const userName = (u?: UserRef | number | null): string => {
  if (!u) return '—';
  if (typeof u === 'number') return `User #${u}`;
  return `${u.first_name} ${u.last_name}`.trim() || u.email || `User #${u.id}`;
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

export interface RadiologyOrder {
  id: number;
  patient: PatientLite | number;
  encounter: number | null;
  modality: RadiologyModality;
  body_part: string;
  clinical_indication: string;
  priority: RadiologyPriority;
  status: RadiologyOrderStatus;
  ordered_by: UserRef | null;
  ordered_at: string;
  notes: string;
}

export interface RadiologyReport {
  id: number;
  order: RadiologyOrder | number;
  radiologist: UserRef | null;
  findings: string;
  impression: string;
  status: RadiologyReportStatus;
  finalized_at: string | null;
  attachment: string | null;
}

export interface RadiologyOrderListParams {
  page?: number;
  page_size?: number;
  patient?: number | string;
  status?: string;
  modality?: string;
}

export const RADIOLOGY_MODALITIES: RadiologyModality[] = ['XRAY', 'CT', 'MRI', 'ULTRASOUND', 'ECG', 'ECHO', 'MAMMOGRAPHY', 'OTHER'];
export const RADIOLOGY_ORDER_STATUSES: RadiologyOrderStatus[] = ['ORDERED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
