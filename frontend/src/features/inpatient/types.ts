// Inpatient module types (mirror §4.9 serializers)

export type BedStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
export type RoomType = 'PRIVATE' | 'SEMI_PRIVATE' | 'GENERAL' | 'ICU';
export type AdmissionType = 'EMERGENCY' | 'ELECTIVE' | 'TRANSFER';
export type AdmissionStatus = 'ACTIVE' | 'DISCHARGED' | 'TRANSFERRED';
export type Consciousness = 'ALERT' | 'RESPONSIVE' | 'UNRESPONSIVE' | 'OTHER';
export type MedAdminStatus = 'SCHEDULED' | 'GIVEN' | 'SKIPPED' | 'HELD' | 'REFUSED';
export type CarePlanStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
export type DischargeType = 'HOME' | 'TRANSFER' | 'AMA' | 'DECEASED';
export type DischargeStatus = 'DRAFT' | 'FINAL';

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

export interface Ward {
  id: number;
  name: string;
  department: number | { id: number; name: string };
  location: string;
  is_active: boolean;
}

export const wardDeptName = (w?: Ward['department'] | null): string => {
  if (!w) return '—';
  if (typeof w === 'number') return `Dept #${w}`;
  return w.name;
};

export interface InpatientRoom {
  id: number;
  ward: Ward | number;
  room_number: string;
  room_type: RoomType;
  is_active: boolean;
  beds?: Bed[];
}

export const wardName = (w?: InpatientRoom['ward'] | number | null): string => {
  if (!w) return '—';
  if (typeof w === 'number') return `Ward #${w}`;
  return w.name;
};

export interface Bed {
  id: number;
  room: InpatientRoom | number;
  bed_number: string;
  status: BedStatus;
  notes: string;
}

export const bedLabel = (b?: Bed | number | null): string => {
  if (!b) return '—';
  if (typeof b === 'number') return `Bed #${b}`;
  return `${typeof b.room === 'object' && b.room ? `${b.room.room_number} / ` : ''}${b.bed_number}`;
};

export interface Admission {
  id: number;
  patient: PatientLite | number;
  bed: Bed | number | null;
  admitted_by: UserRef | null;
  admitted_at: string;
  expected_discharge_date: string | null;
  admission_type: AdmissionType;
  diagnosis_on_admission: string;
  status: AdmissionStatus;
  discharged_at: string | null;
  discharged_by: UserRef | null;
}

export interface PatientTransfer {
  id: number;
  admission: number;
  from_bed: Bed | number;
  to_bed: Bed | number;
  reason: string;
  transferred_at: string;
  transferred_by: UserRef | null;
}

export interface NursingObservation {
  id: number;
  admission: number;
  recorded_by: UserRef | null;
  recorded_at: string;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  temperature: number | null;
  spo2: number | null;
  consciousness: Consciousness;
  notes: string;
}

export interface MedicationAdministration {
  id: number;
  admission: number;
  prescription: number | null;
  medication: number | { id: number; name: string; strength: string };
  dose: string;
  route: string;
  scheduled_time: string;
  given_at: string | null;
  given_by: UserRef | null;
  status: MedAdminStatus;
  notes: string;
}

export const medName = (m?: MedicationAdministration['medication'] | null): string => {
  if (!m) return '—';
  if (typeof m === 'number') return `Med #${m}`;
  return `${m.name}${m.strength ? ` ${m.strength}` : ''}`;
};

export interface DoctorRound {
  id: number;
  admission: number;
  doctor: UserRef | null;
  round_time: string;
  findings: string;
  plan: string;
  orders: string;
}

export interface CarePlan {
  id: number;
  admission: number;
  title: string;
  goals: string;
  interventions: string;
  status: CarePlanStatus;
  created_by: UserRef | null;
}

export interface Discharge {
  id: number;
  admission: number;
  discharged_by: UserRef | null;
  discharged_at: string;
  discharge_type: DischargeType;
  summary: string;
  medications_at_discharge: string;
  follow_up_instructions: string;
  status: DischargeStatus;
}

export interface AdmissionDetail extends Admission {
  observations: NursingObservation[];
  medications: MedicationAdministration[];
  rounds: DoctorRound[];
  care_plans: CarePlan[];
}

export interface InpatientStats {
  total_beds: number;
  available_beds: number;
  occupied_beds: number;
  active_admissions: number;
  admissions_today: number;
  discharges_today: number;
}

export interface AdmissionListParams {
  page?: number;
  page_size?: number;
  patient?: number | string;
  status?: string;
  ward?: number | string;
}

export const ADMISSION_STATUSES: AdmissionStatus[] = ['ACTIVE', 'DISCHARGED', 'TRANSFERRED'];
export const BED_STATUSES: BedStatus[] = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'];
