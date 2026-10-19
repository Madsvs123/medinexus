// Documents module types (mirror §4.15)

export type DocumentCategory = 'CLINICAL' | 'ADMIN' | 'FINANCIAL' | 'LEGAL' | 'OTHER';

export interface PatientRef {
  id: number;
  mrn: string;
  first_name: string;
  last_name: string;
  full_name?: string;
}

export const patientLabel = (p?: PatientRef | number | null): string => {
  if (!p) return '—';
  if (typeof p === 'number') return `Patient #${p}`;
  return p.full_name ?? (`${p.first_name} ${p.last_name}`.trim() || p.mrn);
};

export interface UserRef {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
}

export const userName = (u?: UserRef | number | null): string => {
  if (!u) return '—';
  if (typeof u === 'number') return `User #${u}`;
  return `${u.first_name} ${u.last_name}`.trim() || u.email || `User #${u.id}`;
};

export interface DocumentRecord {
  id: number;
  title: string;
  category: DocumentCategory;
  patient: PatientRef | number | null;
  file: string;
  tags: string[];
  uploaded_by: UserRef | number | null;
  notes: string;
  created_at: string;
}

export interface DocumentListParams {
  page?: number;
  page_size?: number;
  search?: string;
  category?: string;
  patient?: number | string;
}
