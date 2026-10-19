// Billing module types (mirror §4.10 serializers)

export type ServiceCategory =
  | 'CONSULTATION'
  | 'PROCEDURE'
  | 'LABORATORY'
  | 'RADIOLOGY'
  | 'PHARMACY'
  | 'INPATIENT'
  | 'OTHER';

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIAL' | 'PAID' | 'VOID' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK' | 'INSURANCE' | 'ONLINE';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type RefundStatus = 'PENDING' | 'COMPLETED' | 'REJECTED';
export type DepositStatus = 'ACTIVE' | 'APPLIED' | 'REFUNDED';
export type ClaimStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED' | 'PAID';

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

export interface Service {
  id: number;
  code: string;
  name: string;
  category: ServiceCategory;
  price: number | string;
  tax_rate: number | string;
  active: boolean;
}

export interface InvoiceItem {
  id?: number;
  service: number | Service;
  quantity: number;
  unit_price: number | string;
  discount: number | string;
  tax: number | string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  patient: PatientRef;
  encounter: number | null;
  items: InvoiceItem[];
  subtotal: number | string;
  discount_total: number | string;
  tax_total: number | string;
  total: number | string;
  paid_amount: number | string;
  status: InvoiceStatus;
  issued_at: string | null;
  due_date: string | null;
  notes: string;
  created_at: string;
}

export interface Payment {
  id: number;
  invoice: number | null;
  patient: PatientRef;
  amount: number | string;
  method: PaymentMethod;
  reference: string;
  status: PaymentStatus;
  paid_at: string;
  received_by: UserRef | null;
}

export interface Refund {
  id: number;
  payment: number | { id: number; amount: number | string; method: PaymentMethod };
  amount: number | string;
  reason: string;
  status: RefundStatus;
  processed_by: UserRef | null;
  processed_at: string | null;
  created_at: string;
}

export interface Deposit {
  id: number;
  patient: PatientRef;
  amount: number | string;
  method: PaymentMethod;
  reference: string;
  balance: number | string;
  status: DepositStatus;
  created_at: string;
}

export interface InsurancePlan {
  id: number;
  name: string;
  carrier: string;
  coverage_percentage: number | string;
  notes: string;
  active: boolean;
}

export interface PatientInsurance {
  id: number;
  patient: PatientRef;
  plan: number | InsurancePlan;
  policy_number: string;
  coverage_percentage: number | string;
  valid_until: string | null;
  is_primary: boolean;
}

export const planName = (p?: PatientInsurance['plan'] | null): string => {
  if (!p) return '—';
  if (typeof p === 'number') return `Plan #${p}`;
  return p.name;
};

export interface InsuranceClaim {
  id: number;
  invoice: number | Invoice;
  patient_insurance: number | PatientInsurance;
  claim_number: string;
  submitted_amount: number | string;
  approved_amount: number | string | null;
  status: ClaimStatus;
  submitted_at: string | null;
  approved_at: string | null;
  rejection_reason: string;
  notes: string;
}

export interface BillingStats {
  revenue_today: number | string;
  revenue_month: number | string;
  outstanding: number | string;
  overdue: number | string;
  claims_pending: number;
  claims_approved: number;
}

export interface InvoiceListParams {
  page?: number;
  page_size?: number;
  patient?: number | string;
  status?: string;
  date?: string;
}

export interface PaymentListParams {
  page?: number;
  page_size?: number;
  patient?: number | string;
  invoice?: number | string;
}

export interface ClaimListParams {
  page?: number;
  page_size?: number;
  status?: string;
  patient?: number | string;
}

export const num = (v: number | string | null | undefined): number => Number(v ?? 0);
