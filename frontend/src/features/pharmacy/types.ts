// Pharmacy module types (mirror §4.8 serializers)

export type MedicationCategory = 'ANALGESIC' | 'ANTIBIOTIC' | 'CARDIOVASCULAR' | 'DIABETES' | 'RESPIRATORY' | 'GASTRO' | 'NEURO' | 'OTHER';
export type MedicationForm = 'TABLET' | 'CAPSULE' | 'SYRUP' | 'INJECTION' | 'CREAM' | 'INHALER' | 'DROPS';
export type InteractionSeverity = 'MILD' | 'MODERATE' | 'SEVERE';
export type DispensationStatus = 'COMPLETED' | 'PARTIAL' | 'RETURNED';
export type TransferStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

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

export interface BranchRef {
  id: number;
  name: string;
  code?: string;
}

export const branchName = (b?: BranchRef | number | null): string => {
  if (!b) return '—';
  if (typeof b === 'number') return `Branch #${b}`;
  return b.name;
};

export interface Medication {
  id: number;
  code: string;
  name: string;
  generic_name: string;
  category: MedicationCategory;
  form: MedicationForm;
  strength: string;
  unit: string;
  price: number | string;
  reorder_level: number;
  current_stock: number;
  is_controlled: boolean;
  active: boolean;
}

export interface MedicationRefLite {
  id: number;
  name: string;
  strength: string;
  code?: string;
}

export interface DrugInteraction {
  id: number;
  medication_a: MedicationRefLite | number;
  medication_b: MedicationRefLite | number;
  severity: InteractionSeverity;
  description: string;
}

export const interactionMeds = (m: DrugInteraction['medication_a']): string => {
  if (typeof m === 'number') return `Med #${m}`;
  return `${m.name}${m.strength ? ` ${m.strength}` : ''}`;
};

export interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  is_active: boolean;
}

export interface MedicationBatch {
  id: number;
  medication: MedicationRefLite | number;
  batch_no: string;
  supplier: Supplier | number | null;
  quantity: number;
  expiry_date: string;
  received_date: string;
  unit_cost: number | string;
}

export const batchMedName = (m?: MedicationBatch['medication'] | null): string => {
  if (!m) return '—';
  if (typeof m === 'number') return `Med #${m}`;
  return `${m.name}${m.strength ? ` ${m.strength}` : ''}`;
};

export const batchSupplierName = (s?: MedicationBatch['supplier'] | null): string => {
  if (!s) return '—';
  if (typeof s === 'number') return `Supplier #${s}`;
  return s.name;
};

export interface PrescriptionLite {
  id: number;
  patient: PatientLite | number;
  encounter: number | null;
  medication: MedicationRefLite | number;
  dosage: string;
  frequency: string;
  route: string;
  status: string;
  warnings?: Array<{ type: string; severity: string; message: string }>;
}

export const rxMedName = (m?: PrescriptionLite['medication'] | null): string => {
  if (!m) return '—';
  if (typeof m === 'number') return `Med #${m}`;
  return `${m.name}${m.strength ? ` ${m.strength}` : ''}`;
};

export interface DispensationItem {
  medication_id: number;
  batch_id: number;
  quantity: number;
  price: number | string;
}

export interface Dispensation {
  id: number;
  prescription: PrescriptionLite | number;
  dispensed_by: UserRef | null;
  dispensed_at: string;
  items: DispensationItem[];
  status: DispensationStatus;
  notes: string;
}

export interface StockTransfer {
  id: number;
  from_branch: BranchRef | number;
  to_branch: BranchRef | number;
  items: Array<{ medication_id: number; quantity: number }>;
  status: TransferStatus;
  requested_by: UserRef | null;
  completed_at: string | null;
  created_at?: string;
}

export interface StockReturn {
  id: number;
  batch: MedicationBatch | number;
  quantity: number;
  reason: string;
  returned_at: string;
  returned_by: UserRef | null;
}

export const returnBatchLabel = (b?: StockReturn['batch'] | null): string => {
  if (!b) return '—';
  if (typeof b === 'number') return `Batch #${b}`;
  return `${batchMedName(b.medication)} — ${b.batch_no}`;
};

export interface StockAlerts {
  low_stock: Medication[];
  expiring: MedicationBatch[];
  expired: MedicationBatch[];
}

export const MEDICATION_CATEGORIES: MedicationCategory[] = ['ANALGESIC', 'ANTIBIOTIC', 'CARDIOVASCULAR', 'DIABETES', 'RESPIRATORY', 'GASTRO', 'NEURO', 'OTHER'];
export const MEDICATION_FORMS: MedicationForm[] = ['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'INHALER', 'DROPS'];
