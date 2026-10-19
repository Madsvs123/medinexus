// Patients module types (mirror §4.3 serializers)

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'UNKNOWN';
export type PatientStatus = 'ACTIVE' | 'INACTIVE' | 'DECEASED';
export type AllergySeverity = 'MILD' | 'MODERATE' | 'SEVERE';
export type ConditionStatus = 'ACTIVE' | 'RESOLVED';
export type DocumentCategory = 'LAB' | 'IMAGING' | 'PRESCRIPTION' | 'ID' | 'INSURANCE' | 'CONSENT' | 'OTHER';
export type ConsentType = 'TREATMENT' | 'SURGERY' | 'RESEARCH' | 'PRIVACY' | 'OTHER';
export type ConsentStatus = 'SIGNED' | 'PENDING' | 'REVOKED';

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

export interface Patient {
  id: number;
  user: number | null;
  mrn: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  date_of_birth: string | null;
  gender: Gender | null;
  blood_type: BloodType;
  phone: string;
  email: string;
  address: string;
  city: string;
  nationality: string;
  marital_status: string;
  occupation: string;
  photo: string | null;
  registration_date: string;
  status: PatientStatus;
  notes: string;
}

export const fullName = (p?: Pick<Patient, 'first_name' | 'last_name' | 'full_name' | 'mrn'> | null): string =>
  (p?.full_name ?? `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim()) || p?.mrn || '—';

export interface PatientAllergy {
  id: number;
  patient: number;
  allergen: string;
  severity: AllergySeverity;
  reaction: string;
  notes: string;
  created_at?: string;
}

export interface PatientCondition {
  id: number;
  patient: number;
  name: string;
  icd_code: string;
  diagnosed_date: string | null;
  status: ConditionStatus;
  notes: string;
}

export interface EmergencyContact {
  id: number;
  patient: number;
  name: string;
  relation: string;
  phone: string;
  notes: string;
}

export interface PatientDocument {
  id: number;
  patient: number;
  title: string;
  category: DocumentCategory;
  file: string;
  uploaded_by: UserRef | null;
  notes: string;
  created_at?: string;
}

export interface ConsentRecord {
  id: number;
  patient: number;
  type: ConsentType;
  description: string;
  document: string | null;
  signed_by: string;
  signed_at: string | null;
  status: ConsentStatus;
}

export interface InsurancePlanRef {
  id: number;
  name: string;
  carrier: string;
  coverage_percentage: number | string;
}

export interface PatientInsuranceRef {
  id: number;
  plan: number | InsurancePlanRef;
  policy_number: string;
  coverage_percentage: number | string;
  valid_until: string | null;
  is_primary: boolean;
}

export const planName = (p?: PatientInsuranceRef['plan'] | null): string => {
  if (!p) return '—';
  if (typeof p === 'number') return `Plan #${p}`;
  return p.name;
};

export interface PatientDetail extends Patient {
  allergies: PatientAllergy[];
  conditions: PatientCondition[];
  contacts: EmergencyContact[];
  documents: PatientDocument[];
  consents: ConsentRecord[];
  insurance: PatientInsuranceRef[];
}

export interface TimelineEvent {
  date: string;
  type: string;
  title: string;
  description: string;
  ref_id: number;
}

export interface PatientListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
}

export const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN'];
export const GENDERS: Gender[] = ['MALE', 'FEMALE', 'OTHER'];
export const PATIENT_STATUSES: PatientStatus[] = ['ACTIVE', 'INACTIVE', 'DECEASED'];
