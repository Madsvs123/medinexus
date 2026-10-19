// Clinical module types (mirror §4.5 serializers)

export type EncounterType = 'OUTPATIENT' | 'INPATIENT' | 'EMERGENCY' | 'TELEHEALTH';
export type EncounterStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type DiagnosisType = 'PRIMARY' | 'SECONDARY' | 'DIFFERENTIAL';
export type DiagnosisStatus = 'ACTIVE' | 'RESOLVED';
export type NoteType = 'PROGRESS' | 'ADMISSION' | 'OPERATION' | 'DISCHARGE' | 'OTHER';
export type PlanStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
export type PrescriptionStatus = 'ACTIVE' | 'DISPENSED' | 'PARTIALLY_DISPENSED' | 'COMPLETED' | 'CANCELLED';
export type PrescriptionRoute = 'ORAL' | 'IV' | 'IM' | 'TOPICAL' | 'INHALATION' | 'SUBLINGUAL';
export type ReferralPriority = 'ROUTINE' | 'URGENT';
export type ReferralStatus = 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'DECLINED';
export type FollowUpStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type SummaryStatus = 'DRAFT' | 'FINAL';
export type RadiologyModality = 'XRAY' | 'CT' | 'MRI' | 'ULTRASOUND' | 'ECG' | 'ECHO' | 'MAMMOGRAPHY' | 'OTHER';

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

export interface MedicationRef {
  id: number;
  code: string;
  name: string;
  generic_name: string;
  strength: string;
  form?: string;
}

export const medicationName = (m?: MedicationRef | number | null): string => {
  if (!m) return '—';
  if (typeof m === 'number') return `Med #${m}`;
  return `${m.name}${m.strength ? ` ${m.strength}` : ''}`;
};

export interface SpecialtyRef {
  id: number;
  name: string;
  code?: string;
}

export interface Encounter {
  id: number;
  patient: PatientLite | number;
  doctor: UserRef | number;
  department: DepartmentRef | number;
  type: EncounterType;
  status: EncounterStatus;
  started_at: string;
  ended_at: string | null;
  chief_complaint: string;
  history_presenting_illness: string;
  assessment: string;
  plan: string;
}

export interface VitalSigns {
  id: number;
  encounter: number;
  recorded_at: string;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  temperature: number | null;
  spo2: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  notes: string;
}

export interface Diagnosis {
  id: number;
  encounter: number;
  name: string;
  icd_code: string;
  type: DiagnosisType;
  status: DiagnosisStatus;
  notes: string;
}

export interface ClinicalNote {
  id: number;
  encounter: number;
  author: UserRef | null;
  note_type: NoteType;
  content: string;
  is_signed: boolean;
  signed_at: string | null;
  created_at?: string;
}

export interface TreatmentPlan {
  id: number;
  encounter: number;
  title: string;
  instructions: string;
  goals: string;
  status: PlanStatus;
}

export interface PrescriptionWarning {
  type: 'ALLERGY' | 'INTERACTION';
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  message: string;
}

export interface Prescription {
  id: number;
  encounter: number;
  medication: MedicationRef | number;
  dosage: string;
  frequency: string;
  route: PrescriptionRoute;
  duration_days: number | null;
  instructions: string;
  status: PrescriptionStatus;
  refills: number;
  warnings: PrescriptionWarning[];
  created_at?: string;
}

export interface ProcedureRecord {
  id: number;
  encounter: number;
  name: string;
  code: string;
  performed_by: UserRef | null;
  performed_at: string;
  notes: string;
  outcome: string;
}

export interface LabOrderTestRef {
  id: number;
  code: string;
  name: string;
  category?: string;
}

export interface LabOrder {
  id: number;
  patient: PatientLite | number;
  encounter: number | null;
  tests: Array<LabOrderTestRef | number>;
  priority: 'ROUTINE' | 'URGENT' | 'STAT';
  status: string;
  ordered_by: UserRef | null;
  ordered_at: string;
  notes: string;
}

export interface ClinicalRadiologyOrder {
  id: number;
  patient: PatientLite | number;
  encounter: number | null;
  modality: RadiologyModality;
  body_part: string;
  clinical_indication: string;
  priority: 'ROUTINE' | 'URGENT' | 'STAT';
  status: string;
  ordered_by: UserRef | null;
  ordered_at: string;
  notes: string;
}

export interface Referral {
  id: number;
  encounter: number;
  referring_doctor: UserRef | null;
  to_specialty: SpecialtyRef | number;
  to_department: DepartmentRef | number | null;
  reason: string;
  priority: ReferralPriority;
  status: ReferralStatus;
  notes: string;
}

export interface FollowUp {
  id: number;
  encounter: number;
  scheduled_date: string;
  instructions: string;
  status: FollowUpStatus;
}

export interface DischargeSummary {
  id: number;
  encounter: number | null;
  admission: number | null;
  summary: string;
  diagnosis_at_discharge: string;
  medications_at_discharge: string;
  follow_up_instructions: string;
  status: SummaryStatus;
  signed_by: UserRef | null;
  signed_at: string | null;
}

export interface EncounterDetail extends Encounter {
  vitals: VitalSigns[];
  diagnoses: Diagnosis[];
  notes: ClinicalNote[];
  prescriptions: Prescription[];
  procedures: ProcedureRecord[];
  referrals: Referral[];
  follow_ups: FollowUp[];
}

export interface EncounterListParams {
  page?: number;
  page_size?: number;
  patient?: number | string;
  doctor?: number | string;
  status?: string;
  date?: string;
}

export const ENCOUNTER_TYPES: EncounterType[] = ['OUTPATIENT', 'INPATIENT', 'EMERGENCY', 'TELEHEALTH'];
export const ENCOUNTER_STATUSES: EncounterStatus[] = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
export const RADIOLOGY_MODALITIES: RadiologyModality[] = ['XRAY', 'CT', 'MRI', 'ULTRASOUND', 'ECG', 'ECHO', 'MAMMOGRAPHY', 'OTHER'];
