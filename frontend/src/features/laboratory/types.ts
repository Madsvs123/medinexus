// Laboratory module types (mirror §4.6 serializers)

export type LabTestCategory = 'HEMATOLOGY' | 'BIOCHEMISTRY' | 'MICROBIOLOGY' | 'IMMUNOLOGY' | 'URINALYSIS' | 'OTHER';
export type SampleType = 'BLOOD' | 'URINE' | 'STOOL' | 'SWAB' | 'CSF' | 'OTHER';
export type LabPriority = 'ROUTINE' | 'URGENT' | 'STAT';
export type LabOrderStatus = 'ORDERED' | 'SAMPLES_COLLECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type SampleStatus = 'COLLECTED' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED';
export type ResultFlag = 'NORMAL' | 'ABNORMAL' | 'CRITICAL';
export type ResultStatus = 'PENDING' | 'REVIEWED' | 'APPROVED' | 'REJECTED';

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

export interface LabTest {
  id: number;
  code: string;
  name: string;
  category: LabTestCategory;
  sample_type: SampleType;
  unit: string;
  ref_range_low: number | null;
  ref_range_high: number | null;
  price: number | string;
  active: boolean;
}

export interface LabOrder {
  id: number;
  patient: PatientLite | number;
  encounter: number | null;
  tests: Array<LabTest | number>;
  priority: LabPriority;
  status: LabOrderStatus;
  ordered_by: UserRef | null;
  ordered_at: string;
  notes: string;
  result_reported_at: string | null;
}

export const testName = (t: LabOrder['tests'][number]): string => {
  if (typeof t === 'number') return `Test #${t}`;
  return `${t.name} (${t.code})`;
};

export interface LabSample {
  id: number;
  order: LabOrder | number;
  test: LabTest | number;
  sample_id: string;
  collected_by: UserRef | null;
  collected_at: string | null;
  status: SampleStatus;
  rejection_reason: string;
}

export interface LabResult {
  id: number;
  order: LabOrder | number;
  test: LabTest | number;
  value: string;
  unit: string;
  flag: ResultFlag;
  status: ResultStatus;
  reviewed_by: UserRef | null;
  reviewed_at: string | null;
  notes: string;
  attachment: string | null;
  created_at?: string;
}

export interface LabReport {
  id: number;
  order: LabOrder | number;
  file: string;
  generated_by: UserRef | null;
  generated_at: string;
}

export interface WorkQueueEntry {
  sample_id: number;
  sample_code: string;
  order: number;
  patient: PatientLite;
  test: LabTest;
  priority: LabPriority;
  collected_at: string;
}

export interface LabOrderListParams {
  page?: number;
  page_size?: number;
  patient?: number | string;
  status?: string;
  date?: string;
  priority?: string;
}

export const LAB_TEST_CATEGORIES: LabTestCategory[] = ['HEMATOLOGY', 'BIOCHEMISTRY', 'MICROBIOLOGY', 'IMMUNOLOGY', 'URINALYSIS', 'OTHER'];
export const SAMPLE_TYPES: SampleType[] = ['BLOOD', 'URINE', 'STOOL', 'SWAB', 'CSF', 'OTHER'];
export const LAB_ORDER_STATUSES: LabOrderStatus[] = ['ORDERED', 'SAMPLES_COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
